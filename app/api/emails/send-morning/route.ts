// /api/emails/send-morning — the morning email (docs/api.md, agreement C in docs/agreements.md).
//   POST  the "Send morning emails now" button. Body {} = everyone with open tasks, or { member_id }.
//   GET   the 8 am job (Vercel cron, see vercel.json). Needs `Authorization: Bearer <CRON_SECRET>`.
//
// For each person with open tasks:
//   1. code = newReplyCode(); replyTo = replyAddress(team email, code)
//   2. save the email (kind 'morning', reply_code, task_refs in orderForEmail() order)
//   3. send it through the Gmail bridge; if sending fails, remove the saved row
// Step 2 is what lets the reply reader know that "2 is done" means the second task in this email.
// We save before sending so a reply can never arrive for an email we have no record of.
import { connection } from "next/server";
import { SendMorningRequest, type SendMorningResponse } from "@/lib/contracts/api";
import type { Task, TeamMember, Workstream } from "@/lib/contracts/domain";
import { newReplyCode, replyAddress, replyPageUrl } from "@/lib/email/address";
import { sendEmail } from "@/lib/email/gmail";
import { morningBody, morningSubject } from "@/lib/email/morning";
import { orderForEmail, todayIn } from "@/lib/email/ordering";
import { env } from "@/lib/server/env";
import { HttpError, readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

type Result = SendMorningResponse & { failed: { to: string; error: string }[] };

async function sendMorning(memberId?: string): Promise<Result> {
  const sb = db();
  let q = sb.from("team_members").select("*");
  if (memberId) q = q.eq("id", memberId);
  const { data: members, error: e1 } = await q;
  throwIf(e1, "load team");
  if (memberId && !members?.length) throw new HttpError(404, "No team member with that id");
  const { data: tasks, error: e2 } = await sb.from("tasks").select("*").not("status", "in", "(done,proposed)");
  throwIf(e2, "load tasks");
  const { data: workstreams, error: e3 } = await sb.from("workstreams").select("id, name");
  throwIf(e3, "load workstreams");

  const wsNames = new Map(((workstreams ?? []) as Pick<Workstream, "id" | "name">[]).map((w) => [w.id, w.name]));
  const today = todayIn(env.timezone());
  const teamEmail = env.teamEmail();
  const appUrl = env.appUrl();

  const result: Result = { sent: 0, recipients: [], failed: [] };
  for (const m of (members ?? []) as TeamMember[]) {
    const mine = orderForEmail(((tasks ?? []) as Task[]).filter((t) => t.owner_id === m.id), today);
    if (!mine.length) continue;

    const code = newReplyCode();
    const subject = morningSubject(mine.length, today);
    const text = morningBody(m.name, mine, wsNames, today, appUrl && replyPageUrl(appUrl, code));
    const { data: saved, error: e4 } = await sb
      .from("emails")
      .insert({
        direction: "out",
        kind: "morning",
        member_id: m.id,
        subject,
        body: text,
        from_address: teamEmail,
        to_address: m.email,
        reply_code: code,
        task_refs: mine.map((t, i) => ({ n: i + 1, task_id: t.id })),
      })
      .select("id")
      .single();
    if (e4) {
      result.failed.push({ to: m.email, error: `save email: ${e4.message}` });
      continue;
    }

    try {
      await sendEmail({ to: m.email, subject, text, replyTo: replyAddress(teamEmail, code) });
      result.sent += 1;
      result.recipients.push(m.email);
    } catch (e) {
      await sb.from("emails").delete().eq("id", saved.id);
      result.failed.push({ to: m.email, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}

export const POST = route(async (req: Request) => {
  const body = await readJson(req, SendMorningRequest);
  return Response.json(await sendMorning(body.member_id));
});

export const GET = route(async (req: Request) => {
  await connection(); // run on every call, never once at build time
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "Not allowed");
  // Vercel schedules are in UTC, so vercel.json runs this at 15:00 and 16:00 UTC (8 am Pacific in summer
  // and winter). Only the run that lands at 8 am in the team time zone sends.
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: env.timezone(), hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hour !== 8) return Response.json({ skipped: `not 8 am in ${env.timezone()} (hour ${hour})`, sent: 0, recipients: [] });
  return Response.json(await sendMorning());
});
