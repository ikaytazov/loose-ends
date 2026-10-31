// Agreement C: the order tasks appear in the morning email, and therefore what "task 2" means.
// The morning email (sender) and the reply reader (receiver) MUST both use this function.
import type { Task } from "@/lib/contracts/domain";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

export function isOpen(t: Pick<Task, "status">): boolean {
  return t.status !== "done" && t.status !== "proposed";
}

/** Overdue first, then by priority, then by due date (no date last), then by title. */
export function orderForEmail<T extends Pick<Task, "due_date" | "priority" | "title" | "status">>(tasks: T[], today: string): T[] {
  return tasks.filter(isOpen).sort((a, b) => {
    const ao = a.due_date !== null && a.due_date < today ? 0 : 1;
    const bo = b.due_date !== null && b.due_date < today ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const ap = PRIORITY_RANK[a.priority], bp = PRIORITY_RANK[b.priority];
    if (ap !== bp) return ap - bp;
    const ad = a.due_date ?? "9999-12-31", bd = b.due_date ?? "9999-12-31";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** Today's date (YYYY-MM-DD) in the team's time zone. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
