// Decorative brand thread for the empty top-right of a page header. aria-hidden, never interactive.
// Spec: docs/handoff/landing/app-threads/THREAD-SPEC.md. It draws in once when the page mounts; reduced motion shows it static.
// "header" is the full curl for short titles. "short" is a compact curl for pages whose headline runs long.
const VARIANTS = {
  header: {
    viewBox: "0 0 600 150",
    width: "clamp(360px, 38vw, 600px)",
    height: "150px",
    d: "M0 142 C120 146 240 134 310 96 C370 62 374 12 340 8 C306 4 296 52 336 76 C396 112 490 80 600 32",
    knot: [340, 8],
  },
  short: {
    viewBox: "0 0 240 190",
    width: "170px",
    height: "135px",
    d: "M240 6 C180 20 120 60 100 106 C84 146 130 162 152 136 C172 112 140 86 112 100 C70 120 50 160 38 186",
    knot: [38, 188],
  },
} as const;

export function Thread({ variant = "header", className = "" }: { variant?: keyof typeof VARIANTS; className?: string }) {
  const v = VARIANTS[variant];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={v.viewBox}
      preserveAspectRatio="xMaxYMin meet"
      className={`pointer-events-none select-none ${className}`}
      style={{ width: v.width, height: v.height }}
    >
      <path
        pathLength={1}
        d={v.d}
        fill="none"
        stroke="#A9C25A"
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.85}
        className="thread-draw"
      />
      <circle cx={v.knot[0]} cy={v.knot[1]} r={4.5} fill="#D8EE79" stroke="#9DB94B" strokeWidth={1.2} className="thread-knot" />
    </svg>
  );
}
