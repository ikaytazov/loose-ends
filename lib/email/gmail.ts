// Sends email from the team Gmail address through the Apps Script bridge (gmail-bridge/Code.gs).
// No Google Cloud project or passwords in this app: the script runs inside the Gmail account itself.
import { env } from "@/lib/server/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  const res = await fetch(env.gmailBridgeUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script reads the raw body
    body: JSON.stringify({ secret: env.bridgeSecret(), action: "send", ...msg }),
    redirect: "follow",
  });
  const body = await res.text();
  let parsed: { ok?: boolean; error?: string } = {};
  try {
    parsed = JSON.parse(body);
  } catch {
    /* Apps Script returned an HTML page: usually the deployment is not set to "Anyone" */
  }
  if (!res.ok || !parsed.ok) {
    throw new Error(`Gmail bridge failed (${res.status}): ${parsed.error ?? body.slice(0, 200)}`);
  }
}
