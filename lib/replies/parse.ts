// AI step 2: read a plain-language reply and turn it into task changes (agreement B).
import { calendar } from "@/lib/ai/calendar";
import { askStructured, readStructured } from "@/lib/ai/claude";
import { ReplyParse } from "@/lib/contracts/ai";

// Kept here so existing imports keep working.
export { calendar, readStructured };

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

export function buildUserMessage(input: ParseInput): string {
  const taskLines = input.tasks
    .map((t) => `${t.n}. ${t.title} | status: ${t.status} | priority: ${t.priority} | due: ${t.due_date ?? "no date"}`)
    .join("\n");
  return `Calendar:\n${calendar(input.receivedDate)}\n\nTasks in the email they are answering:\n${taskLines}\n\nTheir reply:\n"""\n${input.replyText}\n"""`;
}

export const claudeReplyParser: ReplyParser = (input) =>
  askStructured({
    system: SYSTEM,
    user: buildUserMessage(input),
    schema: ReplyParse,
    toolName: "record_updates",
    toolDescription: "Record the task updates found in the reply",
  });
