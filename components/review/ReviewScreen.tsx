"use client";

// Review & approve (/capture/review/[meetingId]): correct the proposed tasks before anything goes on the board.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorText, postJson } from "@/components/api";
import { formatDay } from "@/components/format";
import { findDuplicate, highlight, type Tracked } from "@/components/review/logic";
import { useTeam } from "@/components/use-team";
import { Button, Card, Eyebrow, Field, inputClass, Notice, PageHead, Pill } from "@/components/ui";
import type { ApproveMeetingResponse } from "@/lib/contracts/api";
import type { Meeting, Priority, Task, TaskFlag, Workstream } from "@/lib/contracts/domain";
import { browserSupabase } from "@/lib/supabase/browser";

type Row = {
  id: string;
  title: string;
  owner_id: string | null;
  workstream_id: string | null;
  due_date: string | null;
  priority: Priority;
  source_sentence: string | null;
  flags: TaskFlag[];
  keep: boolean;
  // Why this proposal looks like something already on the board, or repeats an earlier meeting in the same upload.
  duplicateLabel: string | null;
};

type Saved = Pick<Row, "id" | "title" | "owner_id" | "workstream_id" | "due_date" | "priority" | "keep">;

const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

function draftKey(meetingId: string) {
  return `loose-ends-review-${meetingId}`;
}

function readSavedDraft(meetingId: string): Saved[] | null {
  try {
    const raw = window.localStorage.getItem(draftKey(meetingId));
    return raw ? (JSON.parse(raw) as Saved[]) : null;
  } catch {
    return null; // storage can be blocked; the screen works without it
  }
}

export function ReviewScreen({ meetingId, queue }: { meetingId: string; queue: string[] }) {
  const router = useRouter();
  // The rest of the upload, oldest first. A string key keeps the loader from re-running on every render.
  const queueKey = queue.join(",");
  const { team, error: teamError } = useTeam();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [streams, setStreams] = useState<Workstream[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [result, setResult] = useState<ApproveMeetingResponse | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const sb = browserSupabase();
        const ids = [meetingId, ...(queueKey ? queueKey.split(",") : [])];
        const [meetingRes, proposalRes, trackedRes, streamRes] = await Promise.all([
          sb.from("meetings").select("*").in("id", ids),
          sb.from("tasks").select("*").in("meeting_id", ids).eq("status", "proposed").order("created_at"),
          sb.from("tasks").select("id, title, owner_id, source_sentence, status").neq("status", "proposed"),
          sb.from("workstreams").select("*").order("name"),
        ]);
        for (const r of [meetingRes, proposalRes, trackedRes, streamRes]) if (r.error) throw new Error(r.error.message);

        const found = (meetingRes.data ?? []) as Meeting[];
        const current = found.find((m) => m.id === meetingId);
        if (!current) throw new Error("This meeting was not found. It may have been removed.");

        const tracked = (trackedRes.data ?? []) as Tracked[];
        const proposals = (proposalRes.data ?? []) as Task[];
        const index = ids.indexOf(meetingId);
        // Proposals from meetings earlier in this upload that are still waiting for approval.
        const earlier = proposals.filter((p) => p.meeting_id !== meetingId && ids.indexOf(p.meeting_id ?? "") < index);
        const mine = proposals.filter((p) => p.meeting_id === meetingId);

        const built: Row[] = mine.map((p) => {
          const onBoard = findDuplicate(p, tracked);
          const repeat = onBoard ? null : findDuplicate(p, earlier);
          const duplicateLabel = onBoard
            ? `Already tracked · T-${onBoard.id.slice(0, 4).toUpperCase()}`
            : repeat
              ? "Repeated from an earlier meeting"
              : null;
          return {
            id: p.id,
            title: p.title,
            owner_id: p.owner_id,
            workstream_id: p.workstream_id,
            due_date: p.due_date,
            priority: p.priority,
            source_sentence: p.source_sentence,
            flags: p.flags ?? [],
            keep: duplicateLabel === null,
            duplicateLabel,
          };
        });

        // Restore edits saved on this device, if they match these proposals.
        const saved = readSavedDraft(meetingId);
        const merged = built.map((row) => {
          const s = saved?.find((x) => x.id === row.id);
          return s ? { ...row, ...s } : row;
        });

        if (live) {
          setMeeting(current);
          setStreams((streamRes.data ?? []) as Workstream[]);
          setRows(merged);
          setLoaded(true);
        }
      } catch (e) {
        if (live) {
          setLoadError(errorText(e));
          setLoaded(true);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [meetingId, queueKey]);

  const kept = rows.filter((r) => r.keep);
  const counts = useMemo(
    () => ({
      proposed: rows.length,
      noOwner: kept.filter((r) => !r.owner_id).length,
      noDate: kept.filter((r) => !r.due_date).length,
      ready: kept.filter((r) => r.owner_id && r.due_date && r.title.trim()).length,
      left: rows.length - kept.length,
    }),
    [rows, kept],
  );
  const segments = useMemo(
    () =>
      meeting
        ? highlight(
            meeting.raw_notes,
            rows.filter((r) => r.source_sentence).map((r) => ({ id: r.id, text: r.source_sentence ?? "" })),
          )
        : [],
    [meeting, rows],
  );

  function update(id: string, patch: Partial<Row>) {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function focusRow(id: string) {
    const el = document.getElementById(`title-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  }

  function saveDraft() {
    try {
      const data: Saved[] = rows.map(({ id, title, owner_id, workstream_id, due_date, priority, keep }) => ({
        id,
        title,
        owner_id,
        workstream_id,
        due_date,
        priority,
        keep,
      }));
      window.localStorage.setItem(draftKey(meetingId), JSON.stringify(data));
      setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }));
    } catch {
      setSavedAt(null);
      setApproveError("Could not save a draft on this device. Your edits are still on screen.");
    }
  }

  async function approve() {
    const blank = kept.find((r) => !r.title.trim());
    if (blank) {
      setShowErrors(true);
      focusRow(blank.id);
      dialog.current?.close();
      return;
    }
    setApproving(true);
    setApproveError(null);
    try {
      const res = await postJson<ApproveMeetingResponse>(`/api/meetings/${meetingId}/approve`, {
        tasks: rows.map((r) => ({
          id: r.id,
          title: r.title.trim(),
          owner_id: r.owner_id,
          workstream_id: r.workstream_id,
          due_date: r.due_date || null,
          priority: r.priority,
          keep: r.keep,
        })),
      });
      try {
        window.localStorage.removeItem(draftKey(meetingId));
      } catch {
        // nothing to clean up
      }
      setResult(res);
      dialog.current?.close();
    } catch (e) {
      setApproveError(`Nothing was approved yet: ${errorText(e)}. Your edits are still here, so press Approve to try again.`);
      dialog.current?.close();
    } finally {
      setApproving(false);
    }
  }

  const nextId = queue[0];
  const rest = queue.slice(1);
  const eyebrow = queue.length ? `${queue.length} more ${queue.length === 1 ? "meeting" : "meetings"} to review after this` : "Review & approve";

  if (!loaded) return <p className="text-muted">Loading the proposals…</p>;

  if (loadError) {
    return (
      <>
        <PageHead eyebrow="Review & approve" title="Review what was promised." />
        <Notice tone="danger" title="Could not load this meeting">
          {loadError} <Link className="underline" href="/capture">Back to Capture notes</Link>
        </Notice>
      </>
    );
  }

  if (result) {
    return (
      <>
        <PageHead eyebrow="Review & approve" title={`${result.approved} ${result.approved === 1 ? "task is" : "tasks are"} now on the board.`} subtitle="Each owner gets their open tasks in the 8 am Pacific email. Tasks without an owner wait in Decisions." />
        <Card className="max-w-2xl space-y-4 p-6">
          <p>
            {result.removed > 0 ? `${result.removed} left out. ` : ""}
            {counts.noOwner > 0 && "Some tasks have no owner yet. "}
            {counts.noDate > 0 && "Some tasks have no date yet and stay flagged."}
          </p>
          <div className="flex flex-wrap gap-3">
            {nextId && (
              <Button variant="primary" onClick={() => router.push(`/capture/review/${nextId}${rest.length ? `?queue=${rest.join(",")}` : ""}`)}>
                Review the next meeting
              </Button>
            )}
            {counts.noOwner > 0 && (
              <Link href="/decisions" className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-paper px-4 font-semibold">
                Open Decisions
              </Link>
            )}
            <Link href="/capture" className="inline-flex min-h-11 items-center rounded-[10px] px-4 font-semibold text-forest-2 underline">
              Capture another meeting
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow={eyebrow}
        title="Review what was promised."
        subtitle={meeting ? `${meeting.title} · ${formatDay(meeting.meeting_date)}. Nothing becomes a task until you approve it.` : undefined}
      />

      {rows.length === 0 && (
        <Card className="max-w-2xl p-6">
          <p className="font-serif text-[22px]">No commitments found.</p>
          <p className="mt-2 text-muted">
            The notes need a sentence that says who will do what, for example &quot;Priya will get the pricing page live by Thursday.&quot;
          </p>
          <Link href="/capture" className="mt-4 inline-block font-semibold text-forest-2 underline">
            Edit the notes
          </Link>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              ["Proposed", counts.proposed],
              ["Need an owner", counts.noOwner],
              ["Need a date", counts.noDate],
            ].map(([label, n]) => (
              <Card key={label as string} className="p-4">
                <p className="font-serif text-[34px] leading-none">{n}</p>
                <p className="mt-1 text-[14px] text-muted">{label}</p>
              </Card>
            ))}
          </div>

          {teamError && <Notice tone="danger" title="Could not load the team">{teamError}</Notice>}

          <div className="grid gap-8 min-[1080px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Card className="h-fit p-6 min-[1080px]:sticky min-[1080px]:top-24">
              <Eyebrow>From your notes</Eyebrow>
              <div className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-[10px] bg-canvas p-4 text-[15px] leading-relaxed">
                {segments.map((s, i) =>
                  s.proposalId ? (
                    <mark
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => focusRow(s.proposalId!)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          focusRow(s.proposalId!);
                        }
                      }}
                      className="cursor-pointer rounded bg-lime px-0.5 text-ink"
                    >
                      {s.text}
                    </mark>
                  ) : (
                    <span key={i}>{s.text}</span>
                  ),
                )}
              </div>
            </Card>

            <div className="space-y-4">
              {rows.map((row, i) => (
                <ProposalCard
                  key={row.id}
                  index={i + 1}
                  row={row}
                  team={team ?? []}
                  streams={streams}
                  showErrors={showErrors}
                  onChange={(patch) => update(row.id, patch)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {approveError && (
        <div className="mt-6">
          <Notice tone="danger" title="Approval did not finish">{approveError}</Notice>
        </div>
      )}

      {rows.length > 0 && (
        <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/95 py-4 backdrop-blur">
          <p className="text-[14.5px]">
            <span className="font-semibold">{counts.ready} ready</span> · {counts.proposed - counts.left - counts.ready} need attention ·{" "}
            {counts.left} left out
            {savedAt && <span className="text-muted"> · draft saved at {savedAt} PT</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveDraft}>Save draft on this device</Button>
            <Button variant="primary" disabled={kept.length === 0 || approving} onClick={() => dialog.current?.showModal()}>
              Approve {kept.length} {kept.length === 1 ? "task" : "tasks"}
            </Button>
          </div>
        </div>
      )}

      <dialog ref={dialog} aria-labelledby="approve-title" className="w-[min(92vw,480px)] rounded-[14px] border border-line bg-paper p-6 text-ink backdrop:bg-ink/40">
        <h2 id="approve-title" className="font-serif text-[24px]">
          Approve {kept.length} {kept.length === 1 ? "task" : "tasks"}?
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] text-ink-2">
          <li>Each owner gets their open tasks in the 8 am Pacific email.</li>
          {counts.noOwner > 0 && <li>{counts.noOwner} without an owner will wait in Decisions.</li>}
          {counts.noDate > 0 && <li>{counts.noDate} without a date stay flagged.</li>}
          {counts.left > 0 && <li>{counts.left} you left out will be removed from this meeting.</li>}
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button variant="primary" onClick={approve} disabled={approving}>
            {approving ? "Approving…" : "Approve"}
          </Button>
        </div>
      </dialog>
    </>
  );
}

function ProposalCard({
  index,
  row,
  team,
  streams,
  showErrors,
  onChange,
}: {
  index: number;
  row: Row;
  team: { id: string; name: string }[];
  streams: Workstream[];
  showErrors: boolean;
  onChange: (patch: Partial<Row>) => void;
}) {
  const noOwner = row.flags.includes("no_owner") || !row.owner_id;
  const noDate = row.flags.includes("no_date") || !row.due_date;
  const blankTitle = row.keep && !row.title.trim();

  return (
    <Card className={`p-5 ${row.keep ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-muted">{index}.</span>
        <Pill tone={row.keep ? "lime" : "grey"}>{row.keep ? "Proposed" : "Left out"}</Pill>
        {row.duplicateLabel && <Pill tone="warn">{row.duplicateLabel}</Pill>}
        <span className="ml-auto text-[13.5px] text-muted">Priority suggested</span>
      </div>

      <div className="mt-4 space-y-4">
        <Field label="Task" error={showErrors && blankTitle ? "Give this task a title, or leave it out." : undefined}>
          <input id={`title-${row.id}`} className={`${inputClass} font-serif text-[18px]`} value={row.title} onChange={(e) => onChange({ title: e.target.value })} disabled={!row.keep} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner">
            <select
              className={`${inputClass} ${noOwner ? "border-warn-line bg-warn-bg" : ""}`}
              value={row.owner_id ?? ""}
              onChange={(e) => onChange({ owner_id: e.target.value || null })}
              disabled={!row.keep}
            >
              <option value="">Not assigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {noOwner && <span className="mt-1 block text-[13.5px] font-semibold text-warn">No owner named in the notes</span>}
          </Field>

          <Field label="Due date">
            <input
              type="date"
              className={`${inputClass} ${noDate ? "border-warn-line bg-warn-bg" : ""}`}
              value={row.due_date ?? ""}
              onChange={(e) => onChange({ due_date: e.target.value || null })}
              disabled={!row.keep}
            />
            {noDate && <span className="mt-1 block text-[13.5px] font-semibold text-warn">No date in the notes</span>}
          </Field>

          <Field label="Priority">
            <select className={inputClass} value={row.priority} onChange={(e) => onChange({ priority: e.target.value as Priority })} disabled={!row.keep}>
              {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Workstream">
            <select className={inputClass} value={row.workstream_id ?? ""} onChange={(e) => onChange({ workstream_id: e.target.value || null })} disabled={!row.keep}>
              <option value="">None</option>
              {streams.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {row.source_sentence && (
          <blockquote className="rounded-[10px] border-l-[3px] border-lime bg-canvas px-4 py-3">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">From your notes · exact words</p>
            <p className="mt-1 text-[15px]">&ldquo;{row.source_sentence}&rdquo;</p>
          </blockquote>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onChange({ keep: !row.keep })}>
            {row.keep ? "Leave out" : "Restore"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
