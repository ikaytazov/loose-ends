// Issue #16: when a reply asks for more time, the approver (the workstream owner, or the lead) gets a short email
// pointing at the Decisions screen. Built here, sent with sendEmail, saved in `emails` as kind = 'decision_notice'.
//
// Deciding by email reply is out of scope (BUILD-SPEC §5), so this email must never be read as a reply: its subject
// leaves out "open tasks" and "Loose Ends" (the words the Gmail bridge searches for), it has no reply code, and it
// says so in the text. Otherwise the approver's "approved" could be applied to their own tasks.
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortDate } from "@/lib/replies/follow-up";
import { env } from "@/lib/server/env";
import { throwIf } from "@/lib/server/http";
import { sendEmail } from "./gmail";

/** One date request waiting for this approver. */
export interface PendingRequest {
  task_id: string;
  title: string;
  currentDueDate: string | null;
  requestedDueDate: string;
  reason: string | null;
}

export interface ApproverNotice {
  to: string;
  member_id: string;
  approverName: string;
  requesterName: string;
  requests: PendingRequest[];
}

export type ApproverNotifier = (notice: ApproverNotice) => Promise<void>;

const first = (name: string) => name.split(/\s+/)[0];

/** The address of the Decisions screen, if the app knows where it is deployed. */
export function decisionsUrl(vars: Record<string, string | undefined> = process.env): string | null {
  const base = vars.APP_URL || (vars.VERCEL_PROJECT_PRODUCTION_URL ? `https://${vars.VERCEL_PROJECT_PRODUCTION_URL}` : null);
  return base ? `${base.replace(/\/+$/, "")}/decisions` : null;
}

/** "Decision needed: Priya asked for more time" (never contains the bridge's search words). */
export function approverSubject(requesterName: string, count: number): string {
  return `Decision needed: ${first(requesterName)} asked for more time${count > 1 ? ` on ${count} tasks` : ""}`;
}

export function approverBody(notice: Omit<ApproverNotice, "to" | "member_id">, url: string | null): string {
  const who = first(notice.requesterName);
  const lines = [`Hi ${first(notice.approverName)}.`, ""];
  for (const r of notice.requests) {
    const from = r.currentDueDate ? ` from ${shortDate(r.currentDueDate)}` : "";
    lines.push(`${who} asked to move "${r.title}"${from} to ${shortDate(r.requestedDueDate)}.`);
    if (r.reason) lines.push(`Reason: ${r.reason}.`);
    lines.push(r.currentDueDate ? `The date stays ${shortDate(r.currentDueDate)} until you decide.` : "Nothing changes until you decide.", "");
  }
  lines.push(url ? `Approve or decline here: ${url}` : "Approve or decline on the Decisions page in Loose Ends.");
  lines.push("", "Replies to this email aren't read, so please decide on the Decisions page.");
  return lines.join("\n");
}

/** Sends the notice and saves it. Throws on failure; the caller makes sure a failed send never undoes the request. */
export function gmailApproverNotifier(sb: SupabaseClient): ApproverNotifier {
  return async (notice) => {
    const subject = approverSubject(notice.requesterName, notice.requests.length);
    const text = approverBody(notice, decisionsUrl());
    await sendEmail({ to: notice.to, subject, text });
    const { error } = await sb.from("emails").insert({
      direction: "out",
      kind: "decision_notice",
      member_id: notice.member_id,
      subject,
      body: text,
      from_address: env.teamEmail(),
      to_address: notice.to,
      task_refs: notice.requests.map((r, i) => ({ n: i + 1, task_id: r.task_id })),
      processed: true,
    });
    throwIf(error, "save approver notice");
  };
}
