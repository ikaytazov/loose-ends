// Agreement B: what the two AI steps hand back. Both steps MUST return exactly these shapes.
// The code validates every AI answer against these schemas before using it.
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

// ---------------- AI step 1: reading meeting notes (owner: see docs/team-tasks.md) ----------------
export const ExtractedTask = z.object({
  title: z.string().describe("Short task title, starting with a verb"),
  owner_name: z.string().nullable().describe("Exactly as written in the team list, or null if nobody was named"),
  due_date: isoDate.nullable().describe("Calendar date worked out from the meeting date, or null"),
  priority: z.enum(["high", "medium", "low"]),
  workstream_name: z.string().nullable().describe("Exactly as written in the workstream list, or null"),
  source_sentence: z.string().describe("The sentence from the notes, word for word"),
  flags: z.array(z.enum(["no_owner", "no_date", "unclear"])),
});
export const NotesExtraction = z.object({ tasks: z.array(ExtractedTask) });
export type NotesExtraction = z.infer<typeof NotesExtraction>;

// ---------------- AI step 2: reading a reply ----------------
export const ReplyChange = z.object({
  task_number: z.number().int().describe("The number of the task in the email being answered"),
  new_status: z.enum(["not_started", "in_progress", "blocked", "done", "unchanged"]),
  blocker: z.string().nullable().describe("What is blocking the task, in a few words, or null"),
  requested_due_date: isoDate.nullable().describe("New date asked for, as a calendar date, or null"),
  reason: z.string().nullable().describe("Why, in a few words, or null"),
  quote: z.string().describe("The words from the reply this change is based on"),
  confidence: z.enum(["sure", "unsure"]),
});
export const ReplyParse = z.object({
  changes: z.array(ReplyChange),
  question: z.string().nullable().describe("If the reply is unclear, one short question to send back; otherwise null"),
});
export type ReplyChange = z.infer<typeof ReplyChange>;
export type ReplyParse = z.infer<typeof ReplyParse>;
