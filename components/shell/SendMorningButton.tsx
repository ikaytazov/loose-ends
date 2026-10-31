"use client";

// "Send morning emails now" (docs/api.md, POST /api/emails/send-morning). Lives in the top bar so the demo can
// send at any point instead of waiting for the 8 am job. Asks once before sending, because it emails the whole team.
import { useEffect, useState } from "react";
import { errorText, postJson } from "@/components/api";
import { Button } from "@/components/ui";
import type { SendMorningResponse } from "@/lib/contracts/api";

type State = { kind: "idle" } | { kind: "confirm" } | { kind: "sending" } | { kind: "done"; sent: number } | { kind: "error"; message: string };

export function SendMorningButton() {
  const [state, setState] = useState<State>({ kind: "idle" });

  // The result message clears itself after a few seconds.
  useEffect(() => {
    if (state.kind !== "done" && state.kind !== "error") return;
    const t = setTimeout(() => setState({ kind: "idle" }), 8000);
    return () => clearTimeout(t);
  }, [state]);

  async function send() {
    setState({ kind: "sending" });
    try {
      const res = await postJson<SendMorningResponse>("/api/emails/send-morning", {});
      setState({ kind: "done", sent: res.sent });
    } catch (e) {
      setState({ kind: "error", message: errorText(e) });
    }
  }

  if (state.kind === "confirm") {
    return (
      <span className="flex items-center gap-2 text-[14px]">
        <span>Email everyone with open tasks now?</span>
        <Button variant="primary" onClick={send} className="min-h-9 px-3 text-[14px]">
          Send
        </Button>
        <Button variant="ghost" onClick={() => setState({ kind: "idle" })} className="min-h-9 px-2 text-[14px]">
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 text-[14px]">
      {state.kind === "done" && (
        <span role="status" className="text-ok">
          {state.sent === 0 ? "Nobody has open tasks." : `Sent to ${state.sent} ${state.sent === 1 ? "person" : "people"}.`}
        </span>
      )}
      {state.kind === "error" && (
        <span role="alert" className="text-danger">
          Not sent: {state.message}
        </span>
      )}
      <Button
        onClick={() => setState({ kind: "confirm" })}
        disabled={state.kind === "sending"}
        className="min-h-9 px-3 text-[14px]"
      >
        {state.kind === "sending" ? "Sending…" : "Send morning emails now"}
      </Button>
    </span>
  );
}
