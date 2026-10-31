// The database operations the reply handler needs, behind an interface so it can be tested without Supabase.
import type { ActivityLogEntry, DateRequest, Task, TeamMember, Workstream } from "@/lib/contracts/domain";

export interface MorningEmailRef {
  id: string;
  member_id: string | null;
  task_refs: { n: number; task_id: string }[] | null;
}

export type NewActivity = Omit<ActivityLogEntry, "id" | "created_at">;

export interface ReplyRepo {
  findMemberByEmail(email: string): Promise<TeamMember | null>;
  findLead(): Promise<TeamMember | null>;
  findMorningEmailByCode(code: string): Promise<MorningEmailRef | null>;
  latestMorningEmailFor(memberId: string): Promise<MorningEmailRef | null>;
  getTasks(ids: string[]): Promise<Task[]>;
  getOpenTasksForOwner(memberId: string): Promise<Task[]>;
  getWorkstream(id: string): Promise<Workstream | null>;
  /** Returns "duplicate" when this Gmail message was already received. */
  insertInboundEmail(row: {
    gmail_message_id: string;
    member_id: string | null;
    from_address: string;
    to_address: string;
    subject: string;
    body: string;
    in_reply_to_email_id: string | null;
  }): Promise<{ id: string } | "duplicate">;
  updateTask(id: string, patch: Partial<Pick<Task, "status" | "blocker">>): Promise<void>;
  /** One waiting request per task: replaces the requested date if one is already waiting. */
  upsertWaitingDateRequest(row: Omit<DateRequest, "id" | "status" | "decided_at" | "created_at">): Promise<void>;
  log(entries: NewActivity[]): Promise<void>;
  markEmailProcessed(id: string, error: string | null): Promise<void>;
}
