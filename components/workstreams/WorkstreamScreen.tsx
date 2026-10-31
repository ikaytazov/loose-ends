"use client";

// Workstream page (/workstreams/[id]): header, progress, the task table and the task side panel (issue #3,
// mockup docs/mockups/02-workstream-task-panel.png, BUILD-SPEC §3.5). The open task is kept in the URL (?task=)
// so a link can point straight at it. Reloads by itself when tasks, date requests or the log change.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { errorText } from "@/components/api";
import { loadBoard, type Board } from "@/components/board/data";
import { activityHeadline, daysSince, filterTasks, isOpen, reasonLine, rowsShowingQuote, sortTasks, type TaskFilter } from "@/components/board/logic";
import {
  Avatar,
  firstName,
  HealthPill,
  Icon,
  NeedsOwnerPill,
  ProgressBar,
  QUIET_DAYS,
  Quote,
  SOURCE_LABEL,
  StatusPill,
  timeAgo,
  useLiveVersion,
} from "@/components/board/pieces";
import { formatDay, formatWhen } from "@/components/format";
import { useTeam } from "@/components/use-team";
import { Button, Card, Notice, inputClass } from "@/components/ui";
import type { ActivityLogEntry, DecisionNeededRow, TaskBoardRow } from "@/lib/contracts/domain";

type Tab = "tasks" | "updates";

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "All tasks" },
  { value: "open", label: "Open" },
  { value: "blocked", label: "Blocked" },
  { value: "quiet", label: "No reply yet" },
  { value: "done", label: "Done" },
];

const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

export function WorkstreamScreen({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("task");
  const { team } = useTeam();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState<Tab>("tasks");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [owner, setOwner] = useState("");
  const [search, setSearch] = useState("");
  const live = useLiveVersion(`workstream-${id}`);
  const lastOpener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;
    loadBoard({ workstreamId: id, activityLimit: 200 })
      .then((b) => {
        if (!alive) return;
        setBoard(b);
        setError(null);
        setNow(Date.now());
      })
      .catch((e: unknown) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [id, live, retry]);

  const names = useMemo(() => Object.fromEntries((team ?? []).map((m) => [m.id, m.name])), [team]);

  const openTask = useCallback(
    (taskId: string | null, opener?: HTMLButtonElement | null) => {
      if (opener) lastOpener.current = opener;
      const next = new URLSearchParams(params.toString());
      if (taskId) next.set("task", taskId);
      else next.delete("task");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      if (!taskId) setTimeout(() => lastOpener.current?.focus(), 0);
    },
    [params, pathname, router],
  );

  if (error) {
    return (
      <div className="space-y-4">
        <Notice tone="danger" title="Couldn’t load this workstream">
          {error}
        </Notice>
        <Button onClick={() => setRetry((r) => r + 1)}>Retry</Button>
      </div>
    );
  }
  if (!board) return <p className="text-muted">Loading the workstream…</p>;

  const stream = board.streams[0];
  if (!stream) {
    return (
      <Card className="p-6">
        <p className="font-semibold">This workstream doesn’t exist.</p>
        <p className="mt-1 text-muted">It may have been removed when the demo data was reset.</p>
        <Link href="/workstreams" className="mt-3 inline-block font-semibold text-forest-2 underline underline-offset-4">
          Back to workstreams
        </Link>
      </Card>
    );
  }

  const tasks = board.tasks;
  const counts = {
    done: tasks.filter((t) => t.status === "done").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    not_started: tasks.filter((t) => t.status === "not_started").length,
  };
  const reason = reasonLine(stream.health, tasks, board.decisions, now);
  const rows = sortTasks(filterTasks(tasks, filter, owner, search, now));
  const selected = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null;
  const owners = [...new Map(tasks.filter((t) => t.owner_id).map((t) => [t.owner_id as string, t.owner_name ?? "Unknown"])).entries()];

  return (
    <div className={selected ? "min-[1080px]:grid min-[1080px]:grid-cols-[minmax(0,1fr)_400px] min-[1080px]:items-start min-[1080px]:gap-6" : ""}>
      <div className="min-w-0">
        <Link href="/workstreams" className="inline-flex items-center gap-1.5 text-[14.5px] text-ink-2 hover:underline">
          <Icon name="arrow-left" /> Back to workstreams
        </Link>
        <h1 className="mt-2 font-serif text-[clamp(36px,4vw,56px)] leading-[1.05] tracking-[-0.02em] text-ink">{stream.name}</h1>
        <p className="mt-2 text-[19px] text-muted">
          {stream.goal ?? "No goal set"}
          {stream.target_date && <> · target {formatDay(stream.target_date)}</>}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={stream.owner_name} />
            <div>
              <p className="font-semibold">{stream.owner_name ?? "No owner"}</p>
              <p className="text-[13.5px] text-muted">Workstream owner · approves date changes</p>
            </div>
          </div>
          <HealthPill health={stream.health} />
          {stream.target_date && (
            <p className="flex items-center gap-2 text-[14.5px]">
              <Icon name="calendar" className="size-5 text-muted" /> Target: {formatDay(stream.target_date)}
            </p>
          )}
        </div>

        {reason && (
          <p
            className={`mt-5 flex items-start gap-2 rounded-[10px] px-4 py-3 text-[15px] ${
              stream.health === "blocked" ? "bg-danger-bg text-danger" : stream.health === "update_needed" ? "bg-warn-bg text-warn" : "bg-lime-wash text-forest"
            }`}
          >
            <Icon name={stream.health === "blocked" ? "triangle" : stream.health === "update_needed" ? "clock" : "doc"} className="mt-0.5 size-4 shrink-0" />
            <span>
              <b>{stream.health === "blocked" ? "Why blocked: " : stream.health === "update_needed" ? "Gone quiet: " : "Waiting on a decision: "}</b>
              {reason}
            </span>
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
          <Tile value={tasks.length} label="approved tasks" />
          <Tile value={counts.done} label="done" />
          <Tile value={counts.blocked} label="blocked" />
          <Tile value={board.decisions.length} label={board.decisions.length === 1 ? "decision needed" : "decisions needed"} />
        </div>

        <Card className="mt-4 p-5">
          <p className="font-serif text-[24px] text-ink">
            {stream.done_tasks} of {stream.total_tasks} recorded tasks done
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-ink-2">
            <Legend dot="bg-forest" text={`${counts.done} done`} />
            <Legend dot="bg-ok" text={`${counts.in_progress} in progress`} />
            <Legend dot="bg-danger" text={`${counts.blocked} blocked`} />
            <Legend dot="bg-line" text={`${counts.not_started} not started`} />
          </ul>
          <div className="mt-3">
            <ProgressBar done={stream.done_tasks} total={stream.total_tasks} label={`${stream.done_tasks} of ${stream.total_tasks} tasks done`} />
          </div>
        </Card>

        <Tabs tab={tab} setTab={setTab} updates={board.activity.length} />

        {tab === "tasks" ? (
          <Card className="mt-4">
            <div className="flex flex-wrap items-center gap-3 border-b border-line-2 p-4">
              <h2 className="mr-auto font-serif text-[22px]">Tasks</h2>
              <label className="w-full min-[560px]:w-56">
                <span className="sr-only">Search tasks</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className={`${inputClass} mt-0`} />
              </label>
              <label>
                <span className="sr-only">Filter by owner</span>
                <select value={owner} onChange={(e) => setOwner(e.target.value)} className={`${inputClass} mt-0 w-auto`}>
                  <option value="">Everyone</option>
                  {owners.map(([oid, name]) => (
                    <option key={oid} value={oid}>
                      {name}
                    </option>
                  ))}
                  <option value="none">No owner</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by status</span>
                <select value={filter} onChange={(e) => setFilter(e.target.value as TaskFilter)} className={`${inputClass} mt-0 w-auto`}>
                  {FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_auto_minmax(0,1.1fr)] gap-4 border-b border-line-2 px-5 py-3 text-[13px] font-semibold text-muted min-[720px]:grid">
              <span>Task</span>
              <span>Owner</span>
              <span>Approved due</span>
              <span>Status</span>
              <span>Last update</span>
            </div>
            {tasks.length === 0 && <p className="p-5 text-muted">No approved tasks yet. Capture meeting notes and approve them to fill this list.</p>}
            {tasks.length > 0 && rows.length === 0 && <p className="p-5 text-muted">No tasks match these filters.</p>}
            <ul>
              {rows.map((t) => (
                <li key={t.id} className="border-b border-line-2 last:border-b-0">
                  <TaskRow task={t} selected={t.id === selectedId} now={now} onOpen={(el) => openTask(t.id, el)} />
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 border-t border-line-2 px-5 py-3 text-[13.5px] text-muted">
              <Icon name="clock" className="size-4" /> No update is shown as unknown, never assumed done.
            </p>
          </Card>
        ) : (
          <Card className="mt-4 p-5">
            <h2 className="font-serif text-[22px]">Updates</h2>
            <Timeline entries={board.activity} tasks={tasks} names={names} now={now} showTask />
          </Card>
        )}
      </div>

      {selected && (
        <TaskPanel
          key={selected.id}
          task={selected}
          workstreamName={stream.name}
          decision={board.decisions.find((d) => d.decision_id && d.decision_id === selected.pending_date_request_id) ?? null}
          activity={board.activity.filter((a) => a.task_id === selected.id)}
          names={names}
          now={now}
          onClose={() => openTask(null)}
        />
      )}
      {selectedId && !selected && (
        <Notice tone="warn" title="That task isn’t in this workstream any more.">
          <button type="button" className="underline" onClick={() => openTask(null)}>
            Close
          </button>
        </Notice>
      )}
    </div>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-paper p-4 shadow-card">
      <p className="font-serif text-[34px] leading-none text-ink">{value}</p>
      <p className="mt-1 text-[14px] text-muted">{label}</p>
    </div>
  );
}

function Legend({ dot, text }: { dot: string; text: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {text}
    </li>
  );
}

function Tabs({ tab, setTab, updates }: { tab: Tab; setTab: (t: Tab) => void; updates: number }) {
  const order: Tab[] = ["tasks", "updates"];
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = order[(order.indexOf(tab) + (e.key === "ArrowRight" ? 1 : order.length - 1)) % order.length];
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }
  return (
    <div role="tablist" aria-label="Workstream sections" onKeyDown={onKey} className="mt-8 flex gap-6 border-b border-line">
      {order.map((t) => (
        <button
          key={t}
          id={`tab-${t}`}
          role="tab"
          type="button"
          aria-selected={tab === t}
          tabIndex={tab === t ? 0 : -1}
          onClick={() => setTab(t)}
          className={`-mb-px border-b-[3px] px-1 pb-3 text-[16px] ${tab === t ? "border-lime font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
        >
          {t === "tasks" ? "Tasks" : `Updates (${updates})`}
        </button>
      ))}
    </div>
  );
}

function lastUpdateText(t: TaskBoardRow, now: number): { text: string; warn: boolean } {
  const days = daysSince(t.last_update_at, now);
  if (isOpen(t.status) && days >= QUIET_DAYS) return { text: `No update · ${days} days`, warn: true };
  if (!t.last_update_source) return { text: "No reply yet", warn: false };
  return { text: `${timeAgo(t.last_update_at, now)} · ${SOURCE_LABEL[t.last_update_source]}`, warn: false };
}

function TaskRow({ task: t, selected, now, onOpen }: { task: TaskBoardRow; selected: boolean; now: number; onOpen: (el: HTMLButtonElement) => void }) {
  const last = lastUpdateText(t, now);
  return (
    <div
      className={`grid gap-x-4 gap-y-2 px-5 py-4 min-[720px]:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_auto_minmax(0,1.1fr)] min-[720px]:items-center ${
        selected ? "bg-lime-wash" : t.is_overdue ? "bg-danger-bg/50" : ""
      }`}
    >
      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget)}
        aria-expanded={selected}
        className="flex items-start gap-2 text-left font-serif text-[19px] leading-snug text-ink hover:underline"
      >
        {t.status === "done" ? <Icon name="check" className="mt-1 size-4 shrink-0 text-ok" /> : <Icon name="doc" className="mt-1 size-4 shrink-0 text-muted" />}
        {t.title}
      </button>
      <span className="flex items-center gap-2 text-[14.5px]">
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted min-[720px]:hidden">Owner</span>
        {t.owner_name ? (
          <>
            <Avatar name={t.owner_name} size="sm" />
            {t.owner_name}
          </>
        ) : (
          <NeedsOwnerPill />
        )}
      </span>
      <span className="text-[14.5px]">
        <span className="mr-2 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted min-[720px]:hidden">Due</span>
        <span className={t.is_overdue ? "font-semibold text-danger" : ""}>{formatDay(t.due_date)}</span>
        {t.is_overdue && <span className="ml-1.5 text-[13px] font-semibold text-danger">Overdue</span>}
        {t.pending_requested_due_date && (
          <span className="block text-[13px] text-muted">Requested {formatDay(t.pending_requested_due_date)} · not approved</span>
        )}
      </span>
      <span>
        <StatusPill status={t.status} />
      </span>
      <span className={`text-[14px] ${last.warn ? "font-semibold text-warn" : "text-ink-2"}`}>{last.text}</span>
    </div>
  );
}

function PanelRow({ icon, label, children }: { icon: "person" | "calendar" | "clock" | "triangle" | "flag" | "dot"; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[20px_120px_minmax(0,1fr)] items-start gap-2 border-t border-line-2 py-3 text-[14.5px]">
      <Icon name={icon} className="mt-0.5 size-4 text-muted" />
      <dt className="text-ink-2">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function TaskPanel({
  task: t,
  workstreamName,
  decision,
  activity,
  names,
  now,
  onClose,
}: {
  task: TaskBoardRow;
  workstreamName: string;
  decision: DecisionNeededRow | null;
  activity: ActivityLogEntry[];
  names: Record<string, string>;
  now: number;
  onClose: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  // One reply logs several rows at the same moment, sometimes each with a fragment: show the fullest one.
  const newestQuoted = activity.find((a) => a.quote);
  const lastQuote = newestQuoted
    ? activity
        .filter((a) => a.quote && Math.abs(Date.parse(a.created_at) - Date.parse(newestQuoted.created_at)) < 10_000)
        .reduce((best, a) => ((a.quote ?? "").length > (best.quote ?? "").length ? a : best), newestQuoted)
    : undefined;

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Focus moves into the panel once, when it opens (not on every live reload); Esc closes it.
  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40 min-[1080px]:hidden" onClick={onClose} aria-hidden />
      <aside
        aria-labelledby="task-panel-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] overflow-y-auto bg-paper p-5 shadow-xl min-[1080px]:sticky min-[1080px]:top-24 min-[1080px]:z-auto min-[1080px]:max-h-[calc(100vh-7rem)] min-[1080px]:max-w-none min-[1080px]:rounded-[14px] min-[1080px]:border min-[1080px]:border-line min-[1080px]:shadow-card"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="task-panel-title" ref={headingRef} tabIndex={-1} style={{ outline: "none" }} className="font-serif text-[26px] leading-tight text-ink">
              {t.title}
            </h2>
            <p className="mt-1 text-[13.5px] text-muted">In {workstreamName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task panel" className="grid size-10 place-items-center rounded-[10px] hover:bg-canvas">
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <h3 className="mt-5 flex items-center gap-2 font-semibold">
          <Icon name="mail" /> Latest update
        </h3>
        <div className="mt-2">
          {lastQuote?.quote ? (
            <Quote by={`${lastQuote.actor_id && names[lastQuote.actor_id] ? names[lastQuote.actor_id] : "Someone"} · ${SOURCE_LABEL[lastQuote.source]} · ${formatWhen(lastQuote.created_at)}`}>
              {lastQuote.quote}
            </Quote>
          ) : (
            <p className="text-[14.5px] text-muted">{t.last_update_source ? `Updated ${timeAgo(t.last_update_at, now)}, with no message.` : "No reply yet."}</p>
          )}
        </div>

        <dl className="mt-4">
          <PanelRow icon="person" label="Owner">
            {t.owner_name ? (
              <span className="flex items-center gap-2">
                <Avatar name={t.owner_name} size="sm" />
                {t.owner_name}
              </span>
            ) : (
              <span className="flex flex-col items-start gap-1.5">
                <NeedsOwnerPill />
                <Link href="/decisions" className="text-[13.5px] font-semibold text-forest-2 underline underline-offset-4">
                  Assign on Decisions
                </Link>
              </span>
            )}
          </PanelRow>
          <PanelRow icon="calendar" label="Approved due date">
            <span className={t.is_overdue ? "font-semibold text-danger" : ""}>{formatDay(t.due_date)}</span>
            {t.is_overdue && <span className="ml-1.5 text-[13px] font-semibold text-danger">Overdue</span>}
          </PanelRow>
          {t.pending_requested_due_date && (
            <PanelRow icon="calendar" label="Requested date">
              <span className="block rounded-[8px] bg-lime-wash px-2 py-1">{formatDay(t.pending_requested_due_date)}</span>
              <span className="mt-1 block text-[13px] text-muted">
                Requested by {firstName(decision?.requested_by_name) || "the owner"}. Not approved, so the date above still applies.
              </span>
            </PanelRow>
          )}
          <PanelRow icon="dot" label="Status">
            <StatusPill status={t.status} />
          </PanelRow>
          <PanelRow icon="triangle" label="Blocker">
            {t.blocker ?? <span className="text-muted">None</span>}
          </PanelRow>
          <PanelRow icon="flag" label="Priority">
            {PRIORITY_LABEL[t.priority]}
          </PanelRow>
        </dl>

        {t.pending_date_request_id && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-canvas p-3">
            <span className="text-[14.5px]">
              Request for more time · <b className="text-warn">Pending</b>
            </span>
            <Link href="/decisions" className="ml-auto inline-flex min-h-10 items-center rounded-[10px] bg-forest px-4 text-[14.5px] font-semibold text-canvas hover:bg-forest-2">
              Review date request
            </Link>
          </div>
        )}

        <h3 className="mt-6 font-semibold">History</h3>
        <Timeline entries={activity} tasks={[t]} names={names} now={now} />

        {t.source_sentence && (
          <>
            <h3 className="mt-6 font-semibold">Source in meeting notes</h3>
            <div className="mt-2">
              <Quote>{t.source_sentence}</Quote>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Timeline({
  entries,
  tasks,
  names,
  now,
  showTask = false,
}: {
  entries: ActivityLogEntry[];
  tasks: TaskBoardRow[];
  names: Record<string, string>;
  now: number;
  showTask?: boolean;
}) {
  const titles = Object.fromEntries(tasks.map((t) => [t.id, t.title]));
  const withQuote = rowsShowingQuote(entries);
  if (!entries.length) return <p className="mt-2 text-[14.5px] text-muted">No changes recorded yet.</p>;
  return (
    <ol className="mt-3 space-y-4">
      {entries.map((a) => (
        <li key={a.id} className="border-l-2 border-line pl-4">
          <p className="font-semibold text-ink">{activityHeadline(a, names)}</p>
          <p className="text-[13.5px] text-muted">
            {showTask && a.task_id && titles[a.task_id] ? `${titles[a.task_id]} · ` : ""}
            {a.actor_id && names[a.actor_id] ? `${names[a.actor_id]} · ` : ""}
            {SOURCE_LABEL[a.source]} · <span title={formatWhen(a.created_at)}>{timeAgo(a.created_at, now)}</span>
          </p>
          {a.quote && withQuote.has(a.id) && (
            <div className="mt-2">
              <Quote>{a.quote}</Quote>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
