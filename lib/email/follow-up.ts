// Sends a confirmation or question email (built in lib/replies/follow-up.ts) and saves it in `emails`.
// It gets its own reply code and the same task numbering as the email that was answered, so if the person
// replies to it ("no, 2 isn't done yet"), the reply reader knows which tasks the numbers mean.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notifier } from "@/lib/replies/follow-up";
import { env } from "@/lib/server/env";
import { throwIf } from "@/lib/server/http";
import { newReplyCode, replyAddress } from "./address";
import { sendEmail } from "./gmail";

export function gmailNotifier(sb: SupabaseClient): Notifier {
  return async (msg) => {
    const code = newReplyCode();
    await sendEmail({ to: msg.to, subject: msg.subject, text: msg.text, replyTo: replyAddress(env.teamEmail(), code) });
    const { error } = await sb.from("emails").insert({
      direction: "out",
      kind: msg.kind,
      member_id: msg.member_id,
      subject: msg.subject,
      body: msg.text,
      from_address: env.teamEmail(),
      to_address: msg.to,
      reply_code: code,
      task_refs: msg.task_refs,
      in_reply_to_email_id: msg.in_reply_to_email_id,
      processed: true,
    });
    throwIf(error, "save follow-up email");
  };
}
