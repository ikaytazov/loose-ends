// Pure helpers for the Overview and Workstream screens (tested in tests/board-logic.test.ts).
// Health itself is worked out by the database (view workstream_overview); these only explain it in words.
import type { ActivityLogEntry, DecisionNeededRow, Health, TaskBoardRow, TaskStatus, WorkstreamOverviewRow } from "@/lib/contracts/domain";

const DAY = 86_400_000;

const first = (name: string | null | undefined) => (name ? name.split(/\s+/)[0] : "");

/** "2026-11-11" → "Wed 11 Nov" (plain dates never shift by time zone). */
export function dayText(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Open = on the board and not finished. Proposed tasks are not on the board until approved. */
export function isOpen(status: TaskStatus): boolean {
  return status !== "done" && status !== "proposed";
}

/** Whole days since a timestamp, never negative. */
export function daysSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY));
}

/** Open tasks with no update for `quietDays` or more (the database's "update needed" rule). */
export function quietTasks(tasks: TaskBoardRow[], now: number, quietDays = 3): TaskBoardRow[] {
  return tasks.filter((t) => isOpen(t.status) && daysSince(t.last_update_at, now) >= quietDays);
}

/**
 * One line explaining a workstream's health, or null when it is on track.
 *   blocked          → "Priya is waiting on numbers from finance."
 *   decision_needed  → "Priya asked to move "Finish the partner deck" to Wed 11 Nov." / ""Own the launch checklist" has no owner."
 *   update_needed    → "No update on 1 task for 4 days."
 */
export function reasonLine(health: Health, tasks: TaskBoardRow[], decisions: DecisionNeededRow[], now: number): string | null {
  if (health === "blocked") {
    const b = tasks.find((t) => t.status === "blocked");
    if (!b) return null;
    const who = first(b.owner_name);
    if (b.blocker) return who ? `${who} is waiting on ${b.blocker}.` : `“${b.title}” is waiting on ${b.blocker}.`;
    return `“${b.title}” is blocked.`;
  }
  if (health === "decision_needed") {
    const date = decisions.find((d) => d.kind === "date_change");
    if (date && date.requested_due_date) {
      const who = first(date.requested_by_name) || "Someone";
      return `${who} asked to move “${date.task_title}” to ${dayText(date.requested_due_date)}.`;
    }
    const owner = decisions.find((d) => d.kind === "assign_owner");
    if (owner) return `“${owner.task_title}” has no owner, so nobody is emailed about it.`;
    return null;
  }
  if (health === "update_needed") {
    const quiet = quietTasks(tasks, now);
    if (!quiet.length) return null;
    const days = Math.max(...quiet.map((t) => daysSince(t.last_update_at, now)));
    return `No update on ${quiet.length} ${quiet.length === 1 ? "task" : "tasks"} for ${days} days.`;
  }
  return null;
}

/** People doing the open work in a workstream, by name, without repeats. */
export function doers(tasks: TaskBoardRow[]): string[] {
  return [...new Set(tasks.filter((t) => isOpen(t.status) && t.owner_name).map((t) => t.owner_name as string))];
}

const STATUS_WORD: Record<string, string> = {
  not_started: "not started",
  in_progress: "in progress",
  blocked: "blocked",
  done: "done",
  proposed: "proposed",
};

/**
 * A short headline for one activity_log row, e.g. "Marked done", "Reported a blocker".
 * `names` maps team member ids to names: the assign route logs the new owner's id.
 */
export function activityHeadline(entry: Pick<ActivityLogEntry, "field" | "new_value">, names: Record<string, string> = {}): string {
  switch (entry.field) {
    case "status":
      return entry.new_value === "done" ? "Marked done" : entry.new_value === "blocked" ? "Marked blocked" : `Now ${STATUS_WORD[entry.new_value ?? ""] ?? entry.new_value}`;
    case "blocker":
      return entry.new_value ? "Reported a blocker" : "Cleared a blocker";
    case "date_request":
      return entry.new_value ? `Asked to move the date to ${dayText(entry.new_value)}` : "Asked for a new date";
    case "due_date":
      return entry.new_value ? `New date approved: ${dayText(entry.new_value)}` : "Due date changed";
    case "date_request_declined":
      return "Date request declined";
    case "owner":
      return entry.new_value ? `Owner set: ${names[entry.new_value] ?? "a teammate"}` : "Owner removed";
    case "created":
      return "Task added";
    case "unclear":
      return "Reply needs a clarifying question";
    default:
      return `${entry.field.replace(/_/g, " ")} changed`;
  }
}

/** Filters on the task table. "No reply yet" = open and no update for the quiet period. */
export type TaskFilter = "all" | "open" | "blocked" | "quiet" | "done";

export function filterTasks(tasks: TaskBoardRow[], filter: TaskFilter, ownerId: string, search: string, now: number): TaskBoardRow[] {
  const q = search.trim().toLowerCase();
  const quiet = new Set(quietTasks(tasks, now).map((t) => t.id));
  return tasks.filter((t) => {
    if (filter === "open" && !isOpen(t.status)) return false;
    if (filter === "blocked" && t.status !== "blocked") return false;
    if (filter === "done" && t.status !== "done") return false;
    if (filter === "quiet" && !quiet.has(t.id)) return false;
    if (ownerId === "none" && t.owner_id) return false;
    if (ownerId && ownerId !== "none" && t.owner_id !== ownerId) return false;
    if (q && !t.title.toLowerCase().includes(q) && !(t.owner_name ?? "").toLowerCase().includes(q)) return false;
    return true;
  });
}

const STATUS_ORDER: Record<TaskStatus, number> = { blocked: 0, in_progress: 1, not_started: 2, proposed: 3, done: 4 };

/** Table order: overdue first, then blocked, in progress, not started, done; then by due date (no date last). */
export function sortTasks(tasks: TaskBoardRow[]): TaskBoardRow[] {
  return [...tasks].sort((a, b) => {
    if (!!a.is_overdue !== !!b.is_overdue) return a.is_overdue ? -1 : 1;
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
  });
}

const HEALTH_ORDER: Record<Health, number> = { blocked: 0, decision_needed: 1, update_needed: 2, on_track: 3 };

/** Workstreams that need attention first, then by name. */
export function sortStreams(streams: WorkstreamOverviewRow[]): WorkstreamOverviewRow[] {
  return [...streams].sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || a.name.localeCompare(b.name));
}

/**
 * One email reply logs several changes with the same quote. In a list (newest first), show each quote once: on the
 * oldest row of the run, which is where the reply's first change sits. Returns the ids of rows that show their quote.
 */
export function rowsShowingQuote(entries: Pick<ActivityLogEntry, "id" | "quote" | "email_id">[]): Set<string> {
  const show = new Set<string>();
  const seen = new Set<string>();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (!e.quote) continue;
    const key = `${e.email_id ?? ""}|${e.quote}`;
    if (!seen.has(key)) {
      seen.add(key);
      show.add(e.id);
    }
  }
  return show;
}
