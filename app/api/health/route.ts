// GET /api/health — open this in a browser to check the app has its settings, can reach the database,
// and can reach the Gmail bridge.
import { connection } from "next/server";
import { checkBridge } from "@/lib/email/gmail";
import { db } from "@/lib/server/supabase";

const SETTINGS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "TEAM_EMAIL",
  "GMAIL_BRIDGE_URL",
  "BRIDGE_SECRET",
  "CRON_SECRET",
];

export async function GET() {
  await connection(); // check live on every visit, not once at build time
  const settings = Object.fromEntries(SETTINGS.map((k) => [k, process.env[k] ? "set" : "MISSING"]));
  let database = "not checked";
  try {
    const { count, error } = await db().from("team_members").select("*", { count: "exact", head: true });
    database = error ? `error: ${error.message}` : `ok (${count ?? 0} team members)`;
  } catch (e) {
    database = `error: ${e instanceof Error ? e.message : String(e)}`;
  }
  // Sends no email: only checks the Apps Script bridge answers (docs/setup/gmail-bridge.md).
  const gmail_bridge = process.env.GMAIL_BRIDGE_URL ? await checkBridge() : "not set";
  return Response.json({ settings, database, gmail_bridge });
}
