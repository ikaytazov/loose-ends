// POST /api/meetings/[id]/approve — the lead approves the reviewed task list (docs/api.md).
import { ApproveMeetingRequest, type ApproveMeetingResponse } from "@/lib/contracts/api";
import { HttpError, readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await readJson(req, ApproveMeetingRequest);
  const sb = db();

  const { data: meeting, error: e0 } = await sb.from("meetings").select("id, status").eq("id", id).maybeSingle();
  throwIf(e0, "load meeting");
  if (!meeting) throw new HttpError(404, "Meeting not found");

  const keep = body.tasks.filter((t) => t.keep);
  const drop = body.tasks.filter((t) => !t.keep).map((t) => t.id);

  for (const t of keep) {
    const flags = [...(t.owner_id ? [] : ["no_owner"]), ...(t.due_date ? [] : ["no_date"])];
    const { error } = await sb
      .from("tasks")
      .update({ title: t.title, owner_id: t.owner_id, workstream_id: t.workstream_id, due_date: t.due_date, priority: t.priority, status: "not_started", flags })
      .eq("id", t.id)
      .eq("meeting_id", id);
    throwIf(error, "approve task");
  }
  if (drop.length) {
    const { error } = await sb.from("tasks").delete().in("id", drop).eq("meeting_id", id).eq("status", "proposed");
    throwIf(error, "remove task");
  }
  if (keep.length) {
    const { error } = await sb.from("activity_log").insert(
      keep.map((t) => ({ task_id: t.id, source: "app", field: "created", new_value: "not_started", quote: null })),
    );
    throwIf(error, "write activity log");
  }
  await sb.from("meetings").update({ status: "approved" }).eq("id", id);

  const res: ApproveMeetingResponse = { approved: keep.length, removed: drop.length };
  return Response.json(res);
});
