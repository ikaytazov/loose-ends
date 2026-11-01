// Pure helpers for POST /api/team-members, kept apart so they can be tested without Supabase.

/** New teammates allowed per 24 hours. The app has no login yet, so this keeps abuse small. */
export const DAILY_NEW_MEMBER_LIMIT = 10;

/** Flags that stop meaning anything once a task has an owner. */
const OWNER_FLAGS = new Set(["no_owner", "new_person"]);

/** A task's flags after it is given an owner. */
export function flagsAfterAssign(flags: string[] | null): string[] {
  return (flags ?? []).filter((f) => !OWNER_FLAGS.has(f));
}
