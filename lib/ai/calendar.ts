// A calendar for the AI, with the meaning of day words worked out here in code (not by the AI):
//   "Wednesday" / "this Wednesday" / "by Wednesday" = the first Wednesday after the start date
//   "next Wednesday" = the Wednesday of the following week (weeks run Monday–Sunday)
//   "end of week" / "this week" = the Friday of the start date's week
//   "end of month" = the last day of the start date's month
// Examples: from Fri 30 Oct, "next Wednesday" = 4 Nov. From Tue 3 Nov, "next Wednesday" = 11 Nov.
//
// Used by both AI steps: reading replies (start = the day the reply arrived) and reading meeting notes
// (start = the meeting date).

export interface CalendarOptions {
  /** How the first day is described, e.g. "reply date" or "meeting date". */
  startLabel?: string;
  /** Add "next week" = Monday of the following week. Replies: yes ("need until next week").
   *  Meeting notes: no — a vague "next wk" is treated as no date. */
  nextWeekAsDate?: boolean;
  days?: number;
}

const DAY = 86400000;

export function calendar(fromDate: string, opts: CalendarOptions = {}): string {
  const { startLabel = "reply date", nextWeekAsDate = true, days = 35 } = opts;
  const start = new Date(fromDate + "T12:00:00Z");
  const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const mondayIndex = (d: Date) => (d.getUTCDay() + 6) % 7; // Monday = 0
  const nextWeekStart = new Date(start.getTime() + (7 - mondayIndex(start)) * DAY);
  const nextWeekEnd = new Date(nextWeekStart.getTime() + 6 * DAY);
  const fridayIdx = mondayIndex(start) <= 4 ? 4 - mondayIndex(start) : -1; // days until this week's Friday
  const monthEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 12));

  const seen = new Set<string>();
  const lines: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY);
    const wd = weekday(d);
    const labels: string[] = [];
    if (i === 0) labels.push(`${startLabel}, "today"`);
    if (i === 1) labels.push(`"tomorrow"`);
    if (i > 0 && !seen.has(wd)) {
      seen.add(wd);
      labels.push(`"${wd}", "this ${wd}", "by ${wd}"`);
    }
    if (i === fridayIdx) labels.push(`"end of week", "this week"`);
    if (d >= nextWeekStart && d <= nextWeekEnd) labels.push(`"next ${wd}"`);
    if (nextWeekAsDate && d.getTime() === nextWeekStart.getTime()) labels.push(`"next week"`);
    if (d.getTime() === monthEnd.getTime()) labels.push(`"end of month"`);
    lines.push(`${d.toISOString().slice(0, 10)} ${wd}${labels.length ? "  = " + labels.join(", ") : ""}`);
  }
  return lines.join("\n");
}
