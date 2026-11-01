// Tests for reply handling, run with `npm test`. Uses an in-memory database and a fake AI,
// so it needs no keys. The scenario is step 4–5 of the demo story in docs/spec-v5.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { DateRequest, Task, TeamMember, Workstream } from "@/lib/contracts/domain";
import { ReplyParse } from "@/lib/contracts/ai";
import { handleInbound } from "@/lib/replies/handle";
import { loadReplyPage, submitReplyPage } from "@/lib/replies/page";
import type { ReplyParser } from "@/lib/replies/parse";
import { buildUserMessage, calendar, readStructured } from "@/lib/replies/parse";
import type { NewActivity, ReplyRepo } from "@/lib/replies/repo";
import { pickApprover } from "@/lib/replies/approver";
import { findReplyCode, replyAddress, stripQuoted, bareAddress, mailboxKey } from "@/lib/email/address";
import { orderForEmail } from "@/lib/email/ordering";
import { buildFollowUp, confirmationLine, isAutoReply, shortDate, FALLBACK_QUESTION, type FollowUp } from "@/lib/replies/follow-up";

const MAYA = "m-maya", PRIYA = "m-priya", JORDAN = "m-jordan";

function makeWorld(addr: { maya?: string; priya?: string; jordan?: string } = {}) {
  const members: TeamMember[] = [
    { id: MAYA, name: "Maya", email: addr.maya ?? "maya@x.com", role: "lead", avatar_url: null, created_at: "" },
    { id: PRIYA, name: "Priya", email: addr.priya ?? "priya@x.com", role: "member", avatar_url: null, created_at: "" },
    { id: JORDAN, name: "Jordan", email: addr.jordan ?? "jordan@x.com", role: "member", avatar_url: null, created_at: "" },
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
    async getMember(id) { return members.find((m) => m.id === id) ?? null; },
    async findMorningEmailByCode(c) { const e = emails.find((x) => x.reply_code === c); return e ? { id: e.id, member_id: e.member_id, task_refs: e.task_refs } : null; },
    async latestMorningEmailFor(id) { const e = emails.filter((x) => x.member_id === id && x.kind === "morning").at(-1); return e ? { id: e.id, member_id: e.member_id, task_refs: e.task_refs } : null; },
    async getTasks(ids) { return tasks.filter((t) => ids.includes(t.id)); },
    async getOpenTasksForOwner(id) { return tasks.filter((t) => t.owner_id === id && !["done", "proposed"].includes(t.status)); },
    async getWorkstream(id) { return workstreams.find((w) => w.id === id) ?? null; },
    async insertInboundEmail(row) {
      const prev = emails.find((e) => e.gmail_message_id === row.gmail_message_id);
      if (prev) return { id: prev.id, alreadyProcessed: prev.processed === true };
      const id = "e-in-" + emails.length;
      emails.push({ id, gmail_message_id: row.gmail_message_id, member_id: row.member_id, task_refs: null, kind: "reply" });
      return { id, alreadyProcessed: false };
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

test("an email that failed is tried again on the next delivery", async () => {
  const w = makeWorld();
  const broken: ReplyParser = async () => { throw new Error("AI unavailable"); };
  const first = await handleInbound(w.repo, broken, priyaReply, { today: "2026-11-03" });
  assert.equal(first.status, "error");
  assert.equal(w.tasks.find((t) => t.id === "t-pricing")!.status, "in_progress");
  const second = await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03" });
  assert.equal(second.status, "applied");
  assert.equal(w.tasks.find((t) => t.id === "t-pricing")!.status, "done");
});

test("AI answer is read from a tool call or from plain JSON text", () => {
  const viaTool = readStructured([{ type: "tool_use", id: "x", name: "record_updates", input: demoParse } as never], ReplyParse);
  assert.equal(viaTool.changes.length, 2);
  const viaText = readStructured([{ type: "text", text: "Here you go:\n" + JSON.stringify(demoParse) } as never], ReplyParse);
  assert.equal(viaText.changes[1].requested_due_date, "2026-11-11");
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

test("calendar labels: 'next Wednesday' depends on the reply day", () => {
  const line = (cal: string, phrase: string) => cal.split("\n").find((l) => l.includes(phrase))!.slice(0, 10);
  const friday = calendar("2026-10-30"); // Fri
  assert.equal(line(friday, '"next Wednesday"'), "2026-11-04");
  assert.equal(line(friday, '"Wednesday"'), "2026-11-04");
  assert.equal(line(friday, '"by Monday"'), "2026-11-02");
  const tuesday = calendar("2026-11-03"); // Tue
  assert.equal(line(tuesday, '"next Wednesday"'), "2026-11-11");
  assert.equal(line(tuesday, '"this Wednesday"'), "2026-11-04");
  assert.equal(line(tuesday, '"by Friday"'), "2026-11-06");
  assert.equal(line(tuesday, '"next week"'), "2026-11-09");
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

// ---------- Confirmation and clarifying emails (issue #15) ----------

function capture() {
  const sent: FollowUp[] = [];
  return { sent, notify: async (m: FollowUp) => { sent.push(m); } };
}

test("an applied reply gets a one-line confirmation", async () => {
  const w = makeWorld();
  const box = capture();
  await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03", notify: box.notify });
  assert.equal(box.sent.length, 1);
  const m = box.sent[0];
  assert.equal(m.kind, "confirmation");
  assert.equal(m.to, "priya@x.com");
  assert.ok(m.subject.includes("Loose Ends"), "the bridge only picks up replies whose subject says Loose Ends");
  assert.equal(
    m.text.split("\n")[0],
    'Marked "Launch the new pricing page" as done; marked "Finish the partner deck" as blocked (waiting on numbers from finance); asked Maya to move "Finish the partner deck" to Wed 11 Nov.',
  );
  assert.deepEqual(m.task_refs, [{ n: 1, task_id: "t-pricing" }, { n: 2, task_id: "t-deck" }, { n: 3, task_id: "t-faq" }]);
});

test("a question from the reply reader is emailed instead of a confirmation", async () => {
  const w = makeWorld();
  const box = capture();
  await handleInbound(w.repo, fakeAI({ changes: [{ task_number: 2, new_status: "done", blocker: null, requested_due_date: null, reason: null, quote: "that one's sorted", confidence: "unsure" }], question: "Which task is sorted: the partner deck or the FAQ?" }), priyaReply, { today: "2026-11-03", notify: box.notify });
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0].kind, "question");
  assert.ok(box.sent[0].subject.includes("Loose Ends"));
  assert.ok(box.sent[0].text.startsWith("Hi Priya. Which task is sorted: the partner deck or the FAQ?"));
  assert.ok(box.sent[0].text.includes("2. Finish the partner deck"), "lists the numbered tasks so they can answer by number");
});

test("a reply with nothing understood gets a short clarifying question", () => {
  const f = buildFollowUp({ to: "p@x.com", member_id: PRIYA, memberName: "Priya", in_reply_to_email_id: "e1", numbered: [], items: [], question: null });
  assert.equal(f.kind, "question");
  assert.ok(f.text.includes(FALLBACK_QUESTION));
});

test("no follow-up for duplicates, unknown senders, errors or automatic replies", async () => {
  const w = makeWorld();
  const box = capture();
  await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03", notify: box.notify });
  await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03", notify: box.notify });
  await handleInbound(w.repo, fakeAI(demoParse), { ...priyaReply, gmail_message_id: "g8", from: "stranger@y.com" }, { today: "2026-11-03", notify: box.notify });
  await handleInbound(w.repo, async () => { throw new Error("AI down"); }, { ...priyaReply, gmail_message_id: "g7" }, { today: "2026-11-03", notify: box.notify });
  await handleInbound(w.repo, fakeAI(demoParse), { ...priyaReply, gmail_message_id: "g6", subject: "Automatic reply: Re: Loose Ends: quick question" }, { today: "2026-11-03", notify: box.notify });
  assert.equal(box.sent.length, 1);
});

test("a failed follow-up send does not undo the update", async () => {
  const w = makeWorld();
  const res = await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03", notify: async () => { throw new Error("Gmail down"); } });
  assert.equal(res.status, "applied");
  assert.equal(w.tasks.find((t) => t.id === "t-pricing")!.status, "done");
});

test("the reply page lists the morning email's tasks in order", async () => {
  const w = makeWorld();
  const page = await loadReplyPage(w.repo, "abc123");
  assert.equal(page?.name, "Priya");
  assert.deepEqual(page?.tasks.map((t) => [t.n, t.title]), [[1, "Launch the new pricing page"], [2, "Finish the partner deck"], [3, "Draft FAQ for support"]]);
  assert.equal(await loadReplyPage(w.repo, "nope"), null);
});

test("'1 is done' on the reply page updates the board like an email, logged as reply_page", async () => {
  const w = makeWorld();
  const parse = fakeAI({ changes: [{ task_number: 1, new_status: "done", blocker: null, requested_due_date: null, reason: null, quote: "1 is done", confidence: "sure" }], question: null });
  const res = await submitReplyPage(w.repo, parse, "abc123", "1 is done", { today: "2026-11-03" });
  assert.equal(res?.status, "applied");
  assert.equal(w.tasks.find((t) => t.id === "t-pricing")!.status, "done");
  assert.ok(w.log.length > 0 && w.log.every((l) => l.source === "reply_page"));
});

test("a date asked for on the reply page still waits for approval", async () => {
  const w = makeWorld();
  const res = await submitReplyPage(w.repo, fakeAI(demoParse), "abc123", "whatever", { today: "2026-11-03" });
  assert.equal(res?.status, "applied");
  assert.equal(w.tasks.find((t) => t.id === "t-deck")!.due_date, "2026-11-05");
  assert.equal(w.dateRequests.length, 1);
});

test("two identical updates on the reply page are both handled, and an unknown code changes nothing", async () => {
  const w = makeWorld();
  const parse = fakeAI({ changes: [], question: null });
  assert.equal((await submitReplyPage(w.repo, parse, "abc123", "1 is done", { today: "2026-11-03" }))?.status, "applied");
  assert.equal((await submitReplyPage(w.repo, parse, "abc123", "1 is done", { today: "2026-11-03" }))?.status, "applied");
  assert.equal(await submitReplyPage(w.repo, parse, "nope", "1 is done", { today: "2026-11-03" }), null);
});

test("follow-up wording helpers", () => {
  assert.equal(shortDate("2026-11-04"), "Wed 4 Nov");
  assert.equal(confirmationLine([]), null);
  assert.equal(confirmationLine([{ type: "date_request", title: "Partner deck", date: "2026-11-04", approverName: "Maya" }]), 'Asked Maya to move "Partner deck" to Wed 4 Nov.');
  assert.ok(isAutoReply("Out of Office: Re: Your 3 open tasks"));
  assert.ok(!isAutoReply("Re: Your 3 open tasks for Tuesday"));
});

// ---------- Approver notice (issue #16) ----------
import { approverBody, approverSubject, decisionsUrl, type ApproverNotice } from "@/lib/email/approver-notice";

function captureNotices() {
  const sent: ApproverNotice[] = [];
  return { sent, notifyApprover: async (n: ApproverNotice) => { sent.push(n); } };
}

const change = (task_number: number, requested_due_date: string, reason: string | null) => ({
  task_number, new_status: "unchanged" as const, blocker: null, requested_due_date, reason, quote: "need more time", confidence: "sure" as const,
});

test("the demo reply emails Maya about the partner deck, once", async () => {
  const w = makeWorld();
  const box = captureNotices();
  await handleInbound(w.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03", notifyApprover: box.notifyApprover });
  assert.equal(box.sent.length, 1);
  const n = box.sent[0];
  assert.equal(n.to, "maya@x.com", "Priya owns Product launch herself, so the lead decides");
  assert.equal(n.requesterName, "Priya");
  assert.deepEqual(n.requests.map((r) => [r.title, r.currentDueDate, r.requestedDueDate]), [["Finish the partner deck", "2026-11-05", "2026-11-11"]]);
});

test("a request on another person's workstream goes to that owner; two requests to one approver make one email", async () => {
  const w = makeWorld();
  const box = captureNotices();
  // 1 = pricing page and 2 = partner deck (Product launch: Maya decides), 3 = FAQ (Customer onboarding: Jordan decides).
  await handleInbound(w.repo, fakeAI({ changes: [change(1, "2026-11-06", null), change(2, "2026-11-11", "numbers from finance"), change(3, "2026-11-12", "waiting on pricing")], question: null }), priyaReply, {
    today: "2026-11-03",
    notifyApprover: box.notifyApprover,
  });
  const byTo = Object.fromEntries(box.sent.map((n) => [n.to, n.requests.map((r) => r.title)]));
  assert.deepEqual(byTo, { "maya@x.com": ["Launch the new pricing page", "Finish the partner deck"], "jordan@x.com": ["Draft FAQ for support"] });
});

test("no approver email without a date request, and a failed send never undoes the request", async () => {
  const w = makeWorld();
  const box = captureNotices();
  await handleInbound(w.repo, fakeAI({ changes: [{ ...change(1, "2026-11-05", null), requested_due_date: null, new_status: "done" }], question: null }), priyaReply, { today: "2026-11-03", notifyApprover: box.notifyApprover });
  assert.equal(box.sent.length, 0);

  const w2 = makeWorld();
  const res = await handleInbound(w2.repo, fakeAI(demoParse), priyaReply, { today: "2026-11-03", notifyApprover: async () => { throw new Error("Gmail down"); } });
  assert.equal(res.status, "applied");
  assert.equal(w2.dateRequests.length, 1);
});

test("approver email wording: links to Decisions, never looks like a reply the bridge would read", () => {
  const notice = { approverName: "Maya Chen", requesterName: "Priya Shah", requests: [{ task_id: "t", title: "Finish the partner deck", currentDueDate: "2026-11-05", requestedDueDate: "2026-11-11", reason: "numbers from finance" }] };
  const subject = approverSubject(notice.requesterName, 1);
  assert.equal(subject, "Decision needed: Priya asked for more time");
  assert.ok(!/open tasks|loose ends/i.test(subject), "the Gmail bridge must not pick up replies to this email");
  assert.equal(approverSubject("Priya Shah", 2), "Decision needed: Priya asked for more time on 2 tasks");
  const body = approverBody(notice, "https://le.example/decisions");
  assert.ok(body.startsWith("Hi Maya.\n\nPriya asked to move \"Finish the partner deck\" from Thu 5 Nov to Wed 11 Nov.\nReason: numbers from finance.\nThe date stays Thu 5 Nov until you decide."));
  assert.ok(body.includes("Approve or decline here: https://le.example/decisions"));
  assert.ok(approverBody(notice, null).includes("on the Decisions page in Loose Ends"));
  assert.equal(decisionsUrl({ APP_URL: "https://le.example/" }), "https://le.example/decisions");
  assert.equal(decisionsUrl({ VERCEL_PROJECT_PRODUCTION_URL: "loose-ends.vercel.app" }), "https://loose-ends.vercel.app/decisions");
  assert.equal(decisionsUrl({}), null);
});

// ---- Sender matching (Sat night demo bug: Gmail ignores dots, and all characters share one inbox) ----

const demoInbox = { maya: "abiralameddine+maya@gmail.com", priya: "abiralameddine@gmail.com", jordan: "abiralameddine+jordan@gmail.com" };

test("mailboxKey: Gmail dots and +tags reach the same mailbox", () => {
  assert.equal(mailboxKey("Abir <abir.alameddine@gmail.com>"), "abiralameddine@gmail.com");
  assert.equal(mailboxKey("abiralameddine+maya@gmail.com"), "abiralameddine@gmail.com");
  assert.equal(mailboxKey("A.B+x@GoogleMail.com"), "ab@gmail.com");
  assert.equal(mailboxKey("first.last+tag@company.com"), "first.last@company.com", "dots only ignored for Gmail");
});

test("a reply from the dotted Gmail address is matched to Priya through the reply code", async () => {
  const w = makeWorld(demoInbox);
  const res = await handleInbound(w.repo, fakeAI(demoParse), { ...priyaReply, gmail_message_id: "g-dot", from: "Abir Alameddine <abir.alameddine@gmail.com>" }, { today: "2026-11-03" });
  assert.equal(res.status, "applied");
  assert.equal(w.tasks.find((t) => t.id === "t-pricing")!.status, "done");
  assert.equal(w.tasks.find((t) => t.id === "t-deck")!.blocker, "numbers from finance");
  assert.ok(w.log.every((l) => l.actor_id === PRIYA));
});

test("one inbox for every character: the reply code decides who is answering", async () => {
  const w = makeWorld(demoInbox);
  w.emails.push({ id: "e-maya", reply_code: "maya01", member_id: MAYA, kind: "morning", task_refs: [{ n: 1, task_id: "t-faq" }] });
  const res = await handleInbound(
    w.repo,
    fakeAI({ changes: [{ task_number: 1, new_status: "in_progress", blocker: null, requested_due_date: null, reason: null, quote: "1 is started", confidence: "sure" }], question: null }),
    { ...priyaReply, gmail_message_id: "g-maya", from: "abir.alameddine@gmail.com", to: "signalridgeco+le-maya01@gmail.com" },
    { today: "2026-11-03" },
  );
  assert.equal(res.status, "applied");
  assert.equal(w.log[0].actor_id, MAYA, "logged as Maya, the person the email was sent to");
});

test("a reply carrying someone else's code is never applied to their tasks", async () => {
  const w = makeWorld(); // Priya's code, but the reply comes from Jordan's own address
  const res = await handleInbound(w.repo, fakeAI(demoParse), { ...priyaReply, gmail_message_id: "g-jordan", from: "jordan@x.com" }, { today: "2026-11-03" });
  assert.notEqual(w.tasks.find((t) => t.id === "t-pricing")!.status, "done");
  assert.notEqual(res.status, "applied");
});

test("no known reply code: a shared Gmail inbox counts as the member with the plain address", async () => {
  const { matchMember } = await import("@/lib/replies/supabase-repo");
  const m = (id: string, email: string): TeamMember => ({ id, name: id, email, role: "member", avatar_url: null, created_at: "" });
  const demo = [m("maya", demoInbox.maya), m("priya", demoInbox.priya), m("jordan", demoInbox.jordan)];
  assert.equal(matchMember(demo, "abir.alameddine@gmail.com")?.id, "priya", "dotted sender, plain address wins");
  assert.equal(matchMember(demo, "abiralameddine+jordan@gmail.com")?.id, "jordan", "exact address first");
  const noPlain = [m("maya", demoInbox.maya), m("jordan", demoInbox.jordan)];
  assert.equal(matchMember(noPlain, "abir.alameddine@gmail.com"), null, "several and none plain: can't tell");
  assert.equal(matchMember(demo, "stranger@x.com"), null);
});
