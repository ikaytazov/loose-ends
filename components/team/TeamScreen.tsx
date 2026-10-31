"use client";

// Team (/team): who owns what, and when each person last replied.
import { useEffect, useMemo, useState } from "react";
import { daysSince, formatWhen } from "@/components/format";
import { Card, Eyebrow, Notice, PageHead, Pill, inputClass } from "@/components/ui";
import { errorText } from "@/components/api";
import { useTeam } from "@/components/use-team";
import type { TeamMember, Workstream } from "@/lib/contracts/domain";
import { browserSupabase } from "@/lib/supabase/browser";

type Filter = "all" | "leads" | "no-reply";

// A reply is "recent" if it came within this many days. Older, or none at all, shows as "No update".
const RECENT_DAYS = 3;

type Stats = {
  streams: Record<string, string[]>; // owner_id -> workstream names
  open: Record<string, number>; // owner_id -> open tasks
  lastReply: Record<string, string>; // member_id -> ISO time of their latest reply
};

async function loadStats(): Promise<Stats> {
  const sb = browserSupabase();
  const [streamRes, taskRes, replyRes] = await Promise.all([
    sb.from("workstreams").select("*").not("owner_id", "is", null),
    sb.from("tasks").select("owner_id, status").not("owner_id", "is", null).not("status", "in", "(done,proposed)"),
    sb.from("activity_log").select("actor_id, created_at").in("source", ["email", "reply_page"]).not("actor_id", "is", null).order("created_at", { ascending: false }),
  ]);
  for (const r of [streamRes, taskRes, replyRes]) if (r.error) throw new Error(r.error.message);

  const streams: Record<string, string[]> = {};
  for (const w of (streamRes.data ?? []) as Workstream[]) {
    if (!w.owner_id) continue;
    (streams[w.owner_id] ??= []).push(w.name);
  }
  const open: Record<string, number> = {};
  for (const t of (taskRes.data ?? []) as { owner_id: string }[]) open[t.owner_id] = (open[t.owner_id] ?? 0) + 1;
  const lastReply: Record<string, string> = {};
  for (const r of (replyRes.data ?? []) as { actor_id: string; created_at: string }[]) {
    if (!lastReply[r.actor_id]) lastReply[r.actor_id] = r.created_at; // rows are newest first
  }
  return { streams, open, lastReply };
}

export function TeamScreen() {
  const { team, error: teamError } = useTeam();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;
    loadStats()
      .then((s) => {
        if (live) setStats(s);
      })
      .catch((e: unknown) => {
        if (live) setStatsError(errorText(e));
      });
    return () => {
      live = false;
    };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (team ?? [])
      .filter((m) => (q ? m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) : true))
      .filter((m) => {
        if (filter === "leads") return m.role === "lead";
        if (filter === "no-reply") {
          const days = daysSince(stats?.lastReply[m.id]);
          return days === null || days >= RECENT_DAYS;
        }
        return true;
      });
  }, [team, query, filter, stats]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "leads", label: "Leads" },
    { id: "no-reply", label: "No recent reply" },
  ];

  return (
    <>
      <PageHead eyebrow="Team" title="Who owns what." subtitle="Everyone with a task, and when each person last replied to a follow-up email." />

      {teamError && <Notice tone="danger" title="Could not load the team">{teamError}</Notice>}
      {statsError && <Notice tone="danger" title="Could not load tasks and replies">{statsError}</Notice>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filter team" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-11 rounded-full border px-4 text-[14.5px] ${filter === f.id ? "border-forest bg-forest text-canvas" : "border-line bg-paper"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="ml-auto w-full sm:w-72">
          <span className="sr-only">Search people</span>
          <input className={`${inputClass} mt-0`} type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_auto_minmax(0,1.2fr)_auto_minmax(0,1fr)] gap-4 border-b border-line-2 bg-canvas px-5 py-3 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted min-[900px]:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Owns</span>
          <span>Open</span>
          <span>Last reply</span>
        </div>

        {!team && !teamError && <p className="p-5 text-muted">Loading team…</p>}
        {team && rows.length === 0 && <p className="p-5 text-muted">No one matches that search.</p>}

        <ul>
          {rows.map((m) => (
            <li key={m.id} className="border-b border-line-2 last:border-b-0">
              <MemberRow member={m} streams={stats?.streams[m.id] ?? []} open={stats?.open[m.id] ?? 0} lastReply={stats?.lastReply[m.id] ?? null} loading={!stats && !statsError} />
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-4 text-[14px] text-muted">
        Replies come in at the team address and are checked every minute. &ldquo;No update&rdquo; means no reply in the last {RECENT_DAYS} days, not that work has stopped.
      </p>
    </>
  );
}

function MemberRow({
  member,
  streams,
  open,
  lastReply,
  loading,
}: {
  member: TeamMember;
  streams: string[];
  open: number;
  lastReply: string | null;
  loading: boolean;
}) {
  const days = daysSince(lastReply);
  const recent = days !== null && days < RECENT_DAYS;

  return (
    <div className="grid gap-x-4 gap-y-2 px-5 py-4 min-[900px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_auto_minmax(0,1.2fr)_auto_minmax(0,1fr)] min-[900px]:items-center">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-lime-soft font-semibold text-forest">
          {member.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </span>
        <span className="font-semibold">{member.name}</span>
      </div>
      <span className="break-all text-[14.5px] text-ink-2">{member.email}</span>
      <span>{member.role === "lead" ? <Pill tone="forest">Lead</Pill> : <Pill>Member</Pill>}</span>
      <span className="text-[14.5px]">
        <Eyebrow>Owns</Eyebrow>
        {streams.length ? streams.join(", ") : <span className="text-muted">Nothing yet</span>}
      </span>
      <span className="text-[14.5px]">
        <Eyebrow>Open</Eyebrow>
        {loading ? "…" : open}
      </span>
      <span className="text-[14.5px]">
        <Eyebrow>Last reply</Eyebrow>
        {loading ? (
          "…"
        ) : lastReply ? (
          <span className={recent ? "text-ok" : "text-warn"}>
            <span aria-hidden>● </span>
            {formatWhen(lastReply)}
          </span>
        ) : (
          <span className="text-warn">
            <span aria-hidden>● </span>No update · no reply yet
          </span>
        )}
        {lastReply && !recent && (
          <span className="block text-[13px] text-warn">
            <span aria-hidden>● </span>No update · {days} days
          </span>
        )}
      </span>
    </div>
  );
}
