// Tests for the add-teammate helpers the review and team screens share. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isEmail, sameName } from "@/components/team/add-member";

test("accepts a plausible work email and rejects the broken ones", () => {
  assert.equal(isEmail("sarah@company.com"), true);
  assert.equal(isEmail("  sarah.lee@company.co.uk "), true);
  assert.equal(isEmail("sarah@"), false);
  assert.equal(isEmail("sarah@company"), false);
  assert.equal(isEmail("sarah smith@company.com"), false);
  assert.equal(isEmail(""), false);
});

test("a name typed by hand matches a team member regardless of case and spacing", () => {
  assert.equal(sameName("Sarah", "sarah"), true);
  assert.equal(sameName("  Tom   Reyes ", "tom reyes"), true);
  assert.equal(sameName("Sarah", "Sara"), false);
});
