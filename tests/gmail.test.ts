// Tests for the Gmail bridge check used by /api/health (issue #8). No network needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bridgeStatus } from "@/lib/email/gmail";

test("bridge check: the deployed script's answer counts as ok", () => {
  assert.equal(bridgeStatus(200, '{"ok":true,"message":"Loose Ends Gmail bridge is running"}'), "ok");
});

test("bridge check: a Google sign-in page means the deployment is not open to 'Anyone'", () => {
  const s = bridgeStatus(200, "<!DOCTYPE html><html><body>Sign in - Google Accounts</body></html>");
  assert.match(s, /^error: .*Anyone/);
});

test("bridge check: anything else is reported as an error", () => {
  assert.match(bridgeStatus(404, "Not Found"), /^error: unexpected answer \(HTTP 404\)/);
  assert.match(bridgeStatus(200, '{"ok":false}'), /^error:/);
});
