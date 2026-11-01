// POST /api/demo/reset — puts the database back to the demo's starting point (the same data as supabase/seed.sql),
// so the team can reset before each dry run or take without the Supabase SQL editor. Used by the /demo page.
// Protected: body { key } must equal BRIDGE_SECRET, because it deletes everything (tasks, emails, decisions).
import { z } from "zod";
import { resetDemo } from "@/lib/demo/reset";
import { env } from "@/lib/server/env";
import { HttpError, readJson, route } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const maxDuration = 30;

const Body = z.object({ key: z.string().min(1) });

export const POST = route(async (req: Request) => {
  const { key } = await readJson(req, Body);
  if (key !== env.bridgeSecret()) throw new HttpError(401, "Wrong password");
  const counts = await resetDemo(db());
  return Response.json({ ok: true, ...counts });
});
