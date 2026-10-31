// POST /api/emails/send-morning — the "Send morning emails now" button and the 8 am job (docs/api.md).
//
// >>> STUB <<<  Works out who WOULD get an email and what it would list, but does not send or save anything.
// Owner of the real version: see docs/team-tasks.md ("Morning email").
// To make it real, for each recipient:
//   1. code = newReplyCode(); replyTo = replyAddress(env.teamEmail(), code)   (lib/email/address.ts)
//   2. sendEmail({ to, subject, text, replyTo })                                (lib/email/gmail.ts)
//   3. insert into emails: direction 'out', kind 'morning', member_id, reply_code: code,
//      task_refs: [{ n, task_id }] in the SAME order as orderForEmail()        (lib/email/ordering.ts)
// Step 3 is what lets the reply reader know that "2 is done" means the second task in this email.
import { SendMorningRequest, type SendMorningResponse } from "@/lib/contracts/api";
import type { Task, TeamMember } from "@/lib/contracts/domain";
import { orderForEmail, todayIn } from "@/lib/email/ordering";
import { env } from "@/lib/server/env";
import { readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const POST = route(async (req: Request) => {
  const body = await readJson(req, SendMorningRequest);
  const sb = db();
  let q = sb.from("team_members").select("*");
  if (body.member_id) q = q.eq("id", body.member_id);
  const { data: members, error: e1 } = await q;
  throwIf(e1, "load team");
  const { data: tasks, error: e2 } = await sb.from("tasks").select("*").not("status", "in", "(done,proposed)");
  throwIf(e2, "load tasks");

  const today = todayIn(env.timezone());
  const preview = ((members ?? []) as TeamMember[])
    .map((m) => ({ member: m, tasks: orderForEmail(((tasks ?? []) as Task[]).filter((t) => t.owner_id === m.id), today) }))
    .filter((x) => x.tasks.length > 0);

  const res: SendMorningResponse & { stub: true; preview: unknown } = {
    stub: true,
    sent: 0,
    recipients: preview.map((p) => p.member.email),
    preview: preview.map((p) => ({ to: p.member.email, tasks: p.tasks.map((t, i) => `${i + 1}. ${t.priority} – ${t.title} – due ${t.due_date ?? "no date"}`) })),
  };
  return Response.json(res);
});
