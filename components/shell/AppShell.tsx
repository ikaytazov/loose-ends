"use client";

// The shared frame for every screen: forest sidebar, top bar, and a slide-in drawer under 900px.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTeam } from "@/components/use-team";
import { browserSupabase } from "@/lib/supabase/browser";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/workstreams", label: "Workstreams" },
  { href: "/decisions", label: "Decisions" },
  { href: "/activity", label: "Activity" },
  { href: "/capture", label: "Capture notes" },
  { href: "/team", label: "Team" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
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
    <nav aria-label="Main" className="flex h-full flex-col px-5 py-7 text-canvas">
      <Link href="/" className="px-2 font-serif text-[30px] leading-[0.95] tracking-[-0.01em]" onClick={() => setDrawerOpen(false)}>
        Loose
        <br />
        Ends
      </Link>
      <ul className="mt-10 space-y-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setDrawerOpen(false)}
                className={`relative flex min-h-11 items-center justify-between rounded-[10px] px-3 text-[15.5px] ${
                  active ? "bg-forest-2 font-semibold" : "hover:bg-forest-2/60"
                }`}
              >
                {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-lime" />}
                {item.label}
                {item.href === "/decisions" && waiting !== null && waiting > 0 && (
                  <span aria-label={`${waiting} waiting for you`} className="rounded-full bg-lime px-2 text-[12.5px] font-semibold text-forest">
                    {waiting}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-t border-forest-2 pt-4 text-[14px]">
        <p className="font-semibold">{lead?.name ?? "No team lead set"}</p>
        <p className="text-canvas/75">Team lead</p>
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
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-canvas/95 px-[18px] py-3 min-[900px]:px-10">
          <button
            ref={hamburgerRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="grid size-11 place-items-center rounded-[10px] border border-line bg-paper min-[900px]:hidden"
          >
            <span aria-hidden className="block w-5 space-y-1">
              <span className="block h-0.5 bg-ink" />
              <span className="block h-0.5 bg-ink" />
              <span className="block h-0.5 bg-ink" />
            </span>
          </button>
          <p className="text-[15px] font-semibold">{current}</p>
          <span className="ml-auto rounded-full border border-line bg-paper px-3 py-1 text-[13px] text-muted" title="Seed data is loaded until real transcripts arrive">
            Demo data
          </span>
        </header>
        <main className="mx-auto max-w-[1380px] px-[18px] py-8 min-[900px]:px-10 min-[900px]:py-10">{children}</main>
      </div>
    </div>
  );
}
