"use client";

// Shared pieces for the Overview and Workstream screens: status and health pills (always icon + text, never colour
// alone), initials avatars, the progress bar, small icons, and the live-reload hook that keeps the board current.
import { useEffect, useState, type ReactNode } from "react";
import { Callout, Pill, type Tone } from "@/components/ui";
import type { ActivitySource, Health, TaskStatus } from "@/lib/contracts/domain";
import { browserSupabase } from "@/lib/supabase/browser";

// ---------------------------------------------------------------------------
// Icons (decorative: the text next to them always says the same thing)
// ---------------------------------------------------------------------------
export type IconName =
  | "check"
  | "triangle"
  | "doc"
  | "clock"
  | "dot"
  | "spark"
  | "person"
  | "calendar"
  | "mail"
  | "arrow-left"
  | "close"
  | "flag"
  | "home"
  | "layers"
  | "activity"
  | "pen"
  | "users";

const PATHS: Record<IconName, ReactNode> = {
  check: <path d="M4 10.5l3.5 3.5L16 6" />,
  triangle: (
    <>
      <path d="M10 3.5L17.5 16.5h-15z" />
      <path d="M10 8.5v3.5M10 14.2v.3" />
    </>
  ),
  doc: (
    <>
      <path d="M5.5 2.5h6l3 3v12h-9z" />
      <path d="M8 9.5h4.5M8 12.5h4.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.3l2.8 1.7" />
    </>
  ),
  dot: <circle cx="10" cy="10" r="3.2" fill="currentColor" stroke="none" />,
  spark: <path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.3 2.3M12.2 12.2l2.3 2.3M14.5 5.5l-2.3 2.3M7.8 12.2l-2.3 2.3" />,
  person: (
    <>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M4 17c.8-3.2 3.2-4.8 6-4.8s5.2 1.6 6 4.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 2.5v3.5M13 2.5v3.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="14" height="10.5" rx="1.8" />
      <path d="M3.5 6l6.5 5 6.5-5" />
    </>
  ),
  "arrow-left": <path d="M16 10H4.5M9 5l-5 5 5 5" />,
  close: <path d="M5 5l10 10M15 5L5 15" />,
  flag: <path d="M5 17V3.5M5 4h9l-2 3 2 3H5" />,
  // Sidebar icons (same 20px grid and 1.6 stroke as the rest).
  home: <path d="M3.5 9.2L10 3.5l6.5 5.7V16a.8.8 0 01-.8.8H4.3a.8.8 0 01-.8-.8z M8 16.8v-5h4v5" />,
  layers: (
    <>
      <path d="M10 3.2l7 3.6-7 3.6-7-3.6z" />
      <path d="M3 10.2l7 3.6 7-3.6M3 13.6l7 3.6 7-3.6" />
    </>
  ),
  activity: <path d="M2.5 10.5h3.2L8 4.5l4 11 2.3-5h3.2" />,
  pen: (
    <>
      <path d="M13.2 3.8l3 3L7.5 15.5l-4 1 1-4z" />
      <path d="M11.7 5.3l3 3" />
    </>
  ),
  users: (
    <>
      <circle cx="7.5" cy="7" r="2.8" />
      <path d="M2.5 16c.6-2.9 2.6-4.3 5-4.3s4.4 1.4 5 4.3" />
      <path d="M12.6 4.4a2.8 2.8 0 010 5.2M14.6 11.9c1.5.5 2.6 1.9 2.9 4.1" />
    </>
  ),
};

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Labels (fixed by CLAUDE.md rule 4)
// ---------------------------------------------------------------------------
export const STATUS_LABEL: Record<TaskStatus, string> = {
  proposed: "Proposed",
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_STYLE: Record<TaskStatus, { tone: Tone; icon: IconName }> = {
  proposed: { tone: "lime", icon: "spark" },
  not_started: { tone: "grey", icon: "dot" },
  in_progress: { tone: "ok", icon: "clock" },
  blocked: { tone: "danger", icon: "triangle" },
  done: { tone: "ok", icon: "check" },
};

export function StatusPill({ status }: { status: TaskStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <Pill tone={s.tone}>
      <Icon name={s.icon} className="size-3.5" />
      {STATUS_LABEL[status]}
    </Pill>
  );
}

export const HEALTH_LABEL: Record<Health, string> = {
  on_track: "On track",
  blocked: "Blocked",
  decision_needed: "Decision needed",
  update_needed: "Update needed",
};

const HEALTH_STYLE: Record<Health, { tone: Tone; icon: IconName }> = {
  on_track: { tone: "ok", icon: "check" },
  blocked: { tone: "danger", icon: "triangle" },
  decision_needed: { tone: "lime", icon: "doc" },
  update_needed: { tone: "warn", icon: "clock" },
};

export function HealthPill({ health }: { health: Health }) {
  const s = HEALTH_STYLE[health];
  return (
    <Pill tone={s.tone}>
      <Icon name={s.icon} className="size-3.5" />
      {HEALTH_LABEL[health]}
    </Pill>
  );
}

// The tinted "why" line under a workstream (blocked, quiet, waiting on a decision). On track has nothing to explain.
const CALLOUT_STYLE: Record<Health, { tone: "danger" | "warn" | "wash"; icon: IconName } | null> = {
  on_track: null,
  blocked: { tone: "danger", icon: "triangle" },
  decision_needed: { tone: "wash", icon: "doc" },
  update_needed: { tone: "warn", icon: "clock" },
};

export function HealthCallout({ health, className, children }: { health: Health; className?: string; children: ReactNode }) {
  const s = CALLOUT_STYLE[health];
  if (!s) return null;
  return (
    <Callout tone={s.tone} icon={<Icon name={s.icon} />} className={className}>
      {children}
    </Callout>
  );
}

export function NeedsOwnerPill() {
  return (
    <Pill tone="warn">
      <Icon name="person" className="size-3.5" />
      Needs owner
    </Pill>
  );
}

export const SOURCE_LABEL: Record<ActivitySource, string> = {
  app: "in the app",
  email: "email reply",
  reply_page: "reply page",
  ai: "read by AI",
  system: "system",
};

// ---------------------------------------------------------------------------
// People and progress
// ---------------------------------------------------------------------------
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md" }: { name: string | null | undefined; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-7 text-[11.5px]" : "size-9 text-[13px]";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${name ? "bg-lime-soft text-forest" : "bg-grey-bg text-muted"} ${box}`}>
      {initials(name)}
    </span>
  );
}

export function firstName(name: string | null | undefined): string {
  return name ? name.split(/\s+/)[0] : "";
}

export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="h-2 w-full overflow-hidden rounded-full bg-grey-bg">
      <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
    </div>
  );
}

// The quote block now lives with the other shared pieces in components/ui.tsx; this keeps old imports working.
export { Quote } from "@/components/ui";

// ---------------------------------------------------------------------------
// Time words
// ---------------------------------------------------------------------------
/** "Just now", "12 min ago", "3 h ago", "Yesterday", "4 days ago". */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "No update yet";
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** Same rule as the database's health label: no update for 3 days or more. */
export const QUIET_DAYS = 3;

// ---------------------------------------------------------------------------
// Live updates: reload when tasks, date requests or the activity log change (docs/api.md).
// ---------------------------------------------------------------------------
export function useLiveVersion(name: string): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let sb: ReturnType<typeof browserSupabase>;
    try {
      sb = browserSupabase();
    } catch {
      return; // Missing settings: the screen shows the load error instead.
    }
    // One email reply changes several rows at once; wait a moment so it causes one reload, not five.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 400);
    };
    const channel = sb
      .channel(`live-${name}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "date_requests" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, bump)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void sb.removeChannel(channel);
    };
  }, [name]);
  return version;
}
