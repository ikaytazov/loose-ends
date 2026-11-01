// Tests for the Activity page grouping (components/activity/logic.ts), run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabel, eventActor, groupByDay, matchesFilter, pacificDay, toEvents } from "@/components/activity/logic";
import type { ActivityLogEntry } from "@/lib/contracts/domain";

let n = 0;
function row(over: Partial<ActivityLogEntry>): ActivityLogEntry {
  n += 1;
  return { id: `a${n}`, task_id: "t", actor_id: "priya", source: "app", field: "status", old_value: null, new_value: null, quote: null, email_id: null, created_at: "2026-11-03T16:15:00Z", ...over };
}

const REPLY = "Pricing page is live. The partner deck needs until Wednesday the 11th, I'm waiting on numbers from finance.";

test("one email reply becomes one event with the fullest quote and every change", () => {
  const rows = [
    row({ email_id: "e1", source: "email", field: "date_request", task_id: "deck", new_value: "2026-11-11", quote: "The partner deck needs until Wednesday the 11th" }),
    row({ email_id: "e1", source: "email", field: "blocker", task_id: "deck", new_value: "numbers from finance", quote: REPLY }),
    row({ email_id: "e1", source: "email", field: "status", task_id: "deck", new_value: "blocked", quote: REPLY }),
    row({ email_id: "e1", source: "email", field: "status", task_id: "pricing", new_value: "done", quote: REPLY }),
  ];
  const events = toEvents(rows);
  assert.equal(events.length, 1);
  const ev = events[0];
  assert.equal(ev.kind, "reply");
  if (ev.kind !== "reply") return;
  assert.equal(ev.quote, REPLY);
  assert.equal(ev.changes.length, 4);
  assert.equal(ev.unclear, false);
});

test("an unclear reply is marked unclear and changes nothing", () => {
  const [ev] = toEvents([row({ email_id: "e2", source: "email", field: "unclear", quote: "it's done" })]);
  assert.ok(ev.kind === "reply" && ev.unclear && ev.changes.length === 0);
});

test("decisions become receipts; one Approve's tasks become one event; other app changes stay single", () => {
  const events = toEvents([
    row({ field: "due_date", actor_id: "maya", new_value: "2026-11-11", old_value: "2026-11-05", created_at: "2026-11-03T17:00:00Z" }),
    row({ field: "owner", actor_id: "maya", new_value: "alex", created_at: "2026-11-02T18:05:00Z" }),
    row({ field: "created", actor_id: null, task_id: "t1", created_at: "2026-11-02T18:00:20Z" }),
    row({ field: "created", actor_id: null, task_id: "t2", created_at: "2026-11-02T18:00:10Z" }),
    row({ field: "created", actor_id: null, task_id: "t3", created_at: "2026-11-02T18:00:00Z" }),
    row({ field: "date_request_declined", actor_id: "maya", created_at: "2026-11-01T10:00:00Z" }),
  ]);
  assert.deepEqual(events.map((e) => e.kind), ["decision", "task", "approval", "decision"]);
  assert.equal(events[2].kind === "approval" && events[2].entries.length, 3);
  assert.ok(events[0].kind === "decision" && events[0].approved);
  assert.ok(events[3].kind === "decision" && !events[3].approved);
});

test("filters and the person behind each event", () => {
  const events = toEvents([
    row({ email_id: "e3", source: "email", actor_id: "priya" }),
    row({ field: "due_date", actor_id: "maya", created_at: "2026-11-03T15:00:00Z" }),
    row({ field: "owner", actor_id: "maya", created_at: "2026-11-03T14:00:00Z" }),
  ]);
  assert.deepEqual(events.filter((e) => matchesFilter(e, "replies")).map((e) => e.kind), ["reply"]);
  assert.deepEqual(events.filter((e) => matchesFilter(e, "decisions")).map((e) => e.kind), ["decision"]);
  assert.deepEqual(events.filter((e) => matchesFilter(e, "tasks")).map((e) => e.kind), ["task"]);
  assert.deepEqual(events.map(eventActor), ["priya", "maya", "maya"]);
});

test("days are Pacific calendar days, labelled Today / Yesterday / date", () => {
  // 03:30 UTC on 4 Nov is still 3 Nov in California.
  assert.equal(pacificDay("2026-11-04T03:30:00Z"), "2026-11-03");
  const now = Date.parse("2026-11-03T20:00:00Z");
  assert.equal(dayLabel("2026-11-03", now), "Today");
  assert.equal(dayLabel("2026-11-02", now), "Yesterday");
  assert.equal(dayLabel("2026-10-30", now), "Fri 30 Oct");
  const groups = groupByDay(
    toEvents([row({ created_at: "2026-11-03T18:00:00Z" }), row({ created_at: "2026-11-03T17:00:00Z" }), row({ created_at: "2026-11-02T17:00:00Z" })]),
  );
  assert.deepEqual(groups.map((g) => [g.day, g.events.length]), [["2026-11-03", 2], ["2026-11-02", 1]]);
});

test("email rows without an email record still group by sender and moment; changes merge per task", async () => {
  const { changesByTask } = await import("@/components/activity/logic");
  const at = "2026-11-02T06:12:00.123Z";
  const events = toEvents([
    row({ source: "email", actor_id: "maya", field: "blocker", task_id: "laptops", quote: "Out of stock", created_at: at }),
    row({ source: "email", actor_id: "maya", field: "status", task_id: "laptops", quote: "Out of stock", created_at: at }),
    row({ source: "email", actor_id: "alex", field: "status", task_id: "cap", quote: "Started", created_at: at }),
  ]);
  assert.deepEqual(events.map((e) => (e.kind === "reply" ? [e.actor_id, e.changes.length] : e.kind)), [["maya", 2], ["alex", 1]]);

  const ev = toEvents([
    row({ email_id: "e9", source: "email", field: "date_request", task_id: "deck" }),
    row({ email_id: "e9", source: "email", field: "blocker", task_id: "deck" }),
    row({ email_id: "e9", source: "email", field: "status", task_id: "deck" }),
    row({ email_id: "e9", source: "email", field: "status", task_id: "pricing" }),
  ])[0];
  assert.ok(ev.kind === "reply");
  if (ev.kind !== "reply") return;
  assert.deepEqual(changesByTask(ev.changes).map((g) => [g.task_id, g.changes.map((c) => c.field)]), [["pricing", ["status"]], ["deck", ["status", "blocker", "date_request"]]]);
});
