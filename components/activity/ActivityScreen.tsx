"use client";

// Activity (/activity): every change has a trail (BUILD-SPEC §3.6). One card per email reply (their words, then what
// Loose Ends recorded), a receipt per date decision, one card per batch of approved tasks. Grouped by day in
// Pacific time, filterable, and live. Built only from activity_log, tasks and date_requests: the browser can't read
// the emails table, so a reply is shown through the words quoted in the log.
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { errorText } from "@/components/api";
import { changesByTask, dayLabel, eventActor, groupByDay, matchesFilter, timeOfDay, toEvents, type ActivityEvent, type ActivityFilter } from "@/components/activity/logic";
import { activityHeadline } from "@/components/board/logic";
import { Avatar, firstName, Icon, Quote, SOURCE_LABEL, useLiveVersion } from "@/components/board/pieces";
import { formatDay } from "@/components/format";
import { useTeam } from "@/components/use-team";
import { Button, Card, Notice, PageHead, inputClass } from "@/components/ui";
import type { ActivityLogEntry, DateRequest, TaskBoardRow } from "@/lib/contracts/domain";
import { browserSupabase } from "@/lib/supabase/browser";

const LIMIT = 300;

type TaskInfo = Pick<TaskBoardRow, "id" | "title" | "workstream_id" | "workstream_name" | "source_sentence">;
type Loaded = { rows: ActivityLogEntry[]; tasks: Record<string, TaskInfo>; decided: DateRequest[] };

async function loadActivity(): Promise<Loaded> {
  const sb = browserSupabase();
  const [a, t, d] = await Promise.all([
    sb.from("activity_log").select("*").order("created_at", { ascending: false }).limit(LIMIT),
    sb.from("task_board").select("id, title, workstream_id, workstream_name, source_sentence"),
    sb.from("date_requests").select("*").neq("status", "waiting").order("decided_at", { ascending: false }).limit(100),
  ]);
  for (const r of [a, t, d]) if (r.error) throw new Error(r.error.message);
  const tasks: Record<string, TaskInfo> = {};
  for (const x of (t.data ?? []) as TaskInfo[]) tasks[x.id] = x;
  return { rows: (a.data ?? []) as ActivityLogEntry[], tasks, decided: (d.data ?? []) as DateRequest[] };
}

const FILTERS: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "replies", label: "Replies" },
  { value: "decisions", label: "Decisions" },
  { value: "tasks", label: "Tasks" },
];

export function ActivityScreen() {
  const { team } = useTeam();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(0);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [person, setPerson] = useState("");
  const live = useLiveVersion("activity");

  useEffect(() => {
    let alive = true;
    loadActivity()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
        setNow(Date.now());
      })
      .catch((e: unknown) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [live, retry]);

  const names = useMemo(() => Object.fromEntries((team ?? []).map((m) => [m.id, m.name])), [team]);
  const events = useMemo(() => toEvents(data?.rows ?? []), [data]);
  const shown = events.filter((e) => matchesFilter(e, filter) && (!person || eventActor(e) === person));
  const days = groupByDay(shown);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.value, events.filter((e) => matchesFilter(e, f.value)).length])) as Record<ActivityFilter, number>;

  return (
    <>
      <PageHead thread title="Every change has a trail." subtitle="Each reply, decision and approval, with the exact words behind it. Newest first, in Pacific time." />

      {error && (
        <div className="mb-6 space-y-4">
          <Notice tone="danger" title="Couldn’t load the activity">
            {error}
          </Notice>
          <Button onClick={() => setRetry((r) => r + 1)}>Retry</Button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter activity" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[14.5px] font-semibold ${
                filter === f.value ? "border-lime bg-lime-soft text-forest" : "border-line bg-paper text-ink hover:bg-canvas"
              }`}
            >
              {f.label}
              {data && <span className="text-muted">{counts[f.value]}</span>}
            </button>
          ))}
        </div>
        <label className="ml-auto">
          <span className="sr-only">Filter by person</span>
          <select value={person} onChange={(e) => setPerson(e.target.value)} className={`${inputClass} mt-0 w-auto`}>
            <option value="">Everyone</option>
            {(team ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!data && !error && <div className="h-48 animate-pulse rounded-[14px] border border-line bg-paper" />}
      {data && events.length === 0 && (
        <Card className="p-6">
          <p className="font-semibold">No changes yet.</p>
          <p className="mt-1 text-muted">They appear here when tasks are approved, replies come in, or dates are decided.</p>
        </Card>
      )}
      {data && events.length > 0 && shown.length === 0 && <p className="text-muted">Nothing matches these filters.</p>}

      <div className="space-y-8">
        {days.map((g) => (
          <section key={g.day} aria-labelledby={`day-${g.day}`}>
            <h2 id={`day-${g.day}`} className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">
              {dayLabel(g.day, now)}
            </h2>
            <ol className="space-y-3">
              {g.events.map((ev) => (
                <li key={ev.id}>
                  <EventCard ev={ev} data={data!} names={names} />
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="mt-8 text-[14px] text-muted">
        Replies go to the team address and are checked every minute.
        {data && data.rows.length >= LIMIT && ` Showing the latest ${LIMIT} changes.`}
      </p>
    </>
  );
}

function TaskLink({ id, tasks }: { id: string | null; tasks: Record<string, TaskInfo> }) {
  const t = id ? tasks[id] : undefined;
  if (!t) return <span className="text-muted">a task that was removed</span>;
  if (!t.workstream_id) return <span className="font-semibold">{t.title}</span>;
  return (
    <Link href={`/workstreams/${t.workstream_id}?task=${t.id}`} className="font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-forest-2">
      {t.title}
    </Link>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return <p className="text-[13.5px] text-muted">{children}</p>;
}

function EventCard({ ev, data, names }: { ev: ActivityEvent; data: Loaded; names: Record<string, string> }) {
  const who = (id: string | null) => (id && names[id] ? names[id] : null);

  if (ev.kind === "reply") {
    const name = who(ev.actor_id);
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Avatar name={name} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {name ? `${firstName(name)}’s reply` : "A reply"}
              <span className="ml-2 inline-flex items-center gap-1 text-[13.5px] font-normal text-muted">
                <Icon name="mail" className="size-3.5" /> email · {timeOfDay(ev.at)}
              </span>
            </p>
            {ev.quote && (
              <div className="mt-2">
                <Quote>{ev.quote}</Quote>
              </div>
            )}
            <p className="mt-3 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">What Loose Ends recorded</p>
            {ev.changes.length === 0 ? (
              <p className="mt-1 text-[14.5px] text-ink-2">No task changed · {ev.unclear ? "asked which task they meant" : "nothing to update"}</p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {changesByTask(ev.changes).map((g) => (
                  <li key={g.task_id ?? g.changes[0].id} className="flex flex-wrap items-baseline gap-x-2 text-[14.5px]">
                    <Icon name="check" className="size-3.5 shrink-0 self-center text-ok" />
                    <TaskLink id={g.task_id} tasks={data.tasks} />
                    <span className="text-ink-2">
                      → {g.changes
                        .map((c, i) => {
                          const h = activityHeadline(c, names);
                          return i === 0 ? h : h.charAt(0).toLowerCase() + h.slice(1);
                        })
                        .join(" · ")}
                    </span>
                  </li>
                ))}
                {ev.unclear && <li className="text-[14.5px] text-ink-2">Part of the reply was unclear, so Loose Ends asked a question instead of guessing.</li>}
              </ul>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (ev.kind === "decision") {
    const e = ev.entry;
    const decider = who(e.actor_id);
    // The matching request: same task, decided around the same moment.
    const req = data.decided
      .filter((d) => d.task_id === e.task_id && d.decided_at)
      .sort((a, b) => Math.abs(Date.parse(a.decided_at!) - Date.parse(e.created_at)) - Math.abs(Date.parse(b.decided_at!) - Date.parse(e.created_at)))[0];
    const asked = data.rows.find((r) => r.task_id === e.task_id && r.field === "date_request" && r.created_at <= e.created_at && r.quote);
    const requester = who(req?.requested_by ?? null);
    const before = e.old_value ?? req?.current_due_date ?? null;
    const after = ev.approved ? e.new_value : before;
    const task = e.task_id ? data.tasks[e.task_id] : undefined;
    return (
      <Card className="p-5">
        <p className="font-semibold">
          {decider ? firstName(decider) : "The workstream owner"} {ev.approved ? "approved a new date" : "kept the current date"}
          <span className="ml-2 text-[13.5px] font-normal text-muted">· decision · {timeOfDay(ev.at)}</span>
        </p>
        <p className="mt-1 text-[14.5px]">
          <TaskLink id={e.task_id} tasks={data.tasks} />
          {task?.workstream_name && <span className="text-muted"> · {task.workstream_name}</span>}
        </p>
        <div className="mt-3 grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="rounded-[10px] bg-canvas p-3">
            <p className="text-[12.5px] text-muted">Before</p>
            <p className="font-semibold">{formatDay(before)}</p>
          </div>
          <span aria-hidden className="text-muted">→</span>
          <div className={`rounded-[10px] p-3 ${ev.approved ? "bg-lime-wash" : "bg-canvas"}`}>
            <p className="text-[12.5px] text-muted">After</p>
            <p className="font-semibold">{formatDay(after)}</p>
          </div>
        </div>
        {!ev.approved && req?.requested_due_date && <Meta>Asked for {formatDay(req.requested_due_date)}; declined, so the date did not move.</Meta>}
        {(asked?.quote || req?.reason) && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">Original request{requester ? ` from ${firstName(requester)}` : ""}</p>
            {asked?.quote ? <Quote>{asked.quote}</Quote> : <p className="text-[14.5px]">Reason: {req?.reason}</p>}
          </div>
        )}
        {task?.source_sentence && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">Original commitment</p>
            <Quote>{task.source_sentence}</Quote>
          </div>
        )}
        <div className="mt-3">
          <Meta>The person who asked is told by email.</Meta>
        </div>
      </Card>
    );
  }

  if (ev.kind === "approval") {
    const n = ev.entries.length;
    return (
      <Card className="p-5">
        <p className="font-semibold">
          {n} {n === 1 ? "task" : "tasks"} approved from meeting notes
          <span className="ml-2 text-[13.5px] font-normal text-muted">· in the app · {timeOfDay(ev.at)}</span>
        </p>
        <ul className="mt-2 space-y-1 text-[14.5px]">
          {ev.entries.map((e) => (
            <li key={e.id} className="flex items-baseline gap-2">
              <Icon name="doc" className="size-3.5 shrink-0 self-center text-muted" />
              <TaskLink id={e.task_id} tasks={data.tasks} />
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  const e = ev.entry;
  const actor = who(e.actor_id);
  // Part A writes new_value as the new person's name and quote as the meeting title, when there is one.
  if (e.field === "team_member_added") {
    return (
      <Card className="p-5">
        <p className="font-semibold">
          {actor ?? "Someone"} added {e.new_value ?? "someone"} to the team
        </p>
        {e.quote && <p className="mt-0.5 text-[14.5px]">from {e.quote}</p>}
        <Meta>
          {SOURCE_LABEL[e.source]} · {timeOfDay(e.created_at)}
        </Meta>
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <p className="font-semibold">{activityHeadline(e, names)}</p>
      <p className="mt-0.5 text-[14.5px]">
        <TaskLink id={e.task_id} tasks={data.tasks} />
      </p>
      <Meta>
        {actor ? `${actor} · ` : ""}
        {SOURCE_LABEL[e.source]} · {timeOfDay(e.created_at)}
      </Meta>
      {e.quote && (
        <div className="mt-2">
          <Quote>{e.quote}</Quote>
        </div>
      )}
    </Card>
  );
}
