# The thread on the main pages, subtle by design

The thread is the brand's signature: one fine line that curls into a loop. Today it appears only in the sidebar. Add it to the **empty top-right of each page header**, and fix the **loop panel** on Decisions. Change nothing else in the existing layouts.

See `mockups/thread-overview.png` and `mockups/thread-decisions.png`. They're drawn on top of real screenshots of the live app.

## Rules that keep it from distracting
1. **One thread per page, maximum.** The sidebar thread doesn't count.
2. **It lives in empty space only:** the top-right of the page header, between the top bar and the first row of content. It **never crosses text, numbers, buttons, inputs or cards.** If it would touch anything at 1280px or 1440px, use the `short` variant, or leave it off that page.
3. **Thin and quiet:** a 1.4px stroke in `#A9C25A` at 0.85 opacity, round caps, no fill. An optional lime knot (`#D8EE79`, about 4px radius) at the end. No glow, no gradient, no thicker line.
4. **Decorative only:** `aria-hidden="true"`, `pointer-events: none`, sitting behind the text (`z-0`; header text `relative z-10`).
5. **Motion:** at most a single draw-in (about 1.2s, ease-out) the first time the page mounts in a session. No looping and no hover effects. With `prefers-reduced-motion`, show it static.
6. **Responsive:** show it at ≥1024px (`hidden lg:block`). Hide it on tablet and phone; the sidebar drawer already carries the motif.
7. **The loop panel** on Decisions is the one place the loop closes. It's a lime-soft card (`#EDF5CC`, 1px `#DCE9A8` border) with the forest-colour loop. It draws once when a decision is made; otherwise it's static.

## Where it goes
| Page | Variant | Note |
|---|---|---|
| Overview | `header` | Sweeps from right of the subtitle, curls once, exits top-right. See the mockup. |
| Workstreams list | `header` | |
| Activity | `header` | |
| Team | `header` | |
| Capture notes | `header` | Keep it clear of the drop zone. |
| Decisions | `short` + **loop panel** | The headline is long, so the curl stays at the far right and ends in a knot just above the receipt card. |
| Workstream detail | none | The task panel occupies the right side. |
| Review & approve | none | It's dense; don't add noise. |
| Landing page (new) | `hero` | The only place the thread can be generous. See `DEMO-SIGNIN-AND-LANDING.md`. |

## Drop-in component (`components/Thread.tsx`)
```tsx
// Decorative brand thread. aria-hidden, never interactive. See docs/handoff/THREAD-SPEC.md
"use client";
import { useEffect, useState } from "react";

type Variant = "header" | "short" | "loop";

const PATHS: Record<Variant, { vb: string; d: string; knot?: [number, number]; w: string; h: string }> = {
  // 600×150 box anchored top-right of the page header
  header: { vb: "0 0 600 150", w: "clamp(360px, 38vw, 600px)", h: "150px",
    d: "M0 142 C120 146 240 134 310 96 C370 62 374 12 340 8 C306 4 296 52 336 76 C396 112 490 80 600 32" },
  // 240×190 compact curl for pages with long headlines; ends in a knot
  short: { vb: "0 0 240 190", w: "240px", h: "190px",
    d: "M240 6 C180 20 120 60 100 106 C84 146 130 162 152 136 C172 112 140 86 112 100 C70 120 50 160 38 186", knot: [38, 188] },
  // loop panel (fills the card)
  loop: { vb: "0 0 358 168", w: "100%", h: "100%",
    d: "M-6 30 C60 60 120 92 196 86 C262 80 286 46 262 30 C238 14 206 34 222 58 C240 86 300 84 350 40", knot: [350, 40] },
};

export function Thread({ variant = "header", draw = false, className = "" }: { variant?: Variant; draw?: boolean; className?: string }) {
  const p = PATHS[variant];
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (draw && !reduce) setAnimate(true);
  }, [draw]);
  const stroke = variant === "loop" ? "#123C30" : "#A9C25A";
  return (
    <svg aria-hidden="true" focusable="false" viewBox={p.vb} preserveAspectRatio={variant === "loop" ? "none" : "xMaxYMin meet"}
      style={{ width: p.w, height: p.h }} className={`pointer-events-none select-none ${className}`}>
      <path d={p.d} fill="none" stroke={stroke} strokeWidth={variant === "loop" ? 1.5 : 1.4} strokeLinecap="round"
        opacity={variant === "loop" ? 1 : 0.85} pathLength={1}
        style={animate ? { strokeDasharray: 1, strokeDashoffset: 1, animation: "le-draw 1.2s ease-out forwards" } : undefined} />
      {p.knot && <circle cx={p.knot[0]} cy={p.knot[1]} r={variant === "loop" ? 6 : 4.5} fill="#D8EE79" stroke="#9DB94B" strokeWidth={1.2}
        style={animate ? { opacity: 0, animation: "le-fade .3s 1s forwards" } : undefined} />}
    </svg>
  );
}
```
Add to `app/globals.css`:
```css
@keyframes le-draw { to { stroke-dashoffset: 0; } }
@keyframes le-fade { to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { [aria-hidden] path, [aria-hidden] circle { animation: none !important; stroke-dashoffset: 0 !important; opacity: 1 !important; } }
```

## How to place it in a page header
```tsx
<header className="relative">
  <Thread variant="header" draw className="absolute -right-10 -top-6 z-0 hidden lg:block" />
  <div className="relative z-10">
    <p className="eyebrow">…</p>
    <h1 className="…">Good morning, Maya.</h1>
    <p className="…">Here is what moved…</p>
  </div>
</header>
```
The loop panel (Decisions, right rail):
```tsx
<div className="relative h-[168px] overflow-hidden rounded-[14px] border border-[#DCE9A8] bg-[#EDF5CC] p-5">
  <Thread variant="loop" draw={justDecided} className="absolute inset-0" />
  <p className="relative mt-[72px] font-serif text-2xl">One less loose end.</p>
  <p className="relative text-sm text-[#3E4B2C]">The thread closes once a decision is made here.</p>
</div>
```

## Acceptance check
At 1280px and 1440px, on each page in the table: the thread touches no text or control, there's one per page, it's absent below 1024px, it's static with reduced motion, and the loop panel is lime with a visible loop. Take before/after screenshots for the PR.
