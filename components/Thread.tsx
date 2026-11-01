// Decorative brand thread. aria-hidden, never interactive.
// Spec: docs/handoff/landing/app-threads/THREAD-SPEC.md.
// "header" and "short" sit in the empty top-right of a page header. "loop" fills the Decisions loop panel.
// draw: play the draw-in once on mount (the class is applied only when true). Without it the thread is static.
const VARIANTS = {
  header: {
    viewBox: "0 0 600 150",
    width: "clamp(360px, 38vw, 600px)",
    height: "150px",
    d: "M0 142 C120 146 240 134 310 96 C370 62 374 12 340 8 C306 4 296 52 336 76 C396 112 490 80 600 32",
    knot: [340, 8],
    knotR: 4.5,
    stroke: "#A9C25A",
    strokeWidth: 1.4,
    opacity: 0.85,
    fit: "xMaxYMin meet",
  },
  short: {
    viewBox: "0 0 240 190",
    width: "170px",
    height: "135px",
    d: "M240 6 C180 20 120 60 100 106 C84 146 130 162 152 136 C172 112 140 86 112 100 C70 120 50 160 38 186",
    knot: [38, 188],
    knotR: 4.5,
    stroke: "#A9C25A",
    strokeWidth: 1.4,
    opacity: 0.85,
    fit: "xMaxYMin meet",
  },
  loop: {
    viewBox: "0 0 358 168",
    width: "100%",
    height: "100%",
    d: "M-6 30 C60 60 120 92 196 86 C262 80 286 46 262 30 C238 14 206 34 222 58 C240 86 300 84 350 40",
    knot: [350, 40],
    knotR: 6,
    stroke: "#123C30",
    strokeWidth: 1.5,
    opacity: 1,
    fit: "none",
  },
} as const;

export function Thread({
  variant = "header",
  draw = true,
  className = "",
}: {
  variant?: keyof typeof VARIANTS;
  draw?: boolean;
  className?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={v.viewBox}
      preserveAspectRatio={v.fit}
      className={`pointer-events-none select-none ${className}`}
      style={{ width: v.width, height: v.height }}
    >
      <path
        pathLength={1}
        d={v.d}
        fill="none"
        stroke={v.stroke}
        strokeWidth={v.strokeWidth}
        strokeLinecap="round"
        opacity={v.opacity}
        className={draw ? "thread-draw" : undefined}
      />
      <circle
        cx={v.knot[0]}
        cy={v.knot[1]}
        r={v.knotR}
        fill="#D8EE79"
        stroke="#9DB94B"
        strokeWidth={1.2}
        className={draw ? "thread-knot" : undefined}
      />
    </svg>
  );
}
