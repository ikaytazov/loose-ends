"use client";

// Decisions (/decisions): the workstream owner approves or declines a new due date, or names an owner for a
// task. Nothing moves until they do.
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { ApiError, errorText, postJson } from "@/components/api";
import { formatDay, formatWhen } from "@/components/format";
import { canDecide, daysBetween, leavesNoBuffer } from "@/components/decisions/logic";
import { useTeam } from "@/components/use-team";
import { Button, Card, Eyebrow, Notice, PageHead, Pill, inputClass } from "@/components/ui";
import type { AssignOwnerResponse, DecideDateResponse } from "@/lib/contracts/api";
import type { DateRequest, DecisionNeededRow, Task, TeamMember } from "@/lib/contracts/domain";
import { browserSupabase } from "@/lib/supabase/browser";

type Tab = "waiting" | "resolved";
type TaskInfo = Pick<Task, "id" | "blocker" | "source_sentence">;
type ResolvedRow = DateRequest & { tasks: { title: string; workstream_id: string | null } | null };

// What the latest change looks like, shown in the receipt panel.
type Receipt = {
  task: string;
  field: string;
  before: string | null;
  after: string | null;
  decidedBy: string | null;
  at: string;
  decision: "approved" | "declined" | "owner";
};

type Loaded = {
  rows: DecisionNeededRow[];
  tasks: Record<string, TaskInfo>;
  quotes: Record<string, string>;
  targets: Record<string, string | null>;
  resolved: ResolvedRow[];
};

const short = (id: string) => `T-${id.slice(0, 4).toUpperCase()}`;

async function loadDecisions(): Promise<Loaded> {
  const sb = browserSupabase();
  const { data: rowsData, error: e1 } = await sb.from("decisions_needed").select("*").order("created_at", { ascending: false });
  if (e1) throw new Error(e1.message);
  const rows = (rowsData ?? []) as DecisionNeededRow[];
  const taskIds = [...new Set(rows.map((r) => r.task_id))];
  const workstreamIds = [...new Set(rows.map((r) => r.workstream_id).filter((x): x is string => !!x))];

  const [tasksRes, quotesRes, streamsRes, resolvedRes] = await Promise.all([
    taskIds.length ? sb.from("tasks").select("id, blocker, source_sentence").in("id", taskIds) : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? sb.from("activity_log").select("task_id, quote, created_at").in("task_id", taskIds).not("quote", "is", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    workstreamIds.length
      ? sb.from("workstreams").select("id, target_date").in("id", workstreamIds)
      : Promise.resolve({ data: [], error: null }),
    sb.from("date_requests").select("*, tasks(title, workstream_id)").neq("status", "waiting").order("decided_at", { ascending: false }).limit(50),
  ]);
  for (const r of [tasksRes, quotesRes, streamsRes, resolvedRes]) if (r.error) throw new Error(r.error.message);

  const tasks: Record<string, TaskInfo> = {};
  for (const t of (tasksRes.data ?? []) as TaskInfo[]) tasks[t.id] = t;
  const quotes: Record<string, string> = {};
  for (const q of (quotesRes.data ?? []) as { task_id: string; quote: string }[]) if (!quotes[q.task_id]) quotes[q.task_id] = q.quote;
  const targets: Record<string, string | null> = {};
  for (const w of (streamsRes.data ?? []) as { id: string; target_date: string | null }[]) targets[w.id] = w.target_date;

  return { rows, tasks, quotes, targets, resolved: (resolvedRes.data ?? []) as ResolvedRow[] };
}

export function DecisionsScreen() {
  const { team, lead, error: teamError } = useTeam();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("waiting");
  const [showAll, setShowAll] = useState(false);
  const [confirm, setConfirm] = useState<{ key: string; decision: "approved" | "declined" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [justDecided, setJustDecided] = useState(false);
  // Page-level message, for outcomes that remove the card they came from (such as a 409).
  const [notice, setNotice] = useState<string | null>(null);

  // Bumping 'version' reloads the decisions from the database.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let live = true;
    loadDecisions()
      .then((d) => {
        if (live) {
          setData(d);
          setLoadError(null);
        }
      })
      .catch((e: unknown) => {
        if (live) setLoadError(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [version]);

  const names = Object.fromEntries((team ?? []).map((m: TeamMember) => [m.id, m.name]));
  const me = lead?.id ?? null;
  const visible = (data?.rows ?? []).filter((r) => showAll || r.approver_id === me);
  const latest = receipt ?? (data?.resolved[0] ? receiptFromResolved(data.resolved[0], names) : null);

  function setError(key: string, message: string | null) {
    setCardErrors((e) => ({ ...e, [key]: message ?? "" }));
  }

  async function decideDate(row: DecisionNeededRow, decision: "approved" | "declined") {
    if (!row.decision_id || !me) return;
    const key = row.decision_id;
    setBusy(key);
    setError(key, null);
    setNotice(null);
    try {
      const res = await postJson<DecideDateResponse>(`/api/date-requests/${row.decision_id}/decide`, { decision, decided_by: me });
      setReceipt({
        task: row.task_title,
        field: "Due date",
        before: res.date_request.current_due_date,
        after: decision === "approved" ? res.task.due_date : res.date_request.current_due_date,
        decidedBy: names[me] ?? null,
        at: res.date_request.decided_at ?? new Date().toISOString(),
        decision,
      });
      setJustDecided(true);
      setConfirm(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setNotice("Already decided. No change made.");
        setConfirm(null);
        reload();
      } else {
        setError(key, `Not saved: ${errorText(e)}. Nothing changed. Try again.`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function assignOwner(row: DecisionNeededRow) {
    const owner = picked[row.task_id];
    if (!owner || !me) return;
    const key = row.task_id;
    setBusy(key);
    setError(key, null);
    try {
      await postJson<AssignOwnerResponse>(`/api/tasks/${row.task_id}/assign`, { owner_id: owner, acted_by: me });
      setReceipt({
        task: row.task_title,
        field: "Owner",
        before: "No owner",
        after: names[owner] ?? null,
        decidedBy: names[me] ?? null,
        at: new Date().toISOString(),
        decision: "owner",
      });
      reload();
    } catch (e) {
      setError(key, `Not saved: ${errorText(e)}. Nothing changed. Try again.`);
    } finally {
      setBusy(null);
    }
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      setTab(tab === "waiting" ? "resolved" : "waiting");
      e.preventDefault();
    }
  }

  const waitingCount = visible.length;

  return (
    <>
      <PageHead
        eyebrow="Decisions"
        title={tab === "waiting" && data && !loadError && waitingCount === 0 ? "Nothing waiting for you." : "A few decisions. Work moving again."}
        subtitle="Date changes and unowned tasks wait here. Nothing moves until the workstream owner decides."
      />

      <div className="grid gap-8 min-[1080px]:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Decisions" onKeyDown={onTabKey} className="inline-flex rounded-[10px] border border-line bg-paper p-1">
              {(["waiting", "resolved"] as Tab[]).map((t) => (
                <button
                  key={t}
                  id={`tab-${t}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  aria-controls={`panel-${t}`}
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => setTab(t)}
                  className={`min-h-11 rounded-[8px] px-4 text-[15px] font-semibold ${tab === t ? "bg-forest text-canvas" : "text-ink-2"}`}
                >
                  {t === "waiting" ? `Waiting${waitingCount ? ` (${waitingCount})` : ""}` : "Resolved"}
                </button>
              ))}
            </div>
            {tab === "waiting" && (
              <label className="flex min-h-11 items-center gap-2 text-[14.5px]">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4 accent-forest" />
                Show everyone&apos;s decisions
              </label>
            )}
          </div>

          {teamError && <Notice tone="danger" title="Could not load the team">{teamError}</Notice>}
          {notice && <Notice tone="warn">{notice}</Notice>}
          {loadError && <Notice tone="danger" title="Could not load decisions">{loadError}</Notice>}
          {!lead && !teamError && <Notice tone="warn" title="No team lead set">Decisions can only be made by the team lead, so none can be made until one is set.</Notice>}

          {tab === "waiting" && (
            <div id="panel-waiting" role="tabpanel" aria-labelledby="tab-waiting" className="space-y-4">
              {!data && !loadError && <p className="text-muted">Loading decisions…</p>}
              {data && waitingCount === 0 && (
                <Card className="p-6">
                  <p className="font-serif text-[22px]">Nothing waiting for you.</p>
                  <p className="mt-1 text-muted">Date changes and unowned tasks appear here when they need a decision.</p>
                </Card>
              )}
              {visible.map((row) => (
                <DecisionCard
                  key={`${row.kind}-${row.decision_id ?? row.task_id}`}
                  row={row}
                  data={data!}
                  names={names}
                  team={team ?? []}
                  me={me}
                  busy={busy === (row.decision_id ?? row.task_id)}
                  confirm={confirm}
                  error={cardErrors[row.decision_id ?? row.task_id] || null}
                  picked={picked[row.task_id] ?? ""}
                  onPick={(v) => setPicked((p) => ({ ...p, [row.task_id]: v }))}
                  onAsk={(decision) => setConfirm({ key: row.decision_id ?? "", decision })}
                  onCancel={() => setConfirm(null)}
                  onDecide={(decision) => decideDate(row, decision)}
                  onAssign={() => assignOwner(row)}
                />
              ))}
            </div>
          )}

          {tab === "resolved" && (
            <div id="panel-resolved" role="tabpanel" aria-labelledby="tab-resolved">
              {data && data.resolved.length === 0 && <p className="text-muted">No decisions have been made yet.</p>}
              <ul className="space-y-3">
                {data?.resolved.map((r) => (
                  <li key={r.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-serif text-[18px]">{r.tasks?.title ?? "Task"}</p>
                        <p className="text-[14px] text-muted">
                          {r.status === "approved"
                            ? `Moved from ${formatDay(r.current_due_date)} to ${formatDay(r.requested_due_date)}`
                            : `Kept ${formatDay(r.current_due_date)}`}
                          {r.decided_at ? ` · ${formatWhen(r.decided_at)}` : ""}
                        </p>
                      </div>
                      <Pill tone={r.status === "approved" ? "ok" : "grey"}>{r.status === "approved" ? "Approved" : "Declined"}</Pill>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside aria-label="Latest change" className="space-y-4">
          <Card className="p-5">
            <Eyebrow>Latest change receipt</Eyebrow>
            {latest ? (
              <div className="mt-4 space-y-3 text-[15px]">
                <p className="font-serif text-[20px] leading-snug">{latest.task}</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="rounded-[10px] bg-canvas p-3">
                    <p className="text-[12.5px] text-muted">Before</p>
                    <p className="font-semibold">{latest.before ? formatDay(latest.before) : "No date"}</p>
                  </div>
                  <span aria-hidden className="text-muted">→</span>
                  <div className="rounded-[10px] bg-lime-wash p-3">
                    <p className="text-[12.5px] text-muted">After</p>
                    <p className="font-semibold">{latest.after ? formatDay(latest.after) : "No date"}</p>
                  </div>
                </div>
                <p className="text-muted">
                  {latest.decidedBy ? `Decided by ${latest.decidedBy}` : "Decided by the workstream owner"} · {formatWhen(latest.at)}
                </p>
                <p className="rounded-[10px] bg-warn-bg px-3 py-2 text-[14px] text-warn">No notice sent</p>
              </div>
            ) : (
              <p className="mt-3 text-muted">The most recent change will appear here once a decision is made.</p>
            )}
          </Card>

          <Card className="bg-lime-soft p-5" aria-live="polite">
            <svg viewBox="0 0 240 60" className="h-14 w-full" aria-hidden>
              <path
                d="M4 30 C 60 4, 90 56, 130 30 S 200 4, 236 30"
                fill="none"
                stroke="#215846"
                strokeWidth="2"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={justDecided ? 0 : 100}
                className="transition-[stroke-dashoffset] duration-[1200ms] ease-out"
              />
            </svg>
            <p className="font-serif text-[20px]">One less loose end.</p>
            <p className="text-[14px] text-ink-2">The thread closes once a decision is made here.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}

function receiptFromResolved(r: ResolvedRow, names: Record<string, string>): Receipt {
  return {
    task: r.tasks?.title ?? "Task",
    field: "Due date",
    before: r.current_due_date,
    after: r.status === "approved" ? r.requested_due_date : r.current_due_date,
    decidedBy: r.requested_by ? (names[r.requested_by] ?? null) : null,
    at: r.decided_at ?? r.created_at,
    decision: r.status === "approved" ? "approved" : "declined",
  };
}

function DecisionCard({
  row,
  data,
  names,
  team,
  me,
  busy,
  confirm,
  error,
  picked,
  onPick,
  onAsk,
  onCancel,
  onDecide,
  onAssign,
}: {
  row: DecisionNeededRow;
  data: Loaded;
  names: Record<string, string>;
  team: TeamMember[];
  me: string | null;
  busy: boolean;
  confirm: { key: string; decision: "approved" | "declined" } | null;
  error: string | null;
  picked: string;
  onPick: (id: string) => void;
  onAsk: (decision: "approved" | "declined") => void;
  onCancel: () => void;
  onDecide: (decision: "approved" | "declined") => void;
  onAssign: () => void;
}) {
  const approverName = row.approver_id ? (names[row.approver_id] ?? "the workstream owner") : "the team lead";
  const mayDecide = canDecide(me, row.approver_id);
  const info = data.tasks[row.task_id];
  const quote = data.quotes[row.task_id];
  const target = row.workstream_id ? data.targets[row.workstream_id] : null;
  const pending = row.kind === "date_change" && row.decision_id !== null && confirm?.key === row.decision_id ? confirm.decision : null;

  if (row.kind === "assign_owner") {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="warn">Needs an owner</Pill>
          <span className="text-[14px] text-muted">{row.workstream_name ?? "No workstream"} · {short(row.task_id)}</span>
        </div>
        <p className="font-serif text-[20px]">{row.task_title}</p>
        {(info?.source_sentence || quote) && (
          <blockquote className="rounded-[10px] border-l-[3px] border-lime bg-canvas px-4 py-3">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">From your notes · exact words</p>
            <p className="mt-1">&ldquo;{info?.source_sentence ?? quote}&rdquo;</p>
          </blockquote>
        )}
        {mayDecide ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1">
              <span className="block text-[14.5px] font-semibold">Owner</span>
              <select className={inputClass} value={picked} onChange={(e) => onPick(e.target.value)}>
                <option value="">Choose a person</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="primary" onClick={onAssign} disabled={!picked || busy}>
              {busy ? "Saving…" : "Assign owner"}
            </Button>
          </div>
        ) : (
          <p className="text-muted">Only {approverName} can decide this.</p>
        )}
        {error && <Notice tone={error.startsWith("Already") ? "warn" : "danger"}>{error}</Notice>}
      </Card>
    );
  }

  const current = row.current_due_date;
  const requested = row.requested_due_date;
  const moved = daysBetween(current, requested);
  const requestedBy = row.requested_by_name ?? "someone";

  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="lime">Date change</Pill>
        <span className="text-[14px] text-muted">{row.workstream_name ?? "No workstream"} · {short(row.task_id)}</span>
      </div>
      <div>
        <p className="font-serif text-[22px] leading-snug">{row.task_title}</p>
        <p className="mt-1 text-[14px] text-muted">
          Requested by {requestedBy} by email reply{row.created_at ? ` · ${formatWhen(row.created_at)}` : ""} · goes to {approverName}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-line bg-canvas p-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">Current · approved</p>
          <p className="mt-1 font-serif text-[22px]">{formatDay(current)}</p>
          <p className="text-[13.5px] text-muted">Applies until you decide</p>
        </div>
        <div className="rounded-[10px] border border-line bg-lime-wash p-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">Requested · not approved</p>
          <p className="mt-1 font-serif text-[22px]">{formatDay(requested)}</p>
          {moved !== null && <p className="text-[13.5px] text-muted">{moved > 0 ? `Moves ${moved} days later` : moved < 0 ? `Moves ${-moved} days earlier` : "Same day"}</p>}
        </div>
      </div>

      {leavesNoBuffer(requested, target) && (
        <p className="rounded-[10px] border border-dashed border-warn-line px-3 py-2 text-[14px] text-warn">
          <span className="font-semibold">Inference:</span> approving leaves no buffer before the workstream target.
        </p>
      )}

      {row.reason && (
        <blockquote className="rounded-[10px] border-l-[3px] border-lime bg-canvas px-4 py-3">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">Reason given</p>
          <p className="mt-1">{row.reason}</p>
        </blockquote>
      )}
      {info?.blocker && <p className="text-[15px]"><span className="font-semibold">Linked blocker:</span> {info.blocker}</p>}
      {quote && (
        <blockquote className="rounded-[10px] border-l-[3px] border-lime bg-canvas px-4 py-3">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">Original reply</p>
          <p className="mt-1">&ldquo;{quote}&rdquo;</p>
        </blockquote>
      )}

      {!mayDecide ? (
        <p className="text-muted">Only {approverName} can decide this.</p>
      ) : pending ? (
        <div className="rounded-[10px] bg-lime-wash p-4">
          <p className="font-semibold">
            {pending === "approved"
              ? `Move the due date to ${formatDay(requested)}? It will show that date from now on.`
              : `Keep ${formatDay(current)}? The request is closed and nothing is emailed yet.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onDecide(pending)} disabled={busy}>
              {busy ? "Saving…" : pending === "approved" ? `Yes, move to ${formatDay(requested)}` : "Yes, keep it"}
            </Button>
            <Button onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => onAsk("approved")} disabled={busy}>
            Approve {formatDay(requested)}
          </Button>
          <Button onClick={() => onAsk("declined")} disabled={busy}>
            Decline, keep {formatDay(current)}
          </Button>
        </div>
      )}

      {error && <Notice tone={error.startsWith("Already") ? "warn" : "danger"}>{error}</Notice>}
    </Card>
  );
}
