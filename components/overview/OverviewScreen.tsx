"use client";

// Overview (/): every workstream at a glance, what is waiting on the lead, and what moved recently (issue #2,
// mockup docs/mockups/01-overview.png, BUILD-SPEC §3.4). Reloads by itself when tasks, date requests or the log change.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { errorText } from "@/components/api";
import { loadBoard, type Board } from "@/components/board/data";
import { activityHeadline, quietTasks, rowsShowingQuote, sortStreams } from "@/components/board/logic";
import { firstName, Icon, Quote, SOURCE_LABEL, timeAgo, useLiveVersion } from "@/components/board/pieces";
import { WorkstreamCard } from "@/components/board/WorkstreamCard";
import { formatDay } from "@/components/format";
import { useTeam } from "@/components/use-team";
import { Button, Card, Chip, Notice, PageHead, SectionTitle, Stat } from "@/components/ui";
import type { DecisionNeededRow, Health } from "@/lib/contracts/domain";

type Filter = "all" | "attention" | "updates";
const ATTENTION: Health[] = ["blocked", "decision_needed"];

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function OverviewScreen() {
  const { team, lead } = useTeam();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const live = useLiveVersion("overview");

  useEffect(() => {
    let alive = true;
    loadBoard()
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
  }, [live, retry]);

  const names = useMemo(() => Object.fromEntries((team ?? []).map((m) => [m.id, m.name])), [team]);
  const titles = useMemo(() => Object.fromEntries((board?.tasks ?? []).map((t) => [t.id, t.title])), [board]);

  if (error) {
    return (
      <div className="space-y-4">
        <Notice tone="danger" title="Couldn’t load the overview">
          {error}
        </Notice>
        <Button onClick={() => setRetry((r) => r + 1)}>Retry</Button>
      </div>
    );
  }

  const streams = sortStreams(board?.streams ?? []);
  const tasks = board?.tasks ?? [];
  const decisions = board?.decisions ?? [];
  const mine = lead ? decisions.filter((d) => d.approver_id === lead.id) : decisions;
  // The panel lists every waiting decision, the lead's own first; each one says who decides (BUILD-SPEC §3.4).
  const panel = lead ? [...mine, ...decisions.filter((d) => d.approver_id !== lead.id)] : decisions;
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;
  const quietCount = quietTasks(tasks, now).length;
  const shown = streams.filter((s) => (filter === "all" ? true : filter === "attention" ? ATTENTION.includes(s.health) : s.health === "update_needed"));
  const recent = (board?.activity ?? []).slice(0, 6);
  const withQuote = rowsShowingQuote(recent);
  const counts = {
    all: streams.length,
    attention: streams.filter((s) => ATTENTION.includes(s.health)).length,
    updates: streams.filter((s) => s.health === "update_needed").length,
  };

  return (
    <>
      {/* The greeting depends on the viewer's clock, so it only appears once the page runs in the browser. */}
      <PageHead thread
        title={`${board ? greeting(new Date(now)) : "Welcome back"}${lead ? `, ${firstName(lead.name)}` : ""}.`}
        subtitle="Here is what moved, what is blocked and where you are needed."
      />

      <div className="grid grid-cols-2 gap-3 min-[1080px]:grid-cols-4 min-[1080px]:gap-4">
        <Stat icon={<Icon name="flag" className="size-5" />} iconClass="bg-lime-soft text-forest" value={board ? streams.length : null} label={streams.length === 1 ? "workstream" : "workstreams"} />
        <Stat icon={<Icon name="triangle" className="size-5" />} iconClass="bg-danger-bg text-danger" value={board ? blockedCount : null} label={blockedCount === 1 ? "blocked task" : "blocked tasks"} />
        <Stat icon={<Icon name="doc" className="size-5" />} iconClass="bg-ok-bg text-ok" value={board ? mine.length : null} label="awaiting your decision" />
        <Stat icon={<Icon name="clock" className="size-5" />} iconClass="bg-warn-bg text-warn" value={board ? quietCount : null} label="no update in 3+ days" />
      </div>

      <div className="mt-8 grid gap-6 min-[1080px]:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
        <section aria-labelledby="active-streams">
          <SectionTitle id="active-streams">Active workstreams</SectionTitle>
          <div role="group" aria-label="Filter workstreams" className="mt-4 flex flex-wrap gap-2">
            <Chip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>
              All workstreams
            </Chip>
            <Chip active={filter === "attention"} onClick={() => setFilter("attention")} count={counts.attention} dot="bg-danger">
              Needs attention
            </Chip>
            <Chip active={filter === "updates"} onClick={() => setFilter("updates")} count={counts.updates} dot="bg-warn">
              Awaiting updates
            </Chip>
          </div>

          <div className="mt-5 space-y-4">
            {!board && [0, 1].map((i) => <div key={i} className="h-56 animate-pulse rounded-card border border-line bg-paper" />)}
            {board && streams.length === 0 && (
              <Card className="p-6">
                <p className="font-semibold">No workstreams yet.</p>
                <p className="mt-1 text-muted">Load the seed data, or add workstreams in Supabase, then capture your first meeting notes.</p>
              </Card>
            )}
            {board && streams.length > 0 && shown.length === 0 && <p className="text-muted">No workstreams match this filter.</p>}
            {shown.map((s) => (
              <WorkstreamCard
                key={s.id}
                stream={s}
                tasks={tasks.filter((t) => t.workstream_id === s.id)}
                decisions={decisions.filter((d) => d.workstream_id === s.id)}
                now={now}
              />
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-[14px] text-muted">
            <Icon name="doc" className="size-4" />
            Completion = recorded done ÷ approved tasks. Not effort. A missing reply is unknown, not done.
          </p>
        </section>

        <aside className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <SectionTitle icon={<Icon name="doc" className="size-5" />}>Needs your decision</SectionTitle>
              <span className="rounded-full bg-grey-bg px-2.5 py-0.5 text-[13px] font-semibold">{board ? panel.length : "…"}</span>
            </div>
            {board && panel.length === 0 && <p className="mt-3 text-muted">Nothing is waiting on a decision.</p>}
            <ul className="mt-2 divide-y divide-line-2">
              {panel.slice(0, 5).map((d) => (
                <li key={`${d.kind}-${d.decision_id ?? d.task_id}`}>
                  <DecisionItem row={d} approverName={d.approver_id ? names[d.approver_id] : undefined} isMe={!!lead && d.approver_id === lead.id} now={now} />
                </li>
              ))}
            </ul>
            <Link href="/decisions" className="mt-3 inline-block font-semibold text-forest-2 underline underline-offset-4">
              Open decisions
            </Link>
          </Card>

          <Card className="p-5">
            <SectionTitle icon={<Icon name="clock" className="size-5" />}>Recent movement</SectionTitle>
            {board && board.activity.length === 0 && <p className="mt-3 text-muted">No changes yet. They appear here as replies come in.</p>}
            <ol className="mt-3 space-y-4">
              {recent.map((a) => (
                <li key={a.id} className="border-l-2 border-line pl-4">
                  <p className="font-semibold text-ink">{activityHeadline(a, names)}</p>
                  <p className="text-[14px] text-muted">
                    {a.task_id && titles[a.task_id] ? `${titles[a.task_id]} · ` : ""}
                    {a.actor_id && names[a.actor_id] ? `${firstName(names[a.actor_id])} · ` : ""}
                    {SOURCE_LABEL[a.source]} · {timeAgo(a.created_at, now)}
                  </p>
                  {a.quote && withQuote.has(a.id) && (
                    <div className="mt-2">
                      <Quote>{a.quote}</Quote>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}

function DecisionItem({ row, approverName, isMe, now }: { row: DecisionNeededRow; approverName?: string; isMe: boolean; now: number }) {
  const who = isMe ? "you decide" : approverName ? `${firstName(approverName)} decides` : "the lead decides";
  if (row.kind === "date_change") {
    return (
      <Link href="/decisions" className="block py-3 hover:bg-canvas">
        <p className="font-semibold text-ink">Move “{row.task_title}”?</p>
        <p className="text-[14px] text-ink-2">
          {firstName(row.requested_by_name) || "Someone"} asked for {row.requested_due_date ? formatDay(row.requested_due_date) : "a new date"}. Approved date stays{" "}
          <b>{formatDay(row.current_due_date)}</b> until you decide.
        </p>
        <p className="text-[13.5px] text-muted">
          {row.workstream_name ?? "No workstream"} · {who} · {timeAgo(row.created_at, now)}
        </p>
      </Link>
    );
  }
  return (
    <Link href="/decisions" className="block py-3 hover:bg-canvas">
      <p className="font-semibold text-ink">Assign an owner</p>
      <p className="text-[14px] text-ink-2">“{row.task_title}” has no owner, so no one is emailed about it.</p>
      <p className="text-[13.5px] text-muted">
        {row.workstream_name ?? "No workstream"} · {who}
      </p>
    </Link>
  );
}

