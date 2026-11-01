// Resets the database to the demo's starting point: the same result as running supabase/seed.sql in the SQL editor,
// but from the app, so anyone with the password can do it before each take (POST /api/demo/reset).
// Uses the server's service-role client; nothing here runs in the browser.
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY, MEETINGS, MEMBERS, TASKS, WORKSTREAMS } from "./seed-data";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** "2026-11-01" + n days, on the calendar (UTC, like the database's current_date). */
export function addDays(today: string, n: number): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

// Children first, so no foreign key blocks a delete. Every table has an id column.
const TABLES = ["activity_log", "date_requests", "emails", "tasks", "meetings", "workstreams", "team_members"] as const;

function fail(step: string, error: { message: string } | null) {
  if (error) throw new Error(`Reset failed while ${step}: ${error.message}`);
}

export async function resetDemo(sb: SupabaseClient, now = new Date()): Promise<{ members: number; workstreams: number; meetings: number; tasks: number; activity: number }> {
  const today = now.toISOString().slice(0, 10);
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  for (const table of TABLES) {
    const { error } = await sb.from(table).delete().not("id", "is", null);
    fail(`clearing ${table}`, error);
  }

  const { data: members, error: e1 } = await sb.from("team_members").insert(MEMBERS).select("id, name");
  fail("adding the team", e1);
  const memberId = new Map((members ?? []).map((m) => [m.name as string, m.id as string]));
  const idOf = (name: string | null) => (name ? memberId.get(name) ?? null : null);

  const { data: streams, error: e2 } = await sb
    .from("workstreams")
    .insert(WORKSTREAMS.map((w) => ({ name: w.name, goal: w.goal, owner_id: idOf(w.owner), target_date: addDays(today, w.days) })))
    .select("id, name");
  fail("adding the workstreams", e2);
  const streamId = new Map((streams ?? []).map((w) => [w.name as string, w.id as string]));

  const { data: meetings, error: e3 } = await sb
    .from("meetings")
    .insert(
      MEETINGS.map((m) => ({
        title: m.title,
        meeting_date: addDays(today, -m.daysAgo),
        attendees: m.attendees,
        raw_notes: m.notes,
        source: "paste",
        status: "approved",
        created_at: ago(m.daysAgo * DAY),
      })),
    )
    .select("id, title, created_at");
  fail("adding the meetings", e3);
  const meeting = new Map((meetings ?? []).map((m) => [m.title as string, { id: m.id as string, at: m.created_at as string }]));

  // A done task was completed when its last "done" update happened.
  const doneAt = new Map<string, string>();
  for (const a of ACTIVITY) if (a.field === "status" && a.newValue === "done") doneAt.set(a.task, ago(a.hours * HOUR));

  const { data: tasks, error: e4 } = await sb
    .from("tasks")
    .insert(
      TASKS.map((t) => ({
        title: t.title,
        workstream_id: streamId.get(t.workstream) ?? null,
        meeting_id: meeting.get(t.meeting)?.id ?? null,
        owner_id: idOf(t.owner),
        due_date: t.due === null ? null : addDays(today, t.due),
        priority: t.priority,
        status: t.status,
        blocker: t.blocker,
        source_sentence: t.source,
        flags: t.flags,
        completed_at: t.status === "done" ? doneAt.get(t.title) ?? null : null,
        created_at: meeting.get(t.meeting)?.at,
      })),
    )
    .select("id, title, owner_id");
  fail("adding the tasks", e4);
  const task = new Map((tasks ?? []).map((t) => [t.title as string, { id: t.id as string, owner: (t.owner_id as string | null) ?? null }]));

  const { error: e5 } = await sb.from("activity_log").insert(
    ACTIVITY.map((a) => {
      const t = task.get(a.task);
      return {
        task_id: t?.id ?? null,
        actor_id: a.actor ? idOf(a.actor) : t?.owner ?? null,
        source: a.source,
        field: a.field,
        old_value: a.oldValue,
        new_value: a.newValue === "OWNER_ID" ? t?.owner ?? null : a.newValue,
        quote: a.quote,
        created_at: ago(a.hours * HOUR),
      };
    }),
  );
  fail("adding the activity log", e5);

  return { members: members?.length ?? 0, workstreams: streams?.length ?? 0, meetings: meetings?.length ?? 0, tasks: tasks?.length ?? 0, activity: ACTIVITY.length };
}
