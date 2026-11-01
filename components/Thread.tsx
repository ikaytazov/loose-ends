// Decorative brand thread for the empty top-right of a page header. aria-hidden, never interactive.
// Spec: docs/handoff/landing/app-threads/THREAD-SPEC.md. It draws in once when the page mounts; reduced motion shows it static.
export function Thread({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 600 150"
      preserveAspectRatio="xMaxYMin meet"
      className={`pointer-events-none select-none ${className}`}
      style={{ width: "clamp(360px, 38vw, 600px)", height: "150px" }}
    >
      <path
        pathLength={1}
        d="M0 142 C120 146 240 134 310 96 C370 62 374 12 340 8 C306 4 296 52 336 76 C396 112 490 80 600 32"
        fill="none"
        stroke="#A9C25A"
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.85}
        className="thread-draw"
      />
      <circle cx={340} cy={8} r={4.5} fill="#D8EE79" stroke="#9DB94B" strokeWidth={1.2} className="thread-knot" />
    </svg>
  );
}
