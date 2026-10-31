// Tests for reply handling, run with `npm test`. Uses an in-memory database and a fake AI,
// so it needs no keys. The scenario is step 4–5 of the demo story in docs/spec-v5.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { DateRequest, Task, TeamMember, Workstream } from "@/lib/contracts/domain";
import type { ReplyParse } from "@/lib/contracts/ai";
import { handleInbound } from "@/lib/replies/handle";
import type { ReplyParser } from "@/lib/replies/parse";
import { buildUserMessage } from "@/lib/replies/parse";
import type { NewActivity, ReplyRepo } from "@/lib/replies/repo";
import { pickApprover } from "@/lib/replies/approver";
import { findReplyCode, replyAddress, stripQuoted, bareAddress } from "@/lib/email/address";
import { orderForEmail } from "@/lib/email/ordering";

const MAYA = "m-maya", PRIYA = "m-priya", JORDAN = "m-jordan";

function makeWorld() {
  const members: TeamMember[] = [
    { id: MAYA, name: "Maya", email: "maya@x.com", role: "lead", avatar_url: null, created_at: "" },
    { id: PRIYA, name: "Priya", email: "priya@x.com", role: "member", avatar_url: null, created_at: "" },
    { id: JORDAN, name: "Jordan", email: "jordan@x.com", role: "member", avatar_url: null, created_at: "" },
  ];
  const workstreams: Workstream[] = [
    { id: "w-launch", name: "Product launch", goal: null, owner_id: PRIYA, target_date: null, created_at: "" },
    { id: "w-onb", name: "Customer onboarding", goal: null, owner_id: JORDAN, target_date: null, created_at: "" },
  ];
  const task = (id: string, title: string, ws: string, owner: string, due: string, priority: Task["priority"], status: Task["status"]): Task => ({
    id, title, workstream_id: ws, meeting_id: null, owner_id: owner, due_date: due, priority, status, blocker: null,
    source_sentence: null, flags: [], completed_at: null, created_at: "", updated_at: "",
  });
  const tasks: Task[] = [
    task("t-pricing", "Launch the new pricing page", "w-launch", PRIYA, "2026-11-05", "high", "in_progress"),
    task("t-deck", "Finish the partner deck", "w-launch", PRIYA, "2026-11-05", "high", "not_started"),
    task("t-faq", "Draft FAQ for support", "w-onb", PRIYA, "2026-11-09", "medium", "not_started"),
  ];
  const emails: { id: string; gmail_message_id?: string; processed?: boolean; processing_error?: string | null; reply_code?: string; member_id: string | null; task_refs: { n: number; task_id: string }[] | null; kind: string }[] = [
    { id: "e-morning", reply_code: "abc123", member_id: PRIYA, kind: "morning",
      task_refs: [{ n: 1, task_id: "t-pricing" }, { n: 2, task_id: "t-deck" }, { n: 3, task_id: "t-faq" }] },
  ];
  const dateRequests: DateRequest[] = [];
  const log: NewActivity[] = [];

  const repo: ReplyRepo = {
    async findMemberByEmail(e) { return members.find((m) => m.email === e.toLowerCase()) ?? null; },
    async findLead() { return members.find((m) => m.role === "lead") ?? null; },
    async findMorningEmailByCode(c) { const e = emails.find((x) => x.reply_code === c); return e ? { id: e.id, member_id: e.member_id, task_refs: e.task_refs } : null; },
    async latestMorningEmailFor(id) { const e = emails.filter((x) => x.member_id === id && x.kind === "morning").at(-1); return e ? { id: e.id, member_id: e.member_id, task_refs: e.task_refs } : null; },
    async getTasks(ids) { return tasks.filter((t) => ids.includes(t.id)); },
    async getOpenTasksForOwner(id) { return tasks.filter((t) => t.owner_id === id && !["done", "proposed"].includes(t.status)); },
    async getWorkstream(id) { return workstreams.find((w) => w.id === id) ?? null; },
    async insertInboundEmail(row) {
      if (emails.some((e) => e.gmail_message_id === row.gmail_message_id)) return "duplicate";
      const id = "e-in-" + emails.length;
      emails.push({ id, gmail_message_id: row.gmail_message_id, member_id: row.member_id, task_refs: null, kind: "reply" });
      return { id };
    },
    async updateTask(id, patch) { Object.assign(tasks.find((t) => t.id === id)!, patch); },
    async upsertWaitingDateRequest(row) {
      const existing = dateRequests.find((d) => d.task_id === row.task_id && d.status === "waiting");
      if (existing) Object.assign(existing, row);
      else dateRequests.push({ ...row, id: "d" + dateRequests.length, status: "waiting", decided_at: null, created_at: "" });
    },
    async log(entries) { log.push(...entries); },
    async markEmailProcessed(id, err) { const e = emails.find((x) => x.id === id)!; e.processed = err === null; e.processing_error = err; },
  };
  return { repo, tasks, dateRequests, log, emails };
}

const fakeAI = (out: ReplyParse): ReplyParser => async () => out;

const priyaReply = {
  gmail_message_id: "g1",
  from: "Priya <priya@x.com>",
  to: "signalridgeco+le-abc123@gmail.com",
  subject: "Re: Your 3 open tasks",
  text: "Pricing page is live. The partner deck needs until next Wednesday, I'm waiting on numbers from finance.\n\nOn Tue, Nov 3, 2026 at 8:00 AM Loose Ends <signalridgeco@gmail.com> wrote:\n> Good morning Priya.",
  received_at: "2026-11-03T16:15:00Z",
};

const demoParse: ReplyParse = {
  changes: [
    { task_number: 1, new_status: "done", blocker: null, requested_due_date: null, reason: null, quote: "Pricing page is live.", confidence: "sure" },
    { task_number: 2, new_status: "blocked", blocker: "numbers from finance", requested_due_date: "2026-11-11", reason: "waiting on finance", quote: "The partner deck needs until next Wednesday, I'm waiting on numbers from finance.", confidence: "sure" },
  ],
  question: null,
};

test("demo story: one reply finishes one task and asks for a new date on another", async () => {
  const w = makeWorld();
  const res = await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03" });
  assert.equal(res.status, "applied");

  const pricing = w.tasks.find((t) => t.id === "t-pricing")!;
  const deck = w.tasks.find((t) => t.id === "t-deck")!;
  assert.equal(pricing.status, "done");
  assert.equal(deck.status, "blocked");
  assert.equal(deck.blocker, "numbers from finance");
  assert.equal(deck.due_date, "2026-11-05", "due date must NOT move from a reply");

  assert.equal(w.dateRequests.length, 1);
  assert.equal(w.dateRequests[0].requested_due_date, "2026-11-11");
  assert.equal(w.dateRequests[0].approver_id, MAYA, "Priya owns Product launch, so the request goes to the lead");

  assert.ok(w.log.every((l) => l.source === "email" && l.actor_id === PRIYA));
  assert.deepEqual(w.log.map((l) => l.field).sort(), ["blocker", "date_request", "status", "status"]);
  assert.equal(w.emails.find((e) => e.gmail_message_id === "g1")!.processed, true);
});

test("the same email delivered twice is only applied once", async () => {
  const w = makeWorld();
  await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03" });
  const again = await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03" });
  assert.equal(again.status, "duplicate");
  assert.equal(w.dateRequests.length, 1);
});

test("date request for someone else's workstream goes to that workstream's owner", async () => {
  const w = makeWorld();
  await handleInbound(w.repo, fakeAI({ changes: [{ task_number: 3, new_status: "unchanged", blocker: null, requested_due_date: "2026-11-12", reason: null, quote: "3 needs till Thursday", confidence: "sure" }], question: null }), priyaReply, { today: "2026-11-03" });
  assert.equal(w.dateRequests[0].approver_id, JORDAN);
});

test("unsure changes are logged, not applied, and the question is returned", async () => {
  const w = makeWorld();
  const res = await handleInbound(w.repo, fakeAI({ changes: [{ task_number: 2, new_status: "done", blocker: null, requested_due_date: null, reason: null, quote: "that one's sorted", confidence: "unsure" }], question: "Which task is sorted: the partner deck or the FAQ?" }), priyaReply, { today: "2026-11-03" });
  assert.equal(w.tasks.find((t) => t.id === "t-deck")!.status, "not_started");
  assert.equal(w.log[0].field, "unclear");
  assert.equal(res.question, "Which task is sorted: the partner deck or the FAQ?");
});

test("unknown sender is recorded and ignored", async () => {
  const w = makeWorld();
  const res = await handleInbound(w.repo, fakeAI(demoParse), { ...priyaReply, gmail_message_id: "g9", from: "stranger@y.com" }, { today: "2026-11-03" });
  assert.equal(res.status, "unknown_sender");
  assert.equal(w.tasks.find((t) => t.id === "t-pricing")!.status, "in_progress");
});

test("without a reply code, the sender's latest morning email is used", async () => {
  const w = makeWorld();
  const res = await handleInbound(w.repo, fakeAI(demoParse), { ...priyaReply, to: "signalridgeco@gmail.com" }, { today: "2026-11-03" });
  assert.equal(res.status, "applied");
  assert.equal(w.tasks.find((t) => t.id === "t-pricing")!.status, "done");
});

test("the AI sees only the new text and a calendar", () => {
  const msg = buildUserMessage({ replyText: stripQuoted(priyaReply.text), receivedDate: "2026-11-03", tasks: [{ n: 1, title: "A", status: "in_progress", due_date: null, priority: "high" }] });
  assert.ok(msg.includes("2026-11-11 Wednesday"));
  assert.ok(!msg.includes("Good morning Priya"));
});

test("helpers", () => {
  assert.equal(findReplyCode('"Loose Ends" <signalridgeco+le-abc123@gmail.com>'), "abc123");
  assert.equal(replyAddress("signalridgeco@gmail.com", "xyz"), "signalridgeco+le-xyz@gmail.com");
  assert.equal(bareAddress("Priya Shah <Priya@X.com>"), "priya@x.com");
  assert.equal(stripQuoted("Done!\n\nSent from my iPhone\n\nOn Tue wrote:\n> hi"), "Done!");
  assert.equal(pickApprover({ requesterId: "a", workstreamOwnerId: "a", leadId: "l" }), "l");
  assert.equal(pickApprover({ requesterId: "a", workstreamOwnerId: "b", leadId: "l" }), "b");
  const ordered = orderForEmail(
    [
      { title: "low later", priority: "low", due_date: "2026-11-20", status: "not_started" },
      { title: "overdue", priority: "low", due_date: "2026-11-01", status: "in_progress" },
      { title: "high", priority: "high", due_date: "2026-11-10", status: "not_started" },
      { title: "done", priority: "high", due_date: "2026-11-01", status: "done" },
    ] as Task[],
    "2026-11-03",
  );
  assert.deepEqual(ordered.map((t) => t.title), ["overdue", "high", "low later"]);
});
