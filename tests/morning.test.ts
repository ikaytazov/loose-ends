// Tests for the morning email wording (agreement C), run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dueText, morningBody, morningSubject } from "@/lib/email/morning";

const TUESDAY = "2026-11-03";

test("subject always contains 'open tasks'", () => {
  assert.equal(morningSubject(3, TUESDAY), "Your 3 open tasks for Tuesday");
  assert.match(morningSubject(1, TUESDAY), /open tasks/);
});

test("due dates read like the agreement C example", () => {
  assert.equal(dueText("2026-11-05", TUESDAY), "due Thursday");
  assert.equal(dueText("2026-11-09", TUESDAY), "due next Monday");
  assert.equal(dueText("2026-11-03", TUESDAY), "due today");
  assert.equal(dueText("2026-11-04", TUESDAY), "due tomorrow");
  assert.equal(dueText("2026-11-02", TUESDAY), "overdue (was due Nov 2)");
  assert.equal(dueText("2026-11-20", TUESDAY), "due Nov 20");
  assert.equal(dueText(null, TUESDAY), "no due date");
});

test("body matches agreement C", () => {
  const ws = new Map([["w-launch", "Product launch"], ["w-onb", "Customer onboarding"]]);
  const body = morningBody(
    "Priya Shah",
    [
      { title: "Launch the new pricing page", priority: "high", due_date: "2026-11-05", workstream_id: "w-launch" },
      { title: "Partner deck", priority: "high", due_date: "2026-11-05", workstream_id: "w-launch" },
      { title: "Draft FAQ for support", priority: "medium", due_date: "2026-11-09", workstream_id: "w-onb" },
    ],
    ws,
    TUESDAY,
  );
  assert.equal(
    body,
    [
      "Good morning Priya. You have 3 open tasks, most urgent first.",
      "",
      "1. High – Launch the new pricing page – Product launch – due Thursday",
      "2. High – Partner deck – Product launch – due Thursday",
      "3. Medium – Draft FAQ for support – Customer onboarding – due next Monday",
      "",
      `Just reply in your own words, for example "1 is done" or "2 needs until Friday, waiting on finance".`,
    ].join("\n"),
  );
});
