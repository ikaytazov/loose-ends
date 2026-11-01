"use client";

// One workstream on the Overview and the Workstreams list (mockup docs/mockups/01-overview.png).
import Link from "next/link";
import { Avatar, HealthCallout, HealthPill, Icon, ProgressBar, timeAgo } from "@/components/board/pieces";
import { daysSince, doers, isOpen, reasonLine } from "@/components/board/logic";
import { formatDay } from "@/components/format";
import type { DecisionNeededRow, TaskBoardRow, WorkstreamOverviewRow } from "@/lib/contracts/domain";

export function WorkstreamCard({
  stream,
  tasks,
  decisions,
  now,
}: {
  stream: WorkstreamOverviewRow;
  tasks: TaskBoardRow[];
  decisions: DecisionNeededRow[];
  now: number;
}) {
  const reason = reasonLine(stream.health, tasks, decisions, now);
  const people = doers(tasks);
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const lastAt = stream.last_update_at;
  const quietDays = lastAt ? daysSince(lastAt, now) : null;
  // "No update · N days" only when the whole workstream has gone quiet; a single quiet task is in the reason line.
  const quiet = quietDays !== null && quietDays >= 3 && tasks.some((t) => isOpen(t.status));

  return (
    <article className="rounded-card border border-line bg-paper p-5 shadow-card min-[640px]:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-[26px] leading-tight text-ink">
            <Link href={`/workstreams/${stream.id}`} className="hover:underline">
              {stream.name}
            </Link>
          </h3>
          <p className="mt-1 text-[14.5px] text-muted">
            {stream.goal ?? "No goal set"}
            {stream.target_date && <> · target {formatDay(stream.target_date)}</>}
          </p>
        </div>
        <span className="shrink-0">
          <HealthPill health={stream.health} />
        </span>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <ProgressBar done={stream.done_tasks} total={stream.total_tasks} label={`${stream.name}: ${stream.done_tasks} of ${stream.total_tasks} tasks done`} />
        <span className="shrink-0 text-[14px] text-muted">
          {stream.done_tasks} of {stream.total_tasks} recorded tasks done
        </span>
      </div>

      {reason && (
        <HealthCallout health={stream.health} className="mt-4">
          {reason}
        </HealthCallout>
      )}

      <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]">
        <div className="flex items-center gap-2">
          <dt className="text-muted">Owner</dt>
          <dd className="flex items-center gap-1.5 font-semibold">
            <Avatar name={stream.owner_name} size="sm" />
            {stream.owner_name ?? "No owner"}
          </dd>
        </div>
        {people.length > 0 && (
          <div className="flex items-center gap-2">
            <dt className="text-muted">Doing the work</dt>
            <dd className="flex -space-x-1.5" aria-label={people.join(", ")}>
              {people.slice(0, 5).map((p) => (
                <span key={p} title={p} className="rounded-full ring-2 ring-paper">
                  <Avatar name={p} size="sm" />
                </span>
              ))}
            </dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Blocked tasks</dt>
          <Icon name="triangle" className="size-4 text-muted" />
          <dd>
            <span className="font-semibold">{blocked}</span> blocked
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Decisions waiting</dt>
          <Icon name="doc" className="size-4 text-muted" />
          <dd>
            <span className="font-semibold">{decisions.length}</span> {decisions.length === 1 ? "decision" : "decisions"}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="text-muted">Last update</dt>
          <dd className={quiet ? "font-semibold text-warn" : "font-semibold"}>
            {lastAt ? (quiet ? `No update · ${quietDays} days` : timeAgo(lastAt, now)) : "No update yet"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
