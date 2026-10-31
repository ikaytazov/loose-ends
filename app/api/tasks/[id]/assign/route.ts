// POST /api/tasks/[id]/assign — give a task an owner (docs/api.md).
import { AssignOwnerRequest, type AssignOwnerResponse } from "@/lib/contracts/api";
import type { Task } from "@/lib/contracts/domain";
import { HttpError, readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await readJson(req, AssignOwnerRequest);
  const sb = db();

  const { data: before, error: e0 } = await sb.from("tasks").select("*").eq("id", id).maybeSingle();
  throwIf(e0, "load task");
  if (!before) throw new HttpError(404, "Task not found");
  const old = before as Task;

  const flags = old.flags.filter((f) => f !== "no_owner");
  const { data, error } = await sb.from("tasks").update({ owner_id: body.owner_id, flags }).eq("id", id).select("*").single();
  throwIf(error, "assign owner");

  await sb.from("activity_log").insert({
    task_id: id, actor_id: body.acted_by, source: "app", field: "owner", old_value: old.owner_id, new_value: body.owner_id,
  });

  const res: AssignOwnerResponse = { task: data as Task };
  return Response.json(res);
});
