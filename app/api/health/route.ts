// GET /api/health — open this in a browser to check the app can reach the database and has its settings.
import { connection } from "next/server";
import { db } from "@/lib/server/supabase";

const SETTINGS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "TEAM_EMAIL",
  "GMAIL_BRIDGE_URL",
  "BRIDGE_SECRET",
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
  return Response.json({ settings, database });
}
