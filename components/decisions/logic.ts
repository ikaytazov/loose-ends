// Pure helpers for the Decisions screen. The server does not check who decides yet (REPO-FACTS gap 1),
// so the screen itself must only offer the buttons to the approver.

// Only the approver can decide. With no approver on the row, nobody can, and the screen says so.
export function canDecide(me: string | null, approverId: string | null): boolean {
  return !!me && !!approverId && me === approverId;
}

// The spec's inference line: approving a date that reaches the workstream target leaves no buffer.
// Both dates are YYYY-MM-DD, so string comparison is the same as date comparison.
export function leavesNoBuffer(requested: string | null, target: string | null): boolean {
  return !!requested && !!target && requested >= target;
}

// Days between two YYYY-MM-DD dates, for "moves 3 days". Null if either is missing.
export function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}
