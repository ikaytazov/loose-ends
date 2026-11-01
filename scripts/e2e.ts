// The demo path from issue #13, run through the real routes: paste notes → approve → send morning email →
// reply → board updates → approve the new date. Prints what broke and exits non-zero if anything did.
//
//   E2E_URL=https://<live app> E2E_MEMBER_EMAIL=<your team address> npm run e2e
//
// Uses .env.local for BRIDGE_SECRET and the Supabase read keys, and they must match the app being tested.
// It writes to that app's database: two "[E2E]" tasks stay on the board until the data is reset. It emails only
// E2E_MEMBER_EMAIL (morning email, confirmation, decision notice). The reply is posted to /api/inbound as the Gmail
// bridge would, so a reply from a real phone still needs testing by hand (docs/demo/e2e-check.md).
import { createClient } from "@supabase/supabase-js";
import type { ApproveMeetingResponse, DecideDateResponse, InboundResponse, PasteNotesResponse, SendMorningResponse } from "@/lib/contracts/api";
import type { DecisionNeededRow, Task, TaskBoardRow, TeamMember, Workstream } from "@/lib/contracts/domain";
import { orderForEmail, todayIn } from "@/lib/email/ordering";

const BOARD_WAIT_MS = 60_000; // issue #13: "board updates within a minute"

function setting(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing setting ${name}. See the top of scripts/e2e.ts.`);
  return v;
}

const baseUrl = setting("E2E_URL").replace(/\/+$/, "");
const memberEmail = setting("E2E_MEMBER_EMAIL").toLowerCase();
const sb = createClient(setting("NEXT_PUBLIC_SUPABASE_URL"), setting("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

async function call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; data: T }> {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) as T };
  } catch {
    throw new Error(`${method} ${path} did not answer with JSON (HTTP ${res.status}). Is E2E_URL the right app?`);
  }
}

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const { status, data } = await call<T>("POST", path, body, headers);
  if (status >= 400) throw new Error(`POST ${path} → ${status}: ${JSON.stringify(data)}`);
  return data;
}

async function read<T>(table: string, build: (q: ReturnType<ReturnType<typeof sb.from>["select"]>) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await build(sb.from(table).select("*"));
  if (error) throw new Error(`read ${table}: ${error.message}`);
  return (data ?? []) as T[];
}

function check(ok: unknown, what: string): asserts ok {
  if (!ok) throw new Error(what);
}

async function boardRow(id: string): Promise<TaskBoardRow> {
  const [row] = await read<TaskBoardRow>("task_board", (q) => q.eq("id", id));
  check(row, `Task ${id} is missing from task_board`);
  return row;
}

function plusDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

const steps: { name: string; run: () => Promise<string> }[] = [];
const step = (name: string, run: () => Promise<string>) => steps.push({ name, run });

// Filled in as the steps run; a failed step stops the rest, so each step can rely on the ones before it.
const today = todayIn(process.env.TEAM_TIMEZONE || "America/Los_Angeles");
const firstDue = plusDays(today, 3);
const newDue = plusDays(today, 10);
const stamp = new Date().toISOString().slice(0, 16);
let member: TeamMember;
let workstream: Workstream;
let meetingId: string;
let doneTask: Task;
let movedTask: Task;
let dateRequestId: string;
let approverId: string;

step("App is up", async () => {
  const { status, data } = await call<{ settings: Record<string, string>; database: string; gmail_bridge: string }>("GET", "/api/health");
  check(status === 200, `/api/health → ${status}`);
  const missing = Object.entries(data.settings).filter(([, v]) => v !== "set").map(([k]) => k);
  check(!missing.length, `Missing settings: ${missing.join(", ")}`);
  check(data.database.startsWith("ok"), `Database: ${data.database}`);
  check(data.gmail_bridge === "ok", `Gmail bridge: ${data.gmail_bridge}`);
  return data.database;
});

step("Team and workstreams load", async () => {
  const team = await read<TeamMember>("team_members", (q) => q);
  const found = team.find((m) => m.email.toLowerCase() === memberEmail);
  check(found, `${memberEmail} is not in team_members`);
  member = found;
  const [first] = await read<Workstream>("workstreams", (q) => q.order("name"));
  check(first, "No workstreams");
  workstream = first;
  return `${member.name}, ${workstream.name}`;
});

step("Paste notes", async () => {
  const name = member.name.split(" ")[0];
  const res = await post<PasteNotesResponse>("/api/notes", {
    title: `[E2E] Test meeting ${stamp}`,
    meeting_date: today,
    attendees: [name],
    notes: `${name} will write the [E2E] pricing summary by ${firstDue}.\n${name} will send the [E2E] partner list by ${firstDue}.`,
  });
  check(res.tasks.length >= 2, `Expected at least 2 proposed tasks, got ${res.tasks.length}`);
  check(res.tasks.every((t) => t.status === "proposed"), "New tasks should be proposed");
  meetingId = res.meeting_id;
  [doneTask, movedTask] = res.tasks;
  return `${res.tasks.length} proposed`;
});

step("Approve", async () => {
  const tasks = await read<Task>("tasks", (q) => q.eq("meeting_id", meetingId));
  check(tasks.length >= 2, "Proposed tasks are not readable");
  const keep = new Set([doneTask.id, movedTask.id]);
  const res = await post<ApproveMeetingResponse>(`/api/meetings/${meetingId}/approve`, {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title.startsWith("[E2E]") ? t.title : `[E2E] ${t.title}`,
      owner_id: member.id,
      workstream_id: workstream.id,
      due_date: firstDue,
      priority: "high",
      keep: keep.has(t.id),
    })),
  });
  check(res.approved === 2, `Expected 2 approved, got ${res.approved}`);
  const row = await boardRow(doneTask.id);
  check(row.status === "not_started", `Approved task is ${row.status}`);
  return `${res.approved} approved, ${res.removed} removed`;
});

step("Send morning email", async () => {
  const res = await post<SendMorningResponse & { failed?: { error: string }[] }>("/api/emails/send-morning", { member_id: member.id });
  check(res.sent === 1, `Not sent: ${JSON.stringify(res.failed ?? res)}`);
  return `sent to ${res.recipients.join(", ")}`;
});

step("Reply, and the board updates", async () => {
  // The numbers the person saw: the same ordering as the morning email.
  const open = orderForEmail(await read<Task>("tasks", (q) => q.eq("owner_id", member.id)), today);
  const number = (id: string) => open.findIndex((t) => t.id === id) + 1;
  const [a, b] = [number(doneTask.id), number(movedTask.id)];
  check(a > 0 && b > 0, "The new tasks are not in the person's open list");

  const res = await post<InboundResponse>(
    "/api/inbound",
    {
      gmail_message_id: `e2e-${Date.now()}`,
      from: member.email,
      to: setting("TEAM_EMAIL"),
      subject: "Re: Your open tasks",
      text: `${a} is done. ${b} needs until ${newDue}, waiting on finance.`,
      received_at: new Date().toISOString(),
    },
    { "x-bridge-secret": setting("BRIDGE_SECRET") },
  );
  check(res.status === "applied", `Reply status: ${res.status}`);

  const started = Date.now();
  for (;;) {
    const [done, moved] = await Promise.all([boardRow(doneTask.id), boardRow(movedTask.id)]);
    if (done.status === "done" && moved.pending_requested_due_date === newDue) {
      check(moved.due_date === firstDue, `Due date moved without approval: ${moved.due_date}`);
      check(moved.pending_date_request_id, "No pending date request id");
      dateRequestId = moved.pending_date_request_id;
      return `updated in ${Math.round((Date.now() - started) / 1000)}s, date still ${moved.due_date}`;
    }
    if (Date.now() - started > BOARD_WAIT_MS) throw new Error(`After 60s: task ${a} is ${done.status}, requested date ${moved.pending_requested_due_date}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
});

step("New date is in Needs your decision", async () => {
  const [row] = await read<DecisionNeededRow>("decisions_needed", (q) => q.eq("decision_id", dateRequestId));
  check(row, "Date request is not in decisions_needed");
  check(row.approver_id, "Date request has no approver");
  approverId = row.approver_id;
  return `approver ${approverId}`;
});

step("Approve the new date", async () => {
  const path = `/api/date-requests/${dateRequestId}/decide`;
  const body = { decision: "approved", decided_by: approverId };
  const res = await post<DecideDateResponse>(path, body);
  check(res.task.due_date === newDue, `Due date is ${res.task.due_date}, expected ${newDue}`);
  const row = await boardRow(movedTask.id);
  check(row.due_date === newDue, `Board shows ${row.due_date}, expected ${newDue}`);
  const again = await call("POST", path, body);
  check(again.status === 409, `A second decision should be 409, got ${again.status}`);
  return `moved to ${newDue}, second decision refused`;
});

async function main() {
  console.log(`Testing ${baseUrl}\n`);
  for (const { name, run } of steps) {
    try {
      console.log(`PASS  ${name}: ${await run()}`);
    } catch (e) {
      console.log(`FAIL  ${name}: ${e instanceof Error ? e.message : String(e)}`);
      console.log("\nStopped here. Post this in the group chat or open a new issue.");
      process.exitCode = 1;
      return;
    }
  }
  console.log("\nAll steps passed. Now reply from a phone by hand (docs/demo/e2e-check.md).");
}

void main();
