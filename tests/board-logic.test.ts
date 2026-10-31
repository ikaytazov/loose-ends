// Tests for the Overview and Workstream wording and filters (components/board/logic.ts), run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { activityHeadline, doers, filterTasks, quietTasks, reasonLine, sortTasks } from "@/components/board/logic";
import type { DecisionNeededRow, TaskBoardRow } from "@/lib/contracts/domain";

const NOW = Date.parse("2026-11-03T16:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function task(over: Partial<TaskBoardRow>): TaskBoardRow {
  return {
    id: over.title ?? "t",
    title: "Task",
    workstream_id: "ws",
    meeting_id: null,
    owner_id: "priya",
    due_date: "2026-11-05",
    priority: "high",
    status: "in_progress",
    blocker: null,
    source_sentence: null,
    flags: [],
    completed_at: null,
    created_at: hoursAgo(100),
    updated_at: hoursAgo(1),
    owner_name: "Priya Shah",
    owner_avatar_url: null,
    workstream_name: "Product launch",
    is_overdue: false,
    last_update_at: hoursAgo(1),
    last_update_source: "email",
    last_update_quote: null,
    pending_date_request_id: null,
    pending_requested_due_date: null,
    ...over,
  };
}

const deckRequest: DecisionNeededRow = {
  kind: "date_change",
  decision_id: "dr1",
  task_id: "deck",
  task_title: "Finish the partner deck",
  workstream_id: "ws",
  workstream_name: "Product launch",
  approver_id: "maya",
  requested_by: "priya",
  requested_by_name: "Priya Shah",
  current_due_date: "2026-11-05",
  requested_due_date: "2026-11-11",
  reason: "numbers from finance",
  created_at: hoursAgo(1),
};

test("blocked: names who is waiting and on what (the demo's partner deck)", () => {
  const tasks = [task({ title: "Launch the new pricing page", status: "done" }), task({ title: "Finish the partner deck", status: "blocked", blocker: "numbers from finance" })];
  assert.equal(reasonLine("blocked", tasks, [deckRequest], NOW), "Priya is waiting on numbers from finance.");
});

test("blocked with no owner or blocker text still says something true", () => {
  assert.equal(reasonLine("blocked", [task({ title: "X", status: "blocked", owner_name: null })], [], NOW), "“X” is blocked.");
});

test("decision needed: a date request comes before a missing owner", () => {
  const owner: DecisionNeededRow = { ...deckRequest, kind: "assign_owner", decision_id: null, task_title: "Own the launch checklist", requested_by_name: null };
  assert.equal(reasonLine("decision_needed", [], [owner, deckRequest], NOW), "Priya asked to move “Finish the partner deck” to Wed 11 Nov.");
  assert.match(reasonLine("decision_needed", [], [owner], NOW) ?? "", /“Own the launch checklist” has no owner/);
});

test("update needed: counts quiet open tasks and the longest silence, ignoring done ones", () => {
  const tasks = [
    task({ title: "Script the welcome call", status: "not_started", last_update_at: hoursAgo(4 * 24 + 2), last_update_source: null }),
    task({ title: "Old and done", status: "done", last_update_at: hoursAgo(10 * 24) }),
    task({ title: "Fresh", last_update_at: hoursAgo(2) }),
  ];
  assert.equal(quietTasks(tasks, NOW).length, 1);
  assert.equal(reasonLine("update_needed", tasks, [], NOW), "No update on 1 task for 4 days.");
  assert.equal(reasonLine("on_track", tasks, [], NOW), null);
});

test("doing the work: open tasks only, no repeats", () => {
  const tasks = [task({ owner_name: "Priya Shah" }), task({ owner_name: "Priya Shah" }), task({ owner_name: "Sam Okafor" }), task({ owner_name: "Jordan Lee", status: "done" })];
  assert.deepEqual(doers(tasks), ["Priya Shah", "Sam Okafor"]);
});

test("activity headlines read like the demo, and owner ids become names", () => {
  assert.equal(activityHeadline({ field: "status", new_value: "done" }), "Marked done");
  assert.equal(activityHeadline({ field: "blocker", new_value: "numbers from finance" }), "Reported a blocker");
  assert.equal(activityHeadline({ field: "date_request", new_value: "2026-11-11" }), "Asked to move the date to Wed 11 Nov");
  assert.equal(activityHeadline({ field: "due_date", new_value: "2026-11-11" }), "New date approved: Wed 11 Nov");
  assert.equal(activityHeadline({ field: "owner", new_value: "id-alex" }, { "id-alex": "Alex Romero" }), "Owner set: Alex Romero");
});

test("filters: status, owner (including no owner), search and quiet", () => {
  const tasks = [
    task({ title: "Pricing page", status: "done" }),
    task({ title: "Partner deck", status: "blocked" }),
    task({ title: "Launch checklist", status: "not_started", owner_id: null, owner_name: null }),
    task({ title: "Interviews", owner_id: "jordan", owner_name: "Jordan Lee", last_update_at: hoursAgo(80) }),
  ];
  const titles = (f: Parameters<typeof filterTasks>[1], owner = "", q = "") => filterTasks(tasks, f, owner, q, NOW).map((t) => t.title);
  assert.deepEqual(titles("blocked"), ["Partner deck"]);
  assert.deepEqual(titles("open"), ["Partner deck", "Launch checklist", "Interviews"]);
  assert.deepEqual(titles("done"), ["Pricing page"]);
  assert.deepEqual(titles("all", "none"), ["Launch checklist"]);
  assert.deepEqual(titles("all", "jordan"), ["Interviews"]);
  assert.deepEqual(titles("all", "", "jordan"), ["Interviews"]);
  assert.deepEqual(titles("quiet"), ["Interviews"]);
});

test("sort: overdue first, then blocked, in progress, not started, done; undated last", () => {
  const tasks = [
    task({ title: "done", status: "done" }),
    task({ title: "late", status: "in_progress", is_overdue: true }),
    task({ title: "undated", status: "not_started", due_date: null, is_overdue: null as unknown as boolean }),
    task({ title: "blocked", status: "blocked" }),
    task({ title: "soon", status: "not_started", due_date: "2026-11-04" }),
  ];
  assert.deepEqual(sortTasks(tasks).map((t) => t.title), ["late", "blocked", "soon", "undated", "done"]);
});

test("cards that need attention come first; one reply's quote shows once", async () => {
  const { sortStreams, rowsShowingQuote } = await import("@/components/board/logic");
  const s = (name: string, health: "on_track" | "blocked" | "decision_needed" | "update_needed") =>
    ({ id: name, name, health, goal: null, owner_id: null, owner_name: null, owner_avatar_url: null, target_date: null, total_tasks: 0, done_tasks: 0, in_progress_tasks: 0, not_started_tasks: 0, last_update_at: null });
  assert.deepEqual(sortStreams([s("A", "on_track"), s("B", "update_needed"), s("C", "blocked"), s("D", "decision_needed")]).map((x) => x.name), ["C", "D", "B", "A"]);
  const rows = [
    { id: "3", quote: "Pricing page is live.", email_id: "e1" },
    { id: "2", quote: "Pricing page is live.", email_id: "e1" },
    { id: "1", quote: "Pricing page is live.", email_id: "e1" },
    { id: "0", quote: null, email_id: null },
  ];
  assert.deepEqual([...rowsShowingQuote(rows)], ["1"]);
});
