// POST /api/inbound — the Gmail bridge (gmail-bridge/Code.gs) sends every new email here.
// Protected by BRIDGE_SECRET so nobody else can post fake replies.
import { InboundEmail } from "@/lib/contracts/api";
import { gmailApproverNotifier } from "@/lib/email/approver-notice";
import { gmailNotifier } from "@/lib/email/follow-up";
import { todayIn } from "@/lib/email/ordering";
import { handleInbound } from "@/lib/replies/handle";
import { claudeReplyParser } from "@/lib/replies/parse";
import { supabaseReplyRepo } from "@/lib/replies/supabase-repo";
import { env } from "@/lib/server/env";
import { HttpError, readJson, route } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const maxDuration = 60;

export const POST = route(async (req: Request) => {
  if (req.headers.get("x-bridge-secret") !== env.bridgeSecret()) throw new HttpError(401, "Wrong or missing bridge secret");
  const email = await readJson(req, InboundEmail);
  const sb = db();
  // After applying the reply, email the sender a confirmation or a question (issue #15).
  const result = await handleInbound(supabaseReplyRepo(sb), claudeReplyParser, email, {
    today: todayIn(env.timezone()),
    notify: gmailNotifier(sb),
    notifyApprover: gmailApproverNotifier(sb),
  });
  return Response.json(result, { status: result.ok ? 200 : 500 });
});
