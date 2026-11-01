// Line icons from the landing reference. Drawn in currentColor, so they follow the text colour around them.
import type { ReactNode } from "react";
import "./landing.css";

export type IconName = "doc" | "cal" | "user" | "chev" | "arrow" | "down" | "check" | "alert" | "pause" | "lock" | "quote" | "q" | "x";

const ICONS: Record<IconName, ReactNode> = {
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" strokeWidth={2} />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
    </>
  ),
  chev: <path d="m9 6 6 6-6 6" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  down: <path d="M12 4v15M6 13l6 6 6-6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  pause: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  quote: <path d="M4 5h16v11H9l-5 4z" />,
  q: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={`ic ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}
