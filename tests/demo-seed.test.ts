// The reset button (POST /api/demo/reset) must load exactly what supabase/seed.sql loads. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addDays } from "@/lib/demo/reset";
import { ACTIVITY, MEETINGS, MEMBERS, TASKS, WORKSTREAMS } from "@/lib/demo/seed-data";

const seed = readFileSync("supabase/seed.sql", "utf8");
const sql = (s: string) => s.replace(/'/g, "''");

test("same team, emails and roles as seed.sql and test-data/team.json", () => {
  const team = JSON.parse(readFileSync("test-data/team.json", "utf8")) as { members: { name: string; email: string; role: string }[] };
  assert.deepEqual(MEMBERS.map((m) => [m.name, m.email, m.role]), team.members.map((m) => [m.name, m.email, m.role]));
  for (const m of MEMBERS) assert.ok(seed.includes(`('${m.name}', '${m.email}', '${m.role}')`), m.name);
});

test("same workstreams, meetings, tasks and activity as seed.sql", () => {
  for (const w of WORKSTREAMS) assert.ok(seed.includes(`('${w.name}', '${sql(w.goal)}', '${w.owner}', ${w.days})`), w.name);
  for (const m of MEETINGS) {
    assert.ok(seed.includes(`$notes$${m.notes}$notes$`), `${m.title} notes match`);
    assert.ok(seed.includes(`('${m.title}', current_date - ${m.daysAgo}, '{${m.attendees.join(",")}}'`), `${m.title} date and attendees`);
  }
  assert.equal(TASKS.length, (seed.match(/^  \('[^']+',\s*'(Product launch|Fundraising|Operations|Customer onboarding)',/gm) ?? []).length);
  for (const t of TASKS) {
    assert.ok(seed.includes(`'${sql(t.source)}'`), `source sentence: ${t.title}`);
    assert.ok(seed.includes(`'${sql(t.title)}'`), `title: ${t.title}`);
    if (t.blocker) assert.ok(seed.includes(`'${t.blocker}'`), `blocker: ${t.title}`);
  }
  for (const a of ACTIVITY) if (a.quote) assert.ok(seed.includes(`'${sql(a.quote)}'`), `quote: ${a.quote}`);
});

test("dates count calendar days from today", () => {
  assert.equal(addDays("2026-11-01", 7), "2026-11-08");
  assert.equal(addDays("2026-11-01", -5), "2026-10-27");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});
