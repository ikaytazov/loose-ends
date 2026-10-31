// Server-only settings. Values come from .env.local (on a laptop) or Vercel → Settings → Environment Variables.
// Never import this file from a screen/component: it reads secret keys.

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing setting ${name}. Add it to .env.local (see .env.example) or to Vercel.`);
  return v;
}

export const env = {
  supabaseUrl: () => need("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceKey: () => need("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicKey: () => need("ANTHROPIC_API_KEY"),
  anthropicModel: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  teamEmail: () => need("TEAM_EMAIL"), // e.g. signalridgeco@gmail.com
  gmailBridgeUrl: () => need("GMAIL_BRIDGE_URL"), // Apps Script web app URL (docs/setup/gmail-bridge.md)
  bridgeSecret: () => need("BRIDGE_SECRET"), // shared secret between the app and the Apps Script
  timezone: () => process.env.TEAM_TIMEZONE || "America/Los_Angeles",
};
