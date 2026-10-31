// AI step 1: read meeting notes or a transcript and propose tasks (agreement B in docs/agreements.md).
// app/api/notes/route.ts saves whatever this returns as "proposed" tasks for the lead to review.
//
// How it decides (the rules are in SYSTEM below, tuned against test-data/expected/*.json):
//   - a task is a commitment someone will do; discussion, ideas parked for later and things already done are left out
//   - owners must be people on the team list; "someone should…" or an undecided owner → no owner
//   - dates come from a calendar worked out in code ("next Monday", "end of week"); vague timing → no date
//   - the code below then checks the answer against the team and workstream lists and sets the flags
import { calendar } from "@/lib/ai/calendar";
import { askStructured } from "@/lib/ai/claude";
import { NotesExtraction } from "@/lib/contracts/ai";
import type { TaskFlag } from "@/lib/contracts/domain";

export interface ExtractInput {
  notes: string;
  meetingDate: string; // YYYY-MM-DD
  attendees: string[];
  teamNames: string[];
  workstreamNames: string[];
}

/** The AI call, swappable so the rules around it can be tested without an API key. */
export type NotesModel = (system: string, user: string) => Promise<NotesExtraction>;

export const SYSTEM = `You read the notes or transcript of a startup team meeting and list the tasks: commitments that a person will do after the meeting.

What counts as a task
- Include every commitment, including vague ones ("someone should…", "we should probably sort that out at some point", "maybe … if he has time").
- Leave out: anything the notes say is "not a task", "not now", "not this week", parked, for the roadmap, "not happening" or a later-quarter conversation; things already done or already sorted; decisions, opinions, debates and questions that were answered in the meeting; routine things with nothing to do; chit-chat; meeting logistics ("X will assign it after the meeting", "X will bring it up Monday", "next meeting same time").
- If the same commitment is mentioned twice, or two things are said to be one thing, list it once.

Owner
- Use the person's full name exactly as written in the team list (a first name in the notes means that team member).
- "I", "I'll", "my": in a transcript with speaker names, the speaker; in notes, the person who wrote them (often named at the top, e.g. "Alex notes", "Priya dumped these").
- No owner (null) when nobody is named ("someone should…", "need someone to…", "somebody should…"), or when it was not settled who does it ("Jordan? or Alex? TBD", "we both said we'd look at it but didn't agree who").

Due date
- Look up the exact words in the calendar provided; each date lists the phrases that mean it. Use that date; do not work dates out yourself.
- "today" and "tomorrow" are relative to the meeting date. A date with a day number ("Friday the 13th", "by nov 13") is that calendar date. "Same deadline" means the same date as the task it refers to.
- No date (null) when the timing is vague: "next week" without a day, "asap", "soon", "at some point", "once X is done" without a date, "if he has time".

Priority
- high: said to be high priority or urgent, blocks the launch or a deadline this week, fixes something hurting customers or revenue, investor or fundraising deadlines, "asap", things due today or tomorrow.
- low: nice to have, "at some point", "maybe", "if time", "no rush", small clean-ups, thank-you notes and follow-ups.
- medium: everything else.

Workstream
- Choose the best match from the workstream list by topic (section headings in the notes help). Null if none fits.

Other fields
- title: short, starts with a verb, no person's name (e.g. "Launch the new pricing page").
- source_sentence: copy the sentence or line from the notes that contains the commitment, word for word, without the leading "- ".
- flags: "unclear" when the owner was not settled, the commitment is conditional ("maybe", "if he has time"), or it is too vague to know what is meant ("the thing with the lawyer"). Also "no_owner" when owner is null and "no_date" when due date is null.`;

export function buildUserMessage(input: ExtractInput): string {
  return [
    `Meeting date: ${input.meetingDate}`,
    `Attendees: ${input.attendees.join(", ") || "not given"}`,
    `Team list: ${input.teamNames.join("; ")}`,
    `Workstream list: ${input.workstreamNames.join("; ")}`,
    "",
    "Calendar:",
    calendar(input.meetingDate, { startLabel: "meeting date", nextWeekAsDate: false }),
    "",
    "Notes:",
    '"""',
    input.notes,
    '"""',
  ].join("\n");
}

const claudeNotesModel: NotesModel = (system, user) =>
  askStructured({
    system,
    user,
    schema: NotesExtraction,
    toolName: "record_tasks",
    toolDescription: "Record the tasks found in the meeting notes",
    maxTokens: 8000,
  });

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Keep the AI honest: names and workstreams must be on our lists, and flags must match the fields. */
export function cleanUp(raw: NotesExtraction, input: Pick<ExtractInput, "teamNames" | "workstreamNames">): NotesExtraction {
  const byFull = new Map(input.teamNames.map((n) => [n.toLowerCase(), n]));
  const byFirst = new Map<string, string | null>();
  for (const n of input.teamNames) {
    const first = n.split(" ")[0].toLowerCase();
    byFirst.set(first, byFirst.has(first) ? null : n); // two people with the same first name: no guess
  }
  const streams = new Map(input.workstreamNames.map((n) => [n.toLowerCase(), n]));

  const seen = new Set<string>();
  const tasks = raw.tasks.flatMap((t) => {
    const key = t.source_sentence.trim().toLowerCase() + "|" + t.title.trim().toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);

    const ownerKey = t.owner_name?.trim().toLowerCase() ?? "";
    const owner = ownerKey ? byFull.get(ownerKey) ?? byFirst.get(ownerKey.split(" ")[0]) ?? null : null;
    const workstream = t.workstream_name ? streams.get(t.workstream_name.trim().toLowerCase()) ?? null : null;
    const due = t.due_date && isoDate.test(t.due_date) ? t.due_date : null;

    const flags = new Set<TaskFlag>(t.flags.filter((f) => f === "unclear"));
    if (!owner) flags.add("no_owner");
    if (!due) flags.add("no_date");
    return [{ ...t, title: t.title.trim(), owner_name: owner, workstream_name: workstream, due_date: due, flags: [...flags] }];
  });
  return { tasks };
}

export async function extractTasks(input: ExtractInput, model: NotesModel = claudeNotesModel): Promise<NotesExtraction> {
  if (!input.notes.trim()) return { tasks: [] };
  const raw = await model(SYSTEM, buildUserMessage(input));
  return cleanUp(raw, input);
}
