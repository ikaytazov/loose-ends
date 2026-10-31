// After a reply is handled, Loose Ends writes back to the sender (issue #15):
//   - a one-line confirmation of what changed, e.g.
//     "Marked the pricing page as done; asked Maya to move the partner deck to Wed 4 Nov."
//   - or, when the reply reader came back with a question (or understood nothing), that question instead.
// This file only builds the words. Sending and saving happen in lib/email/follow-up.ts.
import type { TaskStatus } from "@/lib/contracts/domain";

/** One thing that happened to one task because of the reply. */
export type FollowUpItem =
  | { type: "status"; title: string; status: TaskStatus; blocker: string | null }
  | { type: "blocker"; title: string; blocker: string | null }
  | { type: "date_request"; title: string; date: string; approverName: string | null };

/** What to send back. task_refs keep the numbering of the email being answered, so "2 is done" still works. */
export interface FollowUp {
  to: string;
  member_id: string;
  kind: "confirmation" | "question";
  subject: string; // always contains "Loose Ends": the Gmail bridge only picks up replies with these words
  text: string;
  in_reply_to_email_id: string;
  task_refs: { n: number; task_id: string }[];
}

export type Notifier = (msg: FollowUp) => Promise<void>;

export const CONFIRMATION_SUBJECT = "Loose Ends: got your update";
export const QUESTION_SUBJECT = "Loose Ends: quick question";
export const FALLBACK_QUESTION =
  "I couldn't tell which task your reply was about. Could you reply with the task number and what changed, for example \"2 is done\"?";

const STATUS_WORDS: Record<TaskStatus, string> = {
  proposed: "proposed",
  not_started: "not started",
  in_progress: "in progress",
  blocked: "blocked",
  done: "done",
};

/** "2026-11-04" → "Wed 4 Nov" */
export function shortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d);
  const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  return `${weekday} ${dayMonth}`;
}

/** The one-line confirmation, or null if nothing changed. */
export function confirmationLine(items: FollowUpItem[]): string | null {
  const parts = items.map((it) => {
    const t = `"${it.title}"`;
    if (it.type === "status") {
      const why = it.status === "blocked" && it.blocker ? ` (waiting on ${it.blocker})` : "";
      return `marked ${t} as ${STATUS_WORDS[it.status]}${why}`;
    }
    if (it.type === "blocker") {
      return it.blocker ? `noted ${t} is waiting on ${it.blocker}` : `cleared the blocker on ${t}`;
    }
    const who = it.approverName ? `asked ${it.approverName}` : "asked";
    return `${who} to move ${t} to ${shortDate(it.date)}`;
  });
  if (!parts.length) return null;
  const line = parts.join("; ") + ".";
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** True for out-of-office and other automatic replies: never answer those, or two robots email each other forever. */
export function isAutoReply(subject: string): boolean {
  return /^(auto(matic)?[ -]?reply|auto:|out of (the )?office|ooo\b|away from)/i.test(subject.replace(/^(re|fwd?):\s*/i, "").trim());
}

/**
 * Builds the email to send back.
 *   - question from the AI → that question (plus what was already updated, so nothing is hidden)
 *   - something changed → one-line confirmation
 *   - nothing changed and no question → a short question asking which task they meant
 */
export function buildFollowUp(input: {
  to: string;
  member_id: string;
  memberName: string;
  in_reply_to_email_id: string;
  numbered: { n: number; task_id: string; title: string }[];
  items: FollowUpItem[];
  question: string | null;
}): FollowUp {
  const done = confirmationLine(input.items);
  const base = {
    to: input.to,
    member_id: input.member_id,
    in_reply_to_email_id: input.in_reply_to_email_id,
    task_refs: input.numbered.map(({ n, task_id }) => ({ n, task_id })),
  };
  const question = input.question?.trim() || (done ? null : FALLBACK_QUESTION);

  if (question) {
    const list = input.numbered.map(({ n, title }) => `${n}. ${title}`).join("\n");
    const lines = [
      `Hi ${input.memberName}. ${question}`,
      ...(done ? ["", `Already updated: ${done}`] : []),
      ...(list ? ["", "Your tasks:", list] : []),
      "",
      "Just reply to this email in your own words.",
    ];
    return { ...base, kind: "question", subject: QUESTION_SUBJECT, text: lines.join("\n") };
  }

  return {
    ...base,
    kind: "confirmation",
    subject: CONFIRMATION_SUBJECT,
    text: `${done}\n\nIf that's not right, just reply to this email.`,
  };
}
