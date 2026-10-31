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
- requested_due_date: only when they ask for more time or name a new date. Convert it to a calendar date using the calendar provided. "next <weekday>" means that weekday in the following week. "by <weekday>" or a bare weekday means the next such day after the reply date. Null otherwise.
- quote: the exact words from the reply that support the change.
- confidence: "sure" when the meaning and the task are clear; "unsure" when you are guessing which task is meant or what they mean.
- question: if anything is unsure, one short, friendly question that would settle it. Otherwise null.
- Never invent tasks, dates or blockers that the reply does not state.`;

function calendar(fromDate: string, days = 21): string {
  const start = new Date(fromDate + "T12:00:00Z");
  const lines: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const wd = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    lines.push(`${iso} ${wd}${i === 0 ? " (reply date)" : ""}`);
  }
  return lines.join("\n");
}

export function buildUserMessage(input: ParseInput): string {
  const taskLines = input.tasks
    .map((t) => `${t.n}. ${t.title} | status: ${t.status} | priority: ${t.priority} | due: ${t.due_date ?? "no date"}`)
    .join("\n");
  return `Calendar:\n${calendar(input.receivedDate)}\n\nTasks in the email they are answering:\n${taskLines}\n\nTheir reply:\n"""\n${input.replyText}\n"""`;
}

export const claudeReplyParser: ReplyParser = async (input) => {
  const client = new Anthropic({ apiKey: env.anthropicKey() });
  const schema = z.toJSONSchema(ReplyParse) as Anthropic.Tool.InputSchema;
  const res = await client.messages.create({
    model: env.anthropicModel(),
    max_tokens: 1500,
    system: SYSTEM,
    tools: [{ name: "record_updates", description: "Record the task updates found in the reply", input_schema: schema }],
    tool_choice: { type: "tool", name: "record_updates" },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("AI did not return updates");
  return ReplyParse.parse(block.input);
};
