// POST /api/dev/test-email — sends one real test email through the Gmail bridge (issue #8).
// Body: { "to": "someone@example.com" } (optional; default is the team address itself).
// Protected: needs header `x-bridge-secret: <BRIDGE_SECRET>`, and `to` must be a team member or the team address,
// so it cannot be used to email strangers. The email is saved in `emails` (kind 'other') like every other email.
import { z } from "zod";
import { sendEmail } from "@/lib/email/gmail";
import { env } from "@/lib/server/env";
import { HttpError, readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

const Body = z.object({ to: z.string().email().optional() });

export const POST = route(async (req: Request) => {
  if (req.headers.get("x-bridge-secret") !== env.bridgeSecret()) throw new HttpError(401, "Not allowed");
  const { to: asked } = await readJson(req, Body);
  const teamEmail = env.teamEmail();
  const to = (asked ?? teamEmail).toLowerCase();

  const sb = db();
  let memberId: string | null = null;
  if (to !== teamEmail.toLowerCase()) {
    const { data, error } = await sb.from("team_members").select("id").ilike("email", to).maybeSingle();
    throwIf(error, "find team member");
    if (!data) throw new HttpError(400, "Test emails can only go to a team member or the team address");
    memberId = (data as { id: string }).id;
  }

  const sentAt = new Date().toISOString();
  // Subject avoids "open tasks" and "Loose Ends": the bridge only forwards replies with those words, so a reply
  // to this test can never be read as a task update.
  const subject = "Gmail bridge test (no reply needed)";
  const text = `This is a test email sent by the app through the Gmail bridge at ${sentAt}.\n\nIf you can read this, sending works. No need to reply.`;
  await sendEmail({ to, subject, text });

  const { error } = await sb.from("emails").insert({
    direction: "out", kind: "other", member_id: memberId, subject, body: text,
    from_address: teamEmail, to_address: to, processed: true,
  });
  throwIf(error, "save test email");
  return Response.json({ ok: true, to, sent_at: sentAt });
});
