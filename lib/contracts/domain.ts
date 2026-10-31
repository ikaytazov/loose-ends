// Shared shapes for rows in Supabase. Mirrors supabase/migrations/*_init.sql.
// Front-end and back-end both import from here. Do not redefine these elsewhere.
// If the schema changes (new migration), update this file in the same pull request.

export const TASK_STATUSES = ["proposed", "not_started", "in_progress", "blocked", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const HEALTH = ["on_track", "blocked", "decision_needed", "update_needed"] as const;
export type Health = (typeof HEALTH)[number];

export type Role = "lead" | "member";
export type ActivitySource = "app" | "email" | "reply_page" | "ai" | "system";
export type DateRequestStatus = "waiting" | "approved" | "declined";
export type TaskFlag = "no_owner" | "no_date" | "unclear";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface Workstream {
  id: string;
  name: string;
  goal: string | null;
  owner_id: string | null;
  target_date: string | null; // YYYY-MM-DD
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string; // YYYY-MM-DD
  attendees: string[];
  raw_notes: string;
  source: "paste" | "email" | "webhook" | "mcp";
  status: "processing" | "proposed" | "approved" | "failed";
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  workstream_id: string | null;
  meeting_id: string | null;
  owner_id: string | null;
  due_date: string | null; // YYYY-MM-DD
  priority: Priority;
  status: TaskStatus;
  blocker: string | null;
  source_sentence: string | null;
  flags: TaskFlag[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DateRequest {
  id: string;
  task_id: string;
  requested_by: string | null;
  current_due_date: string | null;
  requested_due_date: string;
  reason: string | null;
  approver_id: string | null;
  status: DateRequestStatus;
  source_email_id: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  task_id: string | null;
  actor_id: string | null;
  source: ActivitySource;
  field: string;
  old_value: string | null;
  new_value: string | null;
  quote: string | null;
  email_id: string | null;
  created_at: string;
}

// ---- Views (read-only, calculated in the database) ----

/** View `task_board`: one row per task, ready for the board and task panel. */
export interface TaskBoardRow extends Task {
  owner_name: string | null;
  owner_avatar_url: string | null;
  workstream_name: string | null;
  is_overdue: boolean;
  last_update_at: string;
  last_update_source: ActivitySource | null;
  last_update_quote: string | null;
  pending_date_request_id: string | null;
  pending_requested_due_date: string | null;
}

/** View `workstream_overview`: one row per workstream card on the Overview screen. */
export interface WorkstreamOverviewRow {
  id: string;
  name: string;
  goal: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_avatar_url: string | null;
  target_date: string | null;
  total_tasks: number;
  done_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  last_update_at: string | null;
  health: Health;
}

/** View `decisions_needed`: the "Needs your decision" list. Filter by approver_id. */
export interface DecisionNeededRow {
  kind: "date_change" | "assign_owner";
  decision_id: string | null; // date_requests.id for date_change, null for assign_owner
  task_id: string;
  task_title: string;
  workstream_id: string | null;
  workstream_name: string | null;
  approver_id: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  current_due_date: string | null;
  requested_due_date: string | null;
  reason: string | null;
  created_at: string;
}
