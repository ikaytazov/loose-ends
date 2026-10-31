// Tests for the notes reader (issue #10), run with `npm test`. No API key needed: the AI is faked.
// The real AI is scored against David's answer keys with GET /api/dev/score-notes?n=01..05.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calendar } from "@/lib/ai/calendar";
import { NotesExtraction } from "@/lib/contracts/ai";
import { buildUserMessage, cleanUp, extractTasks, type NotesModel } from "@/lib/notes/extract";
import { readTranscriptHeader, scoreExtraction } from "@/lib/notes/score";

const team = JSON.parse(readFileSync("test-data/team.json", "utf8")) as { members: { name: string }[]; workstreams: { name: string }[] };
const teamNames = team.members.map((m) => m.name);
const workstreamNames = team.workstreams.map((w) => w.name);
const expected = (n: string) => NotesExtraction.parse(JSON.parse(readFileSync(`test-data/expected/${n}.json`, "utf8")));
const line = (cal: string, phrase: string) => cal.split("\n").find((l) => l.includes(phrase))?.slice(0, 10);

test("calendar for notes matches the dates in David's answer keys", () => {
  const mon = calendar("2026-11-02", { startLabel: "meeting date", nextWeekAsDate: false }); // transcript 01
  assert.equal(line(mon, '"Thursday"'), "2026-11-05");
  assert.equal(line(mon, '"end of week"'), "2026-11-06");
  assert.equal(line(mon, '"next Monday"'), "2026-11-09");
  assert.equal(line(mon, '"next week"'), undefined, "a vague 'next week' is no date in notes");
  const thu = calendar("2026-10-29", { startLabel: "meeting date", nextWeekAsDate: false }); // transcript 03
  assert.equal(line(thu, '"Friday"'), "2026-10-30");
  assert.equal(line(thu, '"end of month"'), "2026-10-31");
  const wed = calendar("2026-11-04", { startLabel: "meeting date", nextWeekAsDate: false }); // transcript 04
  assert.equal(line(wed, '"tomorrow"'), "2026-11-05");
  assert.equal(line(wed, '"next Tuesday"'), "2026-11-10");
  const mon2 = calendar("2026-11-09", { startLabel: "meeting date", nextWeekAsDate: false }); // transcript 05
  assert.equal(line(mon2, '"end of week"'), "2026-11-13");
  assert.equal(line(mon2, '"next Monday"'), "2026-11-16");
});

test("clean-up: names must be on the team list, flags follow the fields", () => {
  const out = cleanUp(
    {
      tasks: [
        { title: "A", owner_name: "priya", due_date: "2026-11-05", priority: "high", workstream_name: "product launch", source_sentence: "x", flags: [] },
        { title: "B", owner_name: "Bob Stranger", due_date: "Friday", priority: "low", workstream_name: "Marketing", source_sentence: "y", flags: ["unclear"] },
        { title: "B", owner_name: "Bob Stranger", due_date: "Friday", priority: "low", workstream_name: "Marketing", source_sentence: "y", flags: [] },
      ],
    },
    { teamNames, workstreamNames },
  );
  assert.equal(out.tasks.length, 2, "duplicates are dropped");
  assert.equal(out.tasks[0].owner_name, "Priya Shah");
  assert.equal(out.tasks[0].workstream_name, "Product launch");
  assert.deepEqual(out.tasks[0].flags, []);
  assert.equal(out.tasks[1].owner_name, null);
  assert.equal(out.tasks[1].due_date, null);
  assert.equal(out.tasks[1].workstream_name, null);
  assert.deepEqual(out.tasks[1].flags.sort(), ["no_date", "no_owner", "unclear"]);
});

test("extractTasks sends the notes, lists and calendar to the AI", async () => {
  let seen = "";
  const fake: NotesModel = async (_s, user) => { seen = user; return { tasks: [] }; };
  const { meetingDate, attendees, notes } = readTranscriptHeader(readFileSync("test-data/transcripts/01.md", "utf8"));
  await extractTasks({ notes, meetingDate, attendees, teamNames, workstreamNames }, fake);
  assert.ok(seen.includes("Meeting date: 2026-11-02"));
  assert.ok(seen.includes("Team list: Maya Chen; Priya Shah"));
  assert.ok(seen.includes("2026-11-09 Monday"));
  assert.ok(seen.includes("Priya will get the new pricing page live by Thursday."));
  assert.equal(buildUserMessage({ notes: "n", meetingDate: "2026-11-02", attendees: [], teamNames, workstreamNames }).includes("Attendees: not given"), true);
});

test("scorer: the answer key scores perfectly against itself", () => {
  for (const n of ["01", "02", "03", "04", "05"]) {
    const e = expected(n).tasks;
    const s = scoreExtraction(e, e);
    assert.equal(s.found, e.length, n);
    assert.equal(s.owner.right, e.length, n);
    assert.equal(s.due_date.right, e.length, n);
  }
});

test("scorer: notices a missed task, an extra task and a wrong field", () => {
  const e = expected("01").tasks;
  const predicted = e.slice(1).map((t) => ({ ...t }));
  predicted[0] = { ...predicted[0], due_date: "2026-12-01" };
  predicted.push({ title: "Fix the coffee machine", owner_name: null, due_date: null, priority: "low", workstream_name: null, source_sentence: "coffee machine is broken again", flags: [] });
  const s = scoreExtraction(predicted, e);
  assert.deepEqual(s.missed, [e[0].title]);
  assert.equal(s.extra.length, 1);
  assert.equal(s.due_date.right, s.found - 1);
});
