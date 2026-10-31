// Tests for the email sent after a new due date is approved or declined (spec step 6), run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decisionBody, decisionLine, decisionSubject } from "@/lib/email/decision";

const base = {
  requesterName: "Priya Shah",
  deciderName: "Maya Chen",
  title: "Finish the partner deck",
  currentDueDate: "2026-11-05",
  requestedDueDate: "2026-11-11",
};

test("approved: one line with the new date, as in the demo", () => {
  assert.equal(
    decisionLine({ ...base, decision: "approved" }),
    'Hi Priya. Maya approved your new date: "Finish the partner deck" is now due Wed 11 Nov.',
  );
});

test("declined: says the date stays", () => {
  assert.equal(
    decisionLine({ ...base, decision: "declined" }),
    'Hi Priya. Maya kept the current date for "Finish the partner deck": it stays due Thu 5 Nov.',
  );
  assert.match(decisionLine({ ...base, decision: "declined", currentDueDate: null }), /keeps no due date/);
});

test("works without a decider name", () => {
  assert.match(decisionLine({ ...base, deciderName: null, decision: "approved" }), /^Hi Priya\. Your workstream owner approved/);
});

test("subject always contains 'Loose Ends' so replies reach the Gmail bridge", () => {
  assert.match(decisionSubject("approved"), /Loose Ends/);
  assert.match(decisionSubject("declined"), /Loose Ends/);
  assert.match(decisionBody({ ...base, decision: "approved" }), /reply to this email/);
});
