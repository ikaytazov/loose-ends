// Tests for the Capture screen's upload and date helpers. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dateFromText, firstLine, MAX_UPLOAD_BYTES, uploadProblem } from "@/components/capture/parse";

test("accepts .txt and .md under 200 KB", () => {
  assert.equal(uploadProblem("weekly-01.txt", 1000), null);
  assert.equal(uploadProblem("Weekly-02.MD", MAX_UPLOAD_BYTES), null);
});

test("rejects .docx with a reason that says to save as text", () => {
  const problem = uploadProblem("notes.docx", 1000);
  assert.match(problem ?? "", /\.txt and \.md/);
  assert.match(problem ?? "", /docx/);
});

test("rejects files over 200 KB", () => {
  assert.match(uploadProblem("big.txt", MAX_UPLOAD_BYTES + 1) ?? "", /200 KB/);
});

test("first non-empty line is the title", () => {
  assert.equal(firstLine("\n  \nWeekly call, 9 Nov\nPriya: hi"), "Weekly call, 9 Nov");
  assert.equal(firstLine("   "), "");
});

test("reads day-first and month-first dates", () => {
  assert.equal(dateFromText("Weekly call, 9 Nov", 2026), "2026-11-09");
  assert.equal(dateFromText("Weekly call, Nov 9th", 2026), "2026-11-09");
  assert.equal(dateFromText("Sync on 3 September", 2026), "2026-09-03");
});

test("returns null when there is no date or the date is impossible", () => {
  assert.equal(dateFromText("Weekly call", 2026), null);
  assert.equal(dateFromText("Meeting on 31 Feb", 2026), null);
});
