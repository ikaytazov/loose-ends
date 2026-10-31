// Tests for the Decisions screen helpers. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canDecide, daysBetween, leavesNoBuffer } from "@/components/decisions/logic";

test("only the approver can decide", () => {
  assert.equal(canDecide("m-maya", "m-maya"), true);
  assert.equal(canDecide("m-priya", "m-maya"), false);
});

test("nobody can decide when there is no approver or no lead yet", () => {
  assert.equal(canDecide("m-maya", null), false);
  assert.equal(canDecide(null, "m-maya"), false);
});

test("a requested date on or after the target leaves no buffer", () => {
  assert.equal(leavesNoBuffer("2026-11-06", "2026-11-06"), true);
  assert.equal(leavesNoBuffer("2026-11-07", "2026-11-06"), true);
  assert.equal(leavesNoBuffer("2026-11-05", "2026-11-06"), false);
  assert.equal(leavesNoBuffer("2026-11-05", null), false);
});

test("days between two dates, across a month end", () => {
  assert.equal(daysBetween("2026-10-30", "2026-11-02"), 3);
  assert.equal(daysBetween("2026-11-05", "2026-11-02"), -3);
  assert.equal(daysBetween(null, "2026-11-02"), null);
});
