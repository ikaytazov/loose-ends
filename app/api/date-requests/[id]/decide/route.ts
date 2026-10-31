// POST /api/date-requests/[id]/decide — approve or decline a new due date (docs/api.md).
// Approved: the task's due date moves. Declined: it stays. Either way the decision is logged.
import { DecideDateRequest, type DecideDateResponse } from "@/lib/contracts/api";
import type { DateRequest, Task } from "@/lib/contracts/domain";
import { sendDecisionNotice } from "@/lib/email/decision";
import { HttpError, readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await readJson(req, DecideDateRequest);
  const sb = db();

  const { data: found, error: e0 } = await sb.from("date_requests").select("*").eq("id", id).maybeSingle();
  throwIf(e0, "load date request");
  if (!found) throw new HttpError(404, "Date request not found");
  const request = found as DateRequest;
  if (request.status !== "waiting") throw new HttpError(409, `Already ${request.status}`);

  const { data: updated, error: e1 } = await sb
    .from("date_requests")
    .update({ status: body.decision, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "waiting")
    .select("*")
    .single();
  throwIf(e1, "save decision");

  let task: Task;
  if (body.decision === "approved") {
    const { data, error } = await sb.from("tasks").update({ due_date: request.requested_due_date }).eq("id", request.task_id).select("*").single();
    throwIf(error, "move due date");
    task = data as Task;
  } else {
    const { data, error } = await sb.from("tasks").select("*").eq("id", request.task_id).single();
    throwIf(error, "load task");
    task = data as Task;
  }

  await sb.from("activity_log").insert({
    task_id: request.task_id,
    actor_id: body.decided_by,
    source: "app",
    field: body.decision === "approved" ? "due_date" : "date_request_declined",
    old_value: request.current_due_date,
    new_value: body.decision === "approved" ? request.requested_due_date : null,
  });

  // Tell the person who asked (spec step 6). The decision is already saved, so a failed send must not undo it.
  if (request.requested_by) {
    try {
      const { data: people } = await sb.from("team_members").select("id, name, email").in("id", [request.requested_by, body.decided_by]);
      const requester = people?.find((p) => p.id === request.requested_by);
      const decider = people?.find((p) => p.id === body.decided_by);
      if (requester?.email) {
        await sendDecisionNotice(sb, {
          to: requester.email,
          member_id: requester.id,
          task_id: task.id,
          requesterName: requester.name,
          deciderName: decider?.name ?? null,
          title: task.title,
          decision: body.decision,
          currentDueDate: request.current_due_date,
          requestedDueDate: request.requested_due_date,
        });
      }
    } catch (e) {
      console.error("decision notice not sent", e);
    }
  }

  const res: DecideDateResponse = { date_request: updated as DateRequest, task };
  return Response.json(res);
});
