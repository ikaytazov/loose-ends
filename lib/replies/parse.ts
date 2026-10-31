// AI step 2: read a plain-language reply and turn it into task changes (agreement B).
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ReplyParse } from "@/lib/contracts/ai";
import { env } from "@/lib/server/env";

export interface NumberedTask {
  n: number;
  title: string;
  status: string;
  due_date: string | null;
  priority: string;
}

export interface ParseInput {
  replyText: string;
  receivedDate: string; // YYYY-MM-DD in the team's time zone
  tasks: NumberedTask[];
}

export type ReplyParser = (input: ParseInput) => Promise<ReplyParse>;

const SYSTEM = `You read short email replies from team members about their tasks and turn them into structured updates.

Rules:
- Only refer to tasks by their number in the list you are given. Match by number, or by the task's name if the reply names it ("pricing page is live" -> the pricing page task).
- One reply can update several tasks. Return one change per task mentioned. Ignore tasks that are not mentioned.
- new_status: "done" for done, finished, live, shipped, sent, submitted. "in_progress" for started, working on it, halfway. "blocked" when waiting on someone or something, or stuck. Otherwise "unchanged".
- blocker: what they are waiting on, in a few words ("numbers from finance"). Null if nothing blocks the task.
- requested_due_date: only when they ask for more time or name a new date. Convert it to a calendar date by looking up their exact words in the calendar provided: each date lists the phrases that mean it (for example "next Wednesday"). Use that date; do not work it out yourself. Null otherwise.
- quote: the exact words from the reply that support the change.
- confidence: "sure" when the meaning and the task are clear; "unsure" when you are guessing which task is meant or what they mean.
- question: if anything is unsure, one short, friendly question that would settle it. Otherwise null.
- Never invent tasks, dates or blockers that the reply does not state.`;

/**
 * A calendar from the reply date, with the meaning of day words worked out here (not by the AI):
 *   "Wednesday" / "this Wednesday" / "by Wednesday" = the first Wednesday after the reply date
 *   "next Wednesday" = the Wednesday of the following week (weeks run Monday–Sunday)
 * Example: reply on Fri 30 Oct → "next Wednesday" = 4 Nov. Reply on Tue 3 Nov → "next Wednesday" = 11 Nov.
 */
export function calendar(fromDate: string, days = 21): string {
  const DAY = 86400000;
  const start = new Date(fromDate + "T12:00:00Z");
  const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const mondayIndex = (d: Date) => (d.getUTCDay() + 6) % 7; // Monday = 0
  const nextWeekStart = new Date(start.getTime() + (7 - mondayIndex(start)) * DAY);
  const nextWeekEnd = new Date(nextWeekStart.getTime() + 6 * DAY);
  const seen = new Set<string>();
  const lines: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY);
    const wd = weekday(d);
    const labels: string[] = [];
    if (i === 0) labels.push("reply date, today");
    if (i === 1) labels.push("tomorrow");
    if (i > 0 && !seen.has(wd)) {
      seen.add(wd);
      labels.push(`"${wd}", "this ${wd}", "by ${wd}"`);
    }
    if (d >= nextWeekStart && d <= nextWeekEnd) labels.push(`"next ${wd}"`);
    if (d.getTime() === nextWeekStart.getTime()) labels.push(`"next week"`);
    lines.push(`${d.toISOString().slice(0, 10)} ${wd}${labels.length ? "  = " + labels.join(", ") : ""}`);
  }
  return lines.join("\n");
}

export function buildUserMessage(input: ParseInput): string {
  const taskLines = input.tasks
    .map((t) => `${t.n}. ${t.title} | status: ${t.status} | priority: ${t.priority} | due: ${t.due_date ?? "no date"}`)
    .join("\n");
  return `Calendar:\n${calendar(input.receivedDate)}\n\nTasks in the email they are answering:\n${taskLines}\n\nTheir reply:\n"""\n${input.replyText}\n"""`;
}

/** Take the answer from a tool call if there is one, otherwise from JSON in the text. */
export function readStructured<T>(content: Anthropic.ContentBlock[], schema: z.ZodType<T>): T {
  const tool = content.find((b) => b.type === "tool_use");
  if (tool && tool.type === "tool_use") return schema.parse(tool.input);
  const text = content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI did not return updates");
  return schema.parse(JSON.parse(text.slice(start, end + 1)));
}

export const claudeReplyParser: ReplyParser = async (input) => {
  const client = new Anthropic({ apiKey: env.anthropicKey() });
  const schema = z.toJSONSchema(ReplyParse) as Anthropic.Tool.InputSchema;
  // Not every model accepts a *forced* tool call, so we ask for it and also accept plain JSON.
  const res = await client.messages.create({
    model: env.anthropicModel(),
    max_tokens: 4000,
    system: SYSTEM + "\n\nAlways answer by calling the record_updates tool exactly once. If you cannot call it, reply with only the same JSON object.",
    tools: [{ name: "record_updates", description: "Record the task updates found in the reply", input_schema: schema }],
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });
  return readStructured(res.content, ReplyParse);
};
