// Tests for the Review screen's duplicate check and source highlighting. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findDuplicate, highlight, titleSimilarity, type Tracked } from "@/components/review/logic";

const tracked: Tracked[] = [
  { id: "t-1234-aaaa", title: "Launch the new pricing page", owner_id: "m-priya", source_sentence: "Priya will get the pricing page live.", status: "in_progress" },
  { id: "t-5678-bbbb", title: "Send the partner deck", owner_id: "m-jordan", source_sentence: null, status: "not_started" },
];

test("same exact source sentence is a duplicate, even with a different owner", () => {
  const hit = findDuplicate({ title: "Other", owner_id: null, source_sentence: "priya will get the pricing page live." }, tracked);
  assert.equal(hit?.id, "t-1234-aaaa");
});

test("same owner and a near-identical title is a duplicate", () => {
  const hit = findDuplicate({ title: "Launch the pricing page", owner_id: "m-priya", source_sentence: null }, tracked);
  assert.equal(hit?.id, "t-1234-aaaa");
});

test("same title but a different owner is not a duplicate", () => {
  assert.equal(findDuplicate({ title: "Launch the new pricing page", owner_id: "m-jordan", source_sentence: null }, tracked), null);
});

test("unrelated tasks are not duplicates", () => {
  assert.equal(findDuplicate({ title: "Book the venue", owner_id: "m-priya", source_sentence: null }, tracked), null);
});

test("titleSimilarity is 1 for identical titles and 0 for nothing in common", () => {
  assert.equal(titleSimilarity("Send the deck", "Send the deck"), 1);
  assert.equal(titleSimilarity("Send deck", "Book venue"), 0);
});

test("highlight wraps found sentences and keeps the rest as plain text", () => {
  const notes = "Weekly call.\nPriya will get the pricing page live by Thursday.\nAny questions?";
  const segments = highlight(notes, [{ id: "p1", text: "Priya will get the pricing page live by Thursday." }]);
  assert.deepEqual(segments.map((s) => s.proposalId ?? null), [null, "p1", null]);
  assert.equal(segments.map((s) => s.text).join(""), notes);
});

test("a sentence that is not word for word in the notes is not highlighted", () => {
  const notes = "Priya will ship the pricing page.";
  const segments = highlight(notes, [{ id: "p1", text: "Priya will get the pricing page live." }]);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].proposalId, undefined);
});

test("overlapping sentences: the first placed wins and text is never lost", () => {
  const notes = "Alpha beta gamma delta.";
  const segments = highlight(notes, [
    { id: "a", text: "Alpha beta gamma" },
    { id: "b", text: "beta gamma delta" },
  ]);
  assert.equal(segments.map((s) => s.text).join(""), notes);
  assert.deepEqual(segments.filter((s) => s.proposalId).map((s) => s.proposalId), ["a"]);
});
