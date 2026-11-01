"use client";

// "Try Loose Ends as…": the demo role picker. Maya is live; Priya and Alex are shown but disabled until their views exist.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/landing/Icon";
import "./landing.css";

export function RolePicker({ onClose, titleId }: { onClose: () => void; titleId: string }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus starts on the one live choice, Escape closes, and Tab stays inside the dialog.
    dialogRef.current?.querySelector<HTMLElement>("a[href]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []);
      if (focusable.length === 0) return;
      const i = focusable.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && i === focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="x" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>
        <p className="eyebrow">Demo sign-in</p>
        <h2 id={titleId}>Try Loose Ends as…</h2>
        <p className="note noteLead">No password. You’ll see the demo team’s data.</p>

        <div className="pick">
          <Link href="/overview">
            <span className="av" style={{ background: "#E3EED3" }}>MC</span>
            <b>Maya Chen</b>
            <span>CEO and team lead. Sees every workstream and decides when an owner asks about their own work.</span>
            <span className="go">
              Continue as Maya <Icon name="arrow" className="go16" />
            </span>
          </Link>
          <div className="soon" aria-disabled="true">
            <span className="av" style={{ background: "#F6E1D9" }}>PS</span>
            <b>Priya Shah</b>
            <span>Workstream owner, Product launch. Will approve date changes for her own workstream.</span>
            <span className="badgeSoon">Coming soon</span>
          </div>
          <div className="soon" aria-disabled="true">
            <span className="av" style={{ background: "#DCE7F2" }}>AR</span>
            <b>Alex Romero</b>
            <span>Team member. Will see only his own tasks; today he simply replies to the morning email.</span>
            <span className="badgeSoon">Coming soon</span>
          </div>
        </div>
        <p className="note">
          Today the demo opens as Maya, the CEO. The owner and member views are on the way, and real accounts with Clerk will follow.
        </p>
      </div>
    </div>
  );
}
