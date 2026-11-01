// Tests for the add-teammate helpers (lib/server/team-members.ts), run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { flagsAfterAssign } from "@/lib/server/team-members";
import { AddMemberRequest } from "@/lib/contracts/api";

test("assigning an owner clears only the owner flags", () => {
  assert.deepEqual(flagsAfterAssign(["no_owner", "new_person", "no_date"]), ["no_date"]);
  assert.deepEqual(flagsAfterAssign(null), []);
});

test("the request trims and lower-cases the email and rejects a bad one", () => {
  const ok = AddMemberRequest.parse({ name: " Sarah ", email: " Sarah@Example.COM " });
  assert.equal(ok.name, "Sarah");
  assert.equal(ok.email, "sarah@example.com");
  assert.deepEqual(ok.assign_task_ids, []);
  assert.equal(ok.role, "member");
  assert.equal(AddMemberRequest.safeParse({ name: "Sarah", email: "sarah@" }).success, false);
  assert.equal(AddMemberRequest.safeParse({ name: "Sarah", email: "s@x.com", role: "lead" }).success, false);
});
