// After the workstream owner approves or declines a new due date, the person who asked gets one short email
// (spec step 6: "The date moves, and Priya gets a one-line confirmation").
// Built here, sent with sendEmail, and saved in `emails` like every other email.
// It gets a reply code and the task as number 1, so a reply to it ("thanks, 1 is done") still reaches the right task.
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortDate } from "@/lib/replies/follow-up";
import { env } from "@/lib/server/env";
import { throwIf } from "@/lib/server/http";
import { newReplyCode, replyAddress } from "./address";
import { sendEmail } from "./gmail";

export interface DecisionNoticeInput {
  requesterName: string;
  deciderName: string | null;
  title: string;
  decision: "approved" | "declined";
  currentDueDate: string | null; // the date before the request
  requestedDueDate: string;
}

/** Subject always contains "Loose Ends": the Gmail bridge only picks up replies with these words. */
export function decisionSubject(decision: "approved" | "declined"): string {
  return decision === "approved" ? "Loose Ends: new date approved" : "Loose Ends: date request declined";
}

/** "Hi Priya. Maya approved your new date: "Finish the partner deck" is now due Wed 11 Nov." */
export function decisionLine(input: DecisionNoticeInput): string {
  const first = input.requesterName.split(" ")[0];
  const who = input.deciderName ? input.deciderName.split(" ")[0] : "Your workstream owner";
  const t = `"${input.title}"`;
  if (input.decision === "approved") {
    return `Hi ${first}. ${who} approved your new date: ${t} is now due ${shortDate(input.requestedDueDate)}.`;
  }
  const kept = input.currentDueDate ? `it stays due ${shortDate(input.currentDueDate)}` : "it keeps no due date";
  return `Hi ${first}. ${who} kept the current date for ${t}: ${kept}.`;
}

export function decisionBody(input: DecisionNoticeInput): string {
  return `${decisionLine(input)}\n\nIf anything has changed, just reply to this email.`;
}

/** Sends the notice and saves it. Throws on failure; the caller decides that a failed send never undoes the decision. */
export async function sendDecisionNotice(
  sb: SupabaseClient,
  input: DecisionNoticeInput & { to: string; member_id: string; task_id: string },
): Promise<void> {
  const code = newReplyCode();
  const subject = decisionSubject(input.decision);
  const text = decisionBody(input);
  await sendEmail({ to: input.to, subject, text, replyTo: replyAddress(env.teamEmail(), code) });
  const { error } = await sb.from("emails").insert({
    direction: "out",
    kind: "confirmation",
    member_id: input.member_id,
    subject,
    body: text,
    from_address: env.teamEmail(),
    to_address: input.to,
    reply_code: code,
    task_refs: [{ n: 1, task_id: input.task_id }],
    processed: true,
  });
  throwIf(error, "save decision notice");
}
