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

/**
 * Reads the bridge's answer to a plain GET (its doGet), without sending anything.
 * "ok" means the web app is deployed with access set to "Anyone" and answers as expected.
 */
export function bridgeStatus(httpStatus: number, body: string): string {
  let parsed: { ok?: boolean } | null = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    /* not JSON */
  }
  if (httpStatus === 200 && parsed?.ok === true) return "ok";
  if (/<html/i.test(body)) {
    return `error: the bridge answered with a web page (HTTP ${httpStatus}), not the app. In Apps Script → Deploy → Manage deployments, check "Who has access" is "Anyone" and that GMAIL_BRIDGE_URL is the /exec address`;
  }
  return `error: unexpected answer (HTTP ${httpStatus}): ${body.slice(0, 120)}`;
}

/** Checks the bridge is reachable and deployed correctly. Sends no email. */
export async function checkBridge(): Promise<string> {
  try {
    const res = await fetch(env.gmailBridgeUrl(), { redirect: "follow", cache: "no-store" });
    return bridgeStatus(res.status, await res.text());
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : String(e)}`;
  }
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
