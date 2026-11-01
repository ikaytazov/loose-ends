// ReplyRepo backed by Supabase (service-role client).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, TeamMember, Workstream } from "@/lib/contracts/domain";
import { mailboxKey } from "@/lib/email/address";
import { throwIf } from "@/lib/server/http";
import type { MorningEmailRef, ReplyRepo } from "./repo";

export function supabaseReplyRepo(sb: SupabaseClient): ReplyRepo {
  return {
    async findMemberByEmail(email) {
      // Exact address first; otherwise the one member whose address reaches the same mailbox
      // (Gmail ignores dots and +tags). If several members share that mailbox, we can't tell who it is: null.
      const { data, error } = await sb.from("team_members").select("*");
      throwIf(error, "find member");
      const all = (data ?? []) as TeamMember[];
      const exact = all.find((m) => m.email.toLowerCase() === email.toLowerCase());
      if (exact) return exact;
      const same = all.filter((m) => mailboxKey(m.email) === mailboxKey(email));
      return same.length === 1 ? same[0] : null;
    },
    async findLead() {
      const { data, error } = await sb.from("team_members").select("*").eq("role", "lead").order("created_at").limit(1).maybeSingle();
      throwIf(error, "find lead");
      return data as TeamMember | null;
    },
    async getMember(id) {
      const { data, error } = await sb.from("team_members").select("*").eq("id", id).maybeSingle();
      throwIf(error, "get member");
      return data as TeamMember | null;
    },
    async findMorningEmailByCode(code) {
      const { data, error } = await sb.from("emails").select("id, member_id, task_refs").eq("reply_code", code).maybeSingle();
      throwIf(error, "find morning email");
      return data as MorningEmailRef | null;
    },
    async latestMorningEmailFor(memberId) {
      const { data, error } = await sb
        .from("emails")
        .select("id, member_id, task_refs")
        .eq("member_id", memberId)
        .eq("kind", "morning")
        .eq("direction", "out")
        .order("at", { ascending: false })
        .limit(1)
        .maybeSingle();
      throwIf(error, "latest morning email");
      return data as MorningEmailRef | null;
    },
    async getTasks(ids) {
      if (!ids.length) return [];
      const { data, error } = await sb.from("tasks").select("*").in("id", ids);
      throwIf(error, "get tasks");
      return (data ?? []) as Task[];
    },
    async getOpenTasksForOwner(memberId) {
      const { data, error } = await sb.from("tasks").select("*").eq("owner_id", memberId).not("status", "in", "(done,proposed)");
      throwIf(error, "open tasks");
      return (data ?? []) as Task[];
    },
    async getWorkstream(id) {
      const { data, error } = await sb.from("workstreams").select("*").eq("id", id).maybeSingle();
      throwIf(error, "get workstream");
      return data as Workstream | null;
    },
    async insertInboundEmail(row) {
      const { data, error } = await sb
        .from("emails")
        .insert({ ...row, direction: "in", kind: "reply" })
        .select("id")
        .single();
      if (error?.code === "23505") {
        // Seen this Gmail message before: skip it if it was handled, retry it if it failed.
        const { data: prev, error: e2 } = await sb
          .from("emails")
          .select("id, processed")
          .eq("gmail_message_id", row.gmail_message_id)
          .single();
        throwIf(e2, "find earlier copy of email");
        const p = prev as { id: string; processed: boolean };
        return { id: p.id, alreadyProcessed: p.processed };
      }
      throwIf(error, "save incoming email");
      return { id: (data as { id: string }).id, alreadyProcessed: false };
    },
    async updateTask(id, patch) {
      const { error } = await sb.from("tasks").update(patch).eq("id", id);
      throwIf(error, "update task");
    },
    async upsertWaitingDateRequest(row) {
      const { data: existing, error: e1 } = await sb
        .from("date_requests")
        .select("id")
        .eq("task_id", row.task_id)
        .eq("status", "waiting")
        .maybeSingle();
      throwIf(e1, "find date request");
      if (existing) {
        const { error } = await sb.from("date_requests").update(row).eq("id", (existing as { id: string }).id);
        throwIf(error, "update date request");
      } else {
        const { error } = await sb.from("date_requests").insert({ ...row, status: "waiting" });
        throwIf(error, "create date request");
      }
    },
    async log(entries) {
      const { error } = await sb.from("activity_log").insert(entries);
      throwIf(error, "write activity log");
    },
    async markEmailProcessed(id, err) {
      const { error } = await sb.from("emails").update({ processed: err === null, processing_error: err }).eq("id", id);
      throwIf(error, "mark email processed");
    },
  };
}
