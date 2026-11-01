// POST /api/team-members — add a teammate (docs/api.md). Used by the Team page "Add teammate" form and the Review
// screen's "Add Sarah". If the email is already on the team, nobody new is created: the existing person is returned
// and still gets the tasks. Only tasks that are still proposed can be assigned. This route never sends an email;
// the new person gets the normal morning email. No database change is needed (team_members already exists).
import { AddMemberRequest, type AddMemberResponse } from "@/lib/contracts/api";
import type { Task, TeamMember } from "@/lib/contracts/domain";
import { HttpError, readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";
import { DAILY_NEW_MEMBER_LIMIT, flagsAfterAssign } from "@/lib/server/team-members";

export const POST = route(async (req: Request) => {
  const body = await readJson(req, AddMemberRequest);
  const sb = db();

  const { data: found, error: e0 } = await sb.from("team_members").select("*").ilike("email", body.email).maybeSingle();
  throwIf(e0, "find member");
  let member = found as TeamMember | null;
  const existing = member !== null;

  if (!member) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error: e1 } = await sb.from("team_members").select("id", { count: "exact", head: true }).gte("created_at", since);
    throwIf(e1, "count new members");
    if ((count ?? 0) >= DAILY_NEW_MEMBER_LIMIT) throw new HttpError(429, "Daily limit for new teammates reached");

    const { data, error } = await sb.from("team_members").insert({ name: body.name, email: body.email, role: "member" }).select("*").single();
    if (error?.code === "23505") throw new HttpError(409, "That email is already on the team");
    throwIf(error, "add member");
    member = data as TeamMember;
  }

  let assigned = 0;
  if (body.assign_task_ids.length) {
    const { data: tasks, error: e2 } = await sb.from("tasks").select("id, flags, owner_id").in("id", body.assign_task_ids).eq("status", "proposed");
    throwIf(e2, "load tasks");
    for (const t of (tasks ?? []) as Pick<Task, "id" | "flags" | "owner_id">[]) {
      const { error } = await sb.from("tasks").update({ owner_id: member.id, flags: flagsAfterAssign(t.flags) }).eq("id", t.id).eq("status", "proposed");
      throwIf(error, "assign task");
      await sb.from("activity_log").insert({ task_id: t.id, actor_id: body.added_by, source: "app", field: "owner", old_value: t.owner_id, new_value: member.id });
      assigned += 1;
    }
  }

  if (!existing) {
    await sb.from("activity_log").insert({ task_id: null, actor_id: body.added_by, source: "app", field: "team_member_added", new_value: member.name });
  }

  const res: AddMemberResponse = { member, assigned, existing };
  return Response.json(res);
});
