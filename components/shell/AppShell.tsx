"use client";

// The shared frame for every screen: forest sidebar, top bar, and a slide-in drawer under 900px.
// Matches the mockups in docs/handoff/references/designs: logo mark and wordmark, icon nav with a lime marker on the
// current page, a thread line drawn behind the lower sidebar, and a top bar with the page name, "Launch team" and Demo data.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Icon, type IconName } from "@/components/board/pieces";
import { SendMorningButton } from "@/components/shell/SendMorningButton";
import { useTeam } from "@/components/use-team";
import { browserSupabase } from "@/lib/supabase/browser";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/overview", label: "Overview", icon: "home" },
  { href: "/workstreams", label: "Workstreams", icon: "layers" },
  { href: "/decisions", label: "Decisions", icon: "doc" },
  { href: "/activity", label: "Activity", icon: "activity" },
  { href: "/capture", label: "Capture notes", icon: "pen" },
  { href: "/team", label: "Team", icon: "users" },
];

// The review screen belongs to "Capture notes" and a single workstream to "Workstreams", so keep those highlighted.
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LogoMark() {
  return (
    <svg viewBox="0 0 60 48" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="mb-0.5 h-[46px] w-14" aria-hidden>
      <path d="M4 42c8 0 16-3 22-9 8-8 12-17 8-24-3-5-10-4-12 2-3 8 6 16 14 22 6 4 13 6 20 6" />
      <path d="M4 42c-1-6 6-12 14-11 7 1 9 7 6 11" />
    </svg>
  );
}

// Decorative thread (DESIGN-SYSTEM "Thread motif"): never behind text, hidden when the sidebar is a drawer.
function SideThread() {
  return (
    <svg viewBox="0 0 244 190" fill="none" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-32 z-0 hidden h-[190px] w-full min-[900px]:block">
      <path d="M-4 118c40-10 92-30 120-58 22-22 30-50 12-54-20-4-30 26-14 56 16 30 54 46 134 44" stroke="#D8EE79" strokeWidth={1.5} strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const { lead } = useTeam();
  const [waiting, setWaiting] = useState<number | null>(null);

  // Count of decisions waiting for the lead (the badge on "Decisions").
  useEffect(() => {
    if (!lead) return;
    let live = true;
    (async () => {
      try {
        const { count } = await browserSupabase()
          .from("decisions_needed")
          .select("*", { count: "exact", head: true })
          .eq("approver_id", lead.id);
        if (live) setWaiting(count ?? 0);
      } catch {
        if (live) setWaiting(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [lead]);

  // Drawer: Esc closes it, focus moves into it when it opens and returns to the menu button when it closes.
  useEffect(() => {
    if (!drawerOpen) return;
    drawerRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const current = NAV.find((n) => isActive(pathname, n.href))?.label ?? "Loose Ends";

  const sidebar = (
    <nav aria-label="Main" className="on-forest relative flex h-full flex-col overflow-hidden px-3.5 pb-5 pt-7 text-canvas">
      <SideThread />
      <Link href="/" aria-label="Loose Ends, back to the home page" className="relative z-10 flex flex-col px-3 pb-7 text-canvas" onClick={() => setDrawerOpen(false)}>
        <LogoMark />
        <span className="font-serif text-[38px] leading-[0.92] tracking-[-0.01em]">
          Loose
          <br />
          Ends
        </span>
      </Link>
      <ul className="relative z-10 space-y-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setDrawerOpen(false)}
                className={`relative flex min-h-12 items-center gap-3.5 rounded-control px-3.5 text-[16px] transition-colors ${
                  active ? "bg-forest-2 font-semibold text-white" : "text-canvas/85 hover:bg-forest-2/60 hover:text-white"
                }`}
              >
                {active && <span aria-hidden className="absolute inset-y-2.5 -left-0.5 w-[3px] rounded-full bg-lime" />}
                <Icon name={item.icon} className="size-5 shrink-0" />
                <span>{item.label}</span>
                {item.href === "/decisions" && waiting !== null && waiting > 0 && (
                  <span aria-label={`${waiting} waiting for you`} className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-lime px-1.5 text-[12.5px] font-bold text-forest">
                    {waiting}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="relative z-10 mt-auto flex items-center gap-3 border-t border-white/10 px-2.5 pt-4">
        <Avatar name={lead?.name} />
        <p className="text-[14.5px] leading-tight">
          <span className="block font-semibold">{lead?.name ?? "No team lead set"}</span>
          <span className="block text-[13px] text-canvas/70">Team lead</span>
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] bg-forest min-[900px]:block">{sidebar}</aside>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 min-[900px]:hidden" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div ref={drawerRef} className="fixed inset-y-0 left-0 z-50 w-[244px] bg-forest min-[900px]:hidden">
            {sidebar}
          </div>
        </>
      )}

      <div className="min-[900px]:pl-[244px]">
        <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-canvas/95 px-[18px] py-3 backdrop-blur min-[900px]:px-10">
          <button
            ref={hamburgerRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="grid size-11 place-items-center rounded-control border border-line bg-paper min-[900px]:hidden"
          >
            <span aria-hidden className="block w-5 space-y-1">
              <span className="block h-0.5 bg-ink" />
              <span className="block h-0.5 bg-ink" />
              <span className="block h-0.5 bg-ink" />
            </span>
          </button>
          <p className="text-[17px] font-semibold">{current}</p>
          <span aria-hidden className="hidden h-6 w-px bg-line min-[900px]:block" />
          <p className="hidden text-[15px] text-ink-2 min-[900px]:block">Launch team</p>
          <span className="ml-auto">
            <SendMorningButton />
          </span>
          <span
            className="whitespace-nowrap rounded-control border border-[#C7DF62] bg-lime px-3 py-1.5 text-[13.5px] font-semibold text-forest"
            title="Seed data is loaded until real transcripts arrive"
          >
            Demo data
          </span>
        </header>
        <main className="mx-auto max-w-[1380px] px-[18px] py-8 min-[900px]:px-10 min-[900px]:py-10">{children}</main>
      </div>
    </div>
  );
}
