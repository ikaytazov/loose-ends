// Dates and times. Plain dates (YYYY-MM-DD) are shown as written; timestamps are shown in Pacific time,
// because the morning email runs on America/Los_Angeles (TEAM_TIMEZONE in .env.example).

const PACIFIC = "America/Los_Angeles";

// "Mon 9 Nov" from "2026-11-09". Parsed as UTC so the day never shifts.
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "No date";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// "9 Nov, 15:15 PT" from an ISO timestamp.
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Unknown time";
  const text = new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: PACIFIC });
  return `${text} PT`;
}

// Whole days from an ISO timestamp to now, never negative.
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
