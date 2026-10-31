// The "reply here" page: the same update as an email reply, typed on a page linked from the morning email.
// The code in the link stands in for the sender and the reply-to address, then handleInbound does the rest.
import { randomUUID } from "node:crypto";
import type { InboundResponse, ReplyPageData } from "@/lib/contracts/api";
import { handleInbound } from "./handle";
import type { ReplyParser } from "./parse";
import type { ReplyRepo } from "./repo";

async function findTarget(repo: ReplyRepo, code: string) {
  const email = await repo.findMorningEmailByCode(code.toLowerCase());
  if (!email?.member_id || !email.task_refs?.length) return null;
  const member = await repo.getMember(email.member_id);
  return member ? { member, refs: email.task_refs } : null;
}

/** null = no such link. */
export async function loadReplyPage(repo: ReplyRepo, code: string): Promise<ReplyPageData | null> {
  const target = await findTarget(repo, code);
  if (!target) return null;
  const tasks = await repo.getTasks(target.refs.map((r) => r.task_id));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return {
    name: target.member.name.trim().split(/\s+/)[0] || target.member.name,
    tasks: target.refs.flatMap((r) => {
      const t = byId.get(r.task_id);
      return t ? [{ n: r.n, title: t.title, priority: t.priority, status: t.status, due_date: t.due_date }] : [];
    }),
  };
}

/** null = no such link. No notifier: the page shows the result, so no follow-up email is sent. */
export async function submitReplyPage(
  repo: ReplyRepo,
  parse: ReplyParser,
  code: string,
  text: string,
  opts: { today: string },
): Promise<InboundResponse | null> {
  const target = await findTarget(repo, code);
  if (!target) return null;
  return handleInbound(
    repo,
    parse,
    {
      gmail_message_id: `reply-page-${randomUUID()}`, // not from Gmail: every submit is a new message
      from: target.member.email,
      to: `reply-page+le-${code.toLowerCase()}@loose-ends.invalid`,
      subject: "Reply page update",
      text,
      received_at: new Date().toISOString(),
    },
    { today: opts.today, source: "reply_page" },
  );
}
