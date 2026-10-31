// Turns one incoming email into task updates.
//   1. Who sent it, and which morning email are they answering?
//   2. Ask the AI what changed (lib/replies/parse.ts).
//   3. Apply: status and blocker change straight away; a new date becomes a date request for the approver.
//   4. Log every change with the words that caused it.
//   5. Email the sender back: a one-line confirmation, or the AI's question (lib/replies/follow-up.ts).
import type { InboundEmail, InboundResponse } from "@/lib/contracts/api";
import type { ReplyChange } from "@/lib/contracts/ai";
import type { Task, TeamMember } from "@/lib/contracts/domain";
import { bareAddress, findReplyCode, stripQuoted } from "@/lib/email/address";
import { orderForEmail } from "@/lib/email/ordering";
import { pickApprover } from "./approver";
import { buildFollowUp, isAutoReply, type FollowUpItem, type Notifier } from "./follow-up";
import type { ReplyParser } from "./parse";
import type { NewActivity, ReplyRepo } from "./repo";

export async function handleInbound(
  repo: ReplyRepo,
  parse: ReplyParser,
  email: InboundEmail,
  opts: { today: string; notify?: Notifier },
): Promise<InboundResponse> {
  const empty = { applied: [], question: null };
  const fromAddr = bareAddress(email.from);
  const member = await repo.findMemberByEmail(fromAddr);

  // Which email are they answering? Prefer the code in the address; fall back to their latest morning email.
  const code = findReplyCode(email.to);
  let morning = code ? await repo.findMorningEmailByCode(code) : null;
  if (!morning && member) morning = await repo.latestMorningEmailFor(member.id);

  const replyText = stripQuoted(email.text);
  const inserted = await repo.insertInboundEmail({
    gmail_message_id: email.gmail_message_id,
    member_id: member?.id ?? null,
    from_address: fromAddr,
    to_address: email.to,
    subject: email.subject,
    body: replyText,
    in_reply_to_email_id: morning?.id ?? null,
  });
  if (inserted.alreadyProcessed) return { ok: true, status: "duplicate", ...empty };
  const emailId = inserted.id;

  if (!member) {
    await repo.markEmailProcessed(emailId, `Unknown sender ${fromAddr}`);
    return { ok: true, status: "unknown_sender", ...empty };
  }

  try {
    // The numbered list the person saw. Use the morning email's list if we have it, else rebuild it the same way.
    let numbered: { n: number; task: Task }[];
    if (morning?.task_refs?.length) {
      const tasks = await repo.getTasks(morning.task_refs.map((r) => r.task_id));
      const byId = new Map(tasks.map((t) => [t.id, t]));
      numbered = morning.task_refs.flatMap((r) => (byId.has(r.task_id) ? [{ n: r.n, task: byId.get(r.task_id)! }] : []));
    } else {
      const open = orderForEmail(await repo.getOpenTasksForOwner(member.id), opts.today);
      numbered = open.map((task, i) => ({ n: i + 1, task }));
    }
    if (numbered.length === 0) {
      await repo.markEmailProcessed(emailId, "No open tasks to match the reply to");
      return { ok: true, status: "no_tasks", ...empty };
    }

    const parsed = await parse({
      replyText,
      receivedDate: opts.today,
      tasks: numbered.map(({ n, task }) => ({ n, title: task.title, status: task.status, due_date: task.due_date, priority: task.priority })),
    });

    const lead = await repo.findLead();
    const applied: InboundResponse["applied"] = [];
    const items: FollowUpItem[] = [];
    const logs: NewActivity[] = [];
    const base = { actor_id: member.id, source: "email" as const, email_id: emailId };

    for (const change of parsed.changes) {
      const entry = numbered.find((x) => x.n === change.task_number);
      if (!entry) continue;
      const task = entry.task;

      if (change.confidence === "unsure") {
        logs.push({ ...base, task_id: task.id, field: "unclear", old_value: null, new_value: null, quote: change.quote });
        continue;
      }
      await applyChange(repo, task, change, { member: member.id, lead, emailId, base, logs, applied, items });
    }

    if (logs.length) await repo.log(logs);
    await repo.markEmailProcessed(emailId, null);

    // The reply is saved and applied; now tell the sender. A failed send must not undo or repeat the update.
    if (opts.notify && !isAutoReply(email.subject)) {
      const followUp = buildFollowUp({
        to: member.email,
        member_id: member.id,
        memberName: member.name,
        in_reply_to_email_id: emailId,
        numbered: numbered.map(({ n, task }) => ({ n, task_id: task.id, title: task.title })),
        items,
        question: parsed.question,
      });
      try {
        await opts.notify(followUp);
      } catch (e) {
        console.error("Could not send the follow-up email:", e);
      }
    }

    return { ok: true, status: "applied", applied, question: parsed.question };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await repo.markEmailProcessed(emailId, msg);
    return { ok: false, status: "error", ...empty };
  }
}

async function applyChange(
  repo: ReplyRepo,
  task: Task,
  change: ReplyChange,
  ctx: {
    member: string;
    lead: TeamMember | null;
    emailId: string;
    base: Pick<NewActivity, "actor_id" | "source" | "email_id">;
    logs: NewActivity[];
    applied: InboundResponse["applied"];
    items: FollowUpItem[];
  },
) {
  const patch: Partial<Pick<Task, "status" | "blocker">> = {};
  const { base, logs, applied, items } = ctx;

  if (change.new_status !== "unchanged" && change.new_status !== task.status) {
    patch.status = change.new_status;
    logs.push({ ...base, task_id: task.id, field: "status", old_value: task.status, new_value: change.new_status, quote: change.quote });
    applied.push({ task_id: task.id, field: "status", new_value: change.new_status });
  }
  const statusChanged = patch.status !== undefined;

  const finalStatus = patch.status ?? task.status;
  const newBlocker = finalStatus === "blocked" ? change.blocker ?? task.blocker : null;
  if (newBlocker !== task.blocker) {
    patch.blocker = newBlocker;
    logs.push({ ...base, task_id: task.id, field: "blocker", old_value: task.blocker, new_value: newBlocker, quote: change.quote });
    applied.push({ task_id: task.id, field: "blocker", new_value: newBlocker });
  }
  if (statusChanged) items.push({ type: "status", title: task.title, status: patch.status!, blocker: newBlocker });
  else if (patch.blocker !== undefined && newBlocker !== null) items.push({ type: "blocker", title: task.title, blocker: newBlocker });

  if (Object.keys(patch).length) await repo.updateTask(task.id, patch);

  // Due dates never change from a reply: they become a request for the approver.
  if (change.requested_due_date && change.requested_due_date !== task.due_date) {
    const ws = task.workstream_id ? await repo.getWorkstream(task.workstream_id) : null;
    const approver = pickApprover({ requesterId: ctx.member, workstreamOwnerId: ws?.owner_id ?? null, leadId: ctx.lead?.id ?? null });
    await repo.upsertWaitingDateRequest({
      task_id: task.id,
      requested_by: ctx.member,
      current_due_date: task.due_date,
      requested_due_date: change.requested_due_date,
      reason: change.reason ?? change.blocker,
      approver_id: approver,
      source_email_id: ctx.emailId,
    });
    logs.push({ ...base, task_id: task.id, field: "date_request", old_value: task.due_date, new_value: change.requested_due_date, quote: change.quote });
    applied.push({ task_id: task.id, field: "date_request", new_value: change.requested_due_date });
    const approverMember = !approver ? null : approver === ctx.lead?.id ? ctx.lead : await repo.getMember(approver);
    items.push({ type: "date_request", title: task.title, date: change.requested_due_date, approverName: approverMember?.name ?? null });
  }
}
