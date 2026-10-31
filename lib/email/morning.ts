// Agreement C: the words of the morning email. Pure functions, so they can be tested without keys.
import type { Task } from "@/lib/contracts/domain";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

/** Read YYYY-MM-DD as a calendar day (noon UTC, so no time zone can shift it). */
function day(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function daysBetween(from: string, to: string): number {
  return Math.round((day(to).getTime() - day(from).getTime()) / 86_400_000);
}

export function weekdayOf(iso: string): string {
  return WEEKDAYS[day(iso).getUTCDay()];
}

function shortDate(iso: string): string {
  const d = day(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "due today", "due Thursday", "due next Monday", "due Nov 20", "overdue (was due Nov 2)", "no due date". */
export function dueText(due: string | null, today: string): string {
  if (!due) return "no due date";
  const diff = daysBetween(today, due);
  if (diff < 0) return `overdue (was due ${shortDate(due)})`;
  if (diff === 0) return "due today";
  if (diff === 1) return "due tomorrow";
  if (diff <= 6) {
    // Same Monday–Sunday week → "Thursday"; the following week → "next Monday".
    const mondayIndex = (d: string) => (day(d).getUTCDay() + 6) % 7;
    const sameWeek = mondayIndex(due) > mondayIndex(today);
    return `due ${sameWeek ? "" : "next "}${weekdayOf(due)}`;
  }
  return `due ${shortDate(due)}`;
}

/** Must contain "open tasks": the Gmail bridge only picks up replies with these words. */
export function morningSubject(count: number, today: string): string {
  const wd = weekdayOf(today);
  return count === 1 ? `Your open tasks for ${wd}: just 1` : `Your ${count} open tasks for ${wd}`;
}

/** Tasks must already be in orderForEmail() order: line n here is task_refs n. */
export function morningBody(
  name: string,
  tasks: Pick<Task, "title" | "priority" | "due_date" | "workstream_id">[],
  workstreamNames: Map<string, string>,
  today: string,
): string {
  const first = name.trim().split(/\s+/)[0] || name;
  const count = tasks.length === 1 ? "1 open task" : `${tasks.length} open tasks, most urgent first`;
  const lines = tasks.map((t, i) => {
    const ws = t.workstream_id ? workstreamNames.get(t.workstream_id) : undefined;
    return [`${i + 1}. ${PRIORITY_LABEL[t.priority]}`, t.title, ws, dueText(t.due_date, today)].filter(Boolean).join(" – ");
  });
  return [
    `Good morning ${first}. You have ${count}.`,
    "",
    ...lines,
    "",
    `Just reply in your own words, for example "1 is done" or "2 needs until Friday, waiting on finance".`,
  ].join("\n");
}
