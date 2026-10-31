// Pure helpers for the Capture screen: upload checks, the meeting title and the meeting date.

export const MAX_UPLOAD_BYTES = 200 * 1024;
export const ALLOWED_EXTENSIONS = [".txt", ".md"];

// Returns the reason a file can't be used, or null if it can.
export function uploadProblem(name: string, size: number): string | null {
  const lower = name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return `${name}: only .txt and .md files are supported. Word (.docx) files need to be saved as text first.`;
  }
  if (size > MAX_UPLOAD_BYTES) {
    return `${name}: larger than 200 KB. Split it into smaller files.`;
  }
  return null;
}

export function firstLine(text: string): string {
  return text.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Reads "9 Nov" or "Nov 9" from a line such as "Weekly call, 9 Nov". Returns YYYY-MM-DD, or null if the
// text has no complete date. The year is taken from `year` because transcripts rarely state it.
export function dateFromText(text: string, year: number): string | null {
  const month = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${month}\\b`, "i").exec(text);
  const monthFirst = new RegExp(`\\b${month}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i").exec(text);
  const match = dayFirst ?? monthFirst;
  if (!match) return null;

  const day = Number(dayFirst ? match[1] : match[2]);
  const monthName = (dayFirst ? match[2] : match[1]).slice(0, 3).toLowerCase();
  const monthIndex = MONTHS.indexOf(monthName);
  if (monthIndex < 0) return null;

  const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Reject impossible dates such as 31 Feb: the date must survive a round trip.
  const check = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(check.getTime()) || check.getUTCDate() !== day ? null : iso;
}
