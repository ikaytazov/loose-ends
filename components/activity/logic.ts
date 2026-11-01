// Pure helpers for the Activity page (tested in tests/activity-logic.test.ts): turn activity_log rows into events
// people understand, and group them by day.
//   - reply:    every row from one email reply (same email_id) → one card: their words, then what changed
//   - decision: a date approved or declined on the Decisions screen → a change receipt
//   - approval: tasks added by one "Approve" on Review (same moment) → one card
//   - task:     anything else done in the app (an owner set, a status changed by hand…)
import type { ActivityLogEntry } from "@/lib/contracts/domain";

export type ActivityEvent =
  | { kind: "reply"; id: string; at: string; actor_id: string | null; quote: string | null; changes: ActivityLogEntry[]; unclear: boolean }
  | { kind: "decision"; id: string; at: string; entry: ActivityLogEntry; approved: boolean }
  | { kind: "approval"; id: string; at: string; entries: ActivityLogEntry[] }
  | { kind: "task"; id: string; at: string; entry: ActivityLogEntry };

export type ActivityFilter = "all" | "replies" | "decisions" | "tasks";

const APPROVAL_WINDOW_MS = 60_000;

/** Rows newest first in, events newest first out. */
export function toEvents(rows: ActivityLogEntry[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const replies = new Map<string, Extract<ActivityEvent, { kind: "reply" }>>();

  for (const row of rows) {
    // Rows from one reply share an email_id. Rows logged from an email without one (older data) are grouped by
    // who sent it and the second it was logged.
    const replyKey = row.email_id ?? (row.source === "email" ? `${row.actor_id ?? "?"}@${row.created_at.slice(0, 19)}` : null);
    if (replyKey) {
      let ev = replies.get(replyKey);
      if (!ev) {
        ev = { kind: "reply", id: `reply-${replyKey}`, at: row.created_at, actor_id: row.actor_id, quote: null, changes: [], unclear: false };
        replies.set(replyKey, ev);
        events.push(ev);
      }
      // The reply's words: the fullest quote among its rows (each change may quote only a fragment).
      if (row.quote && row.quote.length > (ev.quote?.length ?? 0)) ev.quote = row.quote;
      if (row.field === "unclear") ev.unclear = true;
      else ev.changes.push(row);
      if (row.created_at < ev.at) ev.at = row.created_at;
      continue;
    }
    if (row.field === "due_date" || row.field === "date_request_declined") {
      events.push({ kind: "decision", id: row.id, at: row.created_at, entry: row, approved: row.field === "due_date" });
      continue;
    }
    if (row.field === "created") {
      const prev = events.at(-1);
      if (prev?.kind === "approval" && Math.abs(Date.parse(prev.at) - Date.parse(row.created_at)) <= APPROVAL_WINDOW_MS) {
        prev.entries.push(row);
        continue;
      }
      events.push({ kind: "approval", id: `approval-${row.id}`, at: row.created_at, entries: [row] });
      continue;
    }
    events.push({ kind: "task", id: row.id, at: row.created_at, entry: row });
  }
  // A reply's oldest row can be older than an event listed after it; keep the list newest first.
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export function matchesFilter(ev: ActivityEvent, filter: ActivityFilter): boolean {
  if (filter === "all") return true;
  if (filter === "replies") return ev.kind === "reply";
  if (filter === "decisions") return ev.kind === "decision";
  return ev.kind === "task" || ev.kind === "approval";
}

/** Who an event is about, for the person filter: the replier, or whoever acted in the app. */
export function eventActor(ev: ActivityEvent): string | null {
  if (ev.kind === "reply") return ev.actor_id;
  if (ev.kind === "approval") return ev.entries[0]?.actor_id ?? null;
  return ev.entry.actor_id;
}

const PACIFIC = "America/Los_Angeles";

/** Calendar day in Pacific time ("2026-11-03"), the team's time zone (TEAM_TIMEZONE). */
export function pacificDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: PACIFIC });
}

/** "Today", "Yesterday" or "Mon 2 Nov" for a Pacific calendar day. */
export function dayLabel(day: string, now: number): string {
  const today = pacificDay(new Date(now).toISOString());
  const yesterday = pacificDay(new Date(now - 86_400_000).toISOString());
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Events (newest first) grouped by Pacific day, days newest first. */
export function groupByDay(events: ActivityEvent[]): { day: string; events: ActivityEvent[] }[] {
  const groups: { day: string; events: ActivityEvent[] }[] = [];
  for (const ev of events) {
    const day = pacificDay(ev.at);
    const last = groups.at(-1);
    if (last && last.day === day) last.events.push(ev);
    else groups.push({ day, events: [ev] });
  }
  return groups;
}

/** "08:15 PT" */
export function timeOfDay(iso: string): string {
  return `${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: PACIFIC })} PT`;
}

const FIELD_ORDER: Record<string, number> = { status: 0, blocker: 1, date_request: 2 };

/** A reply's changes, one entry per task (in the order the tasks first appear), each task's changes in a fixed order. */
export function changesByTask(changes: ActivityLogEntry[]): { task_id: string | null; changes: ActivityLogEntry[] }[] {
  const groups: { task_id: string | null; changes: ActivityLogEntry[] }[] = [];
  for (const c of [...changes].reverse()) {
    const g = groups.find((x) => x.task_id === c.task_id);
    if (g) g.changes.push(c);
    else groups.push({ task_id: c.task_id, changes: [c] });
  }
  for (const g of groups) g.changes.sort((a, b) => (FIELD_ORDER[a.field] ?? 9) - (FIELD_ORDER[b.field] ?? 9));
  return groups;
}
