"use client";

// Reads everything the Overview and Workstream screens show, straight from the views (CLAUDE.md rule 2:
// screens read Supabase, and change things only through app/api routes).
import type { ActivityLogEntry, DecisionNeededRow, TaskBoardRow, WorkstreamOverviewRow } from "@/lib/contracts/domain";
import { browserSupabase } from "@/lib/supabase/browser";

export type Board = {
  streams: WorkstreamOverviewRow[];
  tasks: TaskBoardRow[]; // approved tasks only (proposed ones are still waiting for review)
  decisions: DecisionNeededRow[];
  activity: ActivityLogEntry[];
};

export async function loadBoard(opts: { workstreamId?: string; activityLimit?: number } = {}): Promise<Board> {
  const sb = browserSupabase();
  let streams = sb.from("workstream_overview").select("*").order("name");
  let tasks = sb.from("task_board").select("*").neq("status", "proposed");
  let decisions = sb.from("decisions_needed").select("*").order("created_at", { ascending: false });
  if (opts.workstreamId) {
    streams = streams.eq("id", opts.workstreamId);
    tasks = tasks.eq("workstream_id", opts.workstreamId);
    decisions = decisions.eq("workstream_id", opts.workstreamId);
  }
  const [s, t, d] = await Promise.all([streams, tasks, decisions]);
  for (const r of [s, t, d]) if (r.error) throw new Error(r.error.message);
  const taskRows = (t.data ?? []) as TaskBoardRow[];

  // Activity: the latest rows overall, or every row for this workstream's tasks.
  let activityQuery = sb.from("activity_log").select("*").order("created_at", { ascending: false }).limit(opts.activityLimit ?? 12);
  if (opts.workstreamId) {
    const ids = taskRows.map((x) => x.id);
    activityQuery = ids.length ? activityQuery.in("task_id", ids) : activityQuery.eq("task_id", "00000000-0000-0000-0000-000000000000");
  }
  const a = await activityQuery;
  if (a.error) throw new Error(a.error.message);

  return {
    streams: (s.data ?? []) as WorkstreamOverviewRow[],
    tasks: taskRows,
    decisions: (d.data ?? []) as DecisionNeededRow[],
    activity: (a.data ?? []) as ActivityLogEntry[],
  };
}
