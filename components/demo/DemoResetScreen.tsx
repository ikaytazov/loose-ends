"use client";

// /demo: reset the demo data before a dry run or a take (POST /api/demo/reset). Not in the sidebar on purpose.
// Asks for the team password (BRIDGE_SECRET) and a confirmation, because it deletes everything.
import Link from "next/link";
import { useState } from "react";
import { errorText, postJson } from "@/components/api";
import { Button, Card, Field, Notice, PageHead, inputClass } from "@/components/ui";

type Result = { members: number; workstreams: number; meetings: number; tasks: number; activity: number };

export function DemoResetScreen() {
  const [key, setKey] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ at: Date; result: Result } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const result = await postJson<Result>("/api/demo/reset", { key });
      setDone({ at: new Date(), result });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <PageHead title="Reset the demo." subtitle="Puts everything back to the demo's starting point, the same as running supabase/seed.sql. Do it before every dry run and every take." />

      <Card className="max-w-xl p-6">
        <ul className="mb-5 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
          <li>Deletes every task, email, decision and update, then loads the demo team, the four workstreams and last week&rsquo;s tasks.</li>
          <li>Dates are set relative to today, so do it on the day you record.</li>
          <li>Takes a few seconds. Open screens refresh on their own.</li>
        </ul>

        <Field label="Team password" hint="The BRIDGE_SECRET. Ask Iliyan if you don't have it.">
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setConfirming(false);
            }}
            className={inputClass}
          />
        </Field>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!confirming ? (
            <Button variant="primary" disabled={!key || busy} onClick={() => setConfirming(true)}>
              {busy ? "Resetting…" : "Reset demo data"}
            </Button>
          ) : (
            <>
              <span className="text-[15px] font-semibold">Delete everything and reload the demo data?</span>
              <Button variant="primary" onClick={reset}>
                Yes, reset
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-5">
            <Notice tone="danger" title="Not reset">
              {error}
            </Notice>
          </div>
        )}
        {done && (
          <div className="mt-5">
            <Notice tone="ok" title={`Reset at ${done.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}>
              {done.result.members} people, {done.result.workstreams} workstreams, {done.result.meetings} meetings, {done.result.tasks} tasks and{" "}
              {done.result.activity} updates loaded.{" "}
              <Link href="/overview" className="font-semibold underline underline-offset-4">
                Open the Overview
              </Link>{" "}
              to check it: Product launch on track, Fundraising decision needed, Operations blocked, Customer onboarding update needed.
            </Notice>
          </div>
        )}
      </Card>
    </>
  );
}
