# Paste into Claude Code (repo `ikaytazov/loose-ends`)

## ⚠️ READ FIRST: the thread is required, not decoration you can drop
A previous build left the thread out. **This PR isn't done until every thread below is on the page and animating.** The thread is the brand. Copy the code exactly; don't redraw or "simplify" it.

### Thread 1: hero thread (inline SVG, draws in on page load)
Put it inside a `relative` wrapper around the hero grid (`.hero-top`, `padding-bottom:110px`). The divider line and the 01/02/03 row sit directly below that wrapper.
```html
<svg class="hero-thread" viewBox="0 0 1208 620" preserveAspectRatio="none" aria-hidden="true">
  <path pathLength="1" d="M0 620 C 240 600, 480 560, 590 470 C 640 428, 660 380, 640 352 C 622 330, 590 350, 606 378 C 624 410, 668 396, 680 350 C 698 282, 690 220, 664 210 C 640 202, 632 250, 660 270 C 684 288, 704 286, 724 280"/>
  <circle cx="726" cy="280" r="6.5"/>
</svg>
```
```css
.hero-top{position:relative;padding-bottom:110px}
.hero-thread{position:absolute;left:0;top:0;width:100%;height:100%;z-index:4;pointer-events:none;overflow:visible}
.hero-thread path{stroke:#B8CF4E;stroke-width:1.6;fill:none;stroke-linecap:round}
.hero-thread circle{fill:#C6DD3E}
@media (prefers-reduced-motion:no-preference){
  .hero-thread path{stroke-dasharray:1;stroke-dashoffset:1;animation:le-draw 2.2s .3s ease-out forwards}
  .hero-thread circle{opacity:0;animation:le-fade .4s 2.3s forwards}
}
@keyframes le-draw{to{stroke-dashoffset:0}} @keyframes le-fade{to{opacity:1}}
@media (max-width:1100px){.hero-thread{display:none}}
```
Result: the line rises from the left end of the divider, loops twice in the gap between the headline and the Decisions card, and ends in the lime dot touching the card's left edge. It must not cross any text or button. Compare with `screenshots/desktop-hero.png`.

### Threads 2–4: image dividers (draw in on scroll, once)
Use `public/landing/thread-infinity.webp` (after the 01/02/03 row), `thread-sweep-loop.webp` (above the Roles eyebrow, right-aligned) and `thread-wave-loop.webp` (above the final CTA headline). Each sits in normal page flow inside a wrapper `<div class="tdiv-watch">`. **Observe the wrapper, not the image**: the image starts fully clipped, so the browser would never report it as visible.
```css
.tdiv{display:block;margin:0 auto;pointer-events:none;height:auto}
.tdiv-infinity{width:min(1000px,92%);margin:-10px auto -70px}
.roles-band{width:min(1100px,100%);margin:-60px 0 -10px auto}
.tdiv-wave{width:min(760px,92%);margin:-70px auto -10px}
@media (prefers-reduced-motion:no-preference){
  .tdiv.reveal{clip-path:inset(0 100% 0 0);transition:clip-path 2s cubic-bezier(.25,.7,.25,1)}
  .tdiv.reveal.in{clip-path:inset(0 0 0 0)}
}
```
```tsx
// components/ThreadReveal.tsx ("use client")
const ref = useRef<HTMLDivElement>(null); const [on, setOn] = useState(false);
useEffect(() => { const el = ref.current; if (!el) return;
  if (!("IntersectionObserver" in window)) { setOn(true); return; }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.3 });
  io.observe(el); return () => io.disconnect(); }, []);
return <div ref={ref} className="tdiv-watch"><Image src={src} alt="" aria-hidden width={w} height={h} className={`tdiv reveal ${variant} ${on ? "in" : ""}`} /></div>;
```

### Thread 5: dark band
The `#trust` section uses `thread-loop-forest.webp` as the desktop background (cover, right). On mobile, hide it and show `thread-loop-cream-transparent.webp` top-right at 16% opacity.

### Keep every thread subtle: hard rules
The thread should feel like a quiet signature, never an animation show.
- **Thin and pale:** 1.4–1.6px lines in `#B8CF4E` (light olive-lime). No thicker strokes, glows, shadows, gradients or extra colours.
- **Motion happens once.** Each thread draws in a single time (hero on load, dividers on first scroll into view) and then stays still. No looping, no hover effects, no parallax, no re-animating when you scroll back up.
- **One thread per section.** Never two threads visible in the same section.
- **Never behind or across text, buttons, inputs or cards.** If a thread touches content at any width, shrink it, move it, or hide it at that width.
- **Reduced motion means fully static**, with everything visible immediately.
- **On the app's main pages (Overview, Workstreams, Decisions, Activity, Team, Capture), be even quieter.** Follow `docs/handoff/landing/app-threads/THREAD-SPEC.md`:
  - one thin thread in the empty top-right of the page header only, at 0.85 opacity
  - none on Workstream detail or Review
  - hidden below 1024px
  - drawn in at most once per session
  - plus the lime loop panel on Decisions
  - match `app-threads/mockups/`. If in doubt, leave it out of the app pages; the landing page carries the brand.

### Thread checklist: put this in the PR description with every box ticked
- [ ] The hero thread draws in on load (about 2.2s) and the lime dot appears at the Decisions card's left edge
- [ ] The infinity divider draws left→right when scrolled into view, once
- [ ] The sweep-loop divider above Roles draws in on scroll
- [ ] The wave-loop divider above the final CTA draws in on scroll
- [ ] The dark trust band shows the forest thread image (desktop) or the faint cream thread (mobile)
- [ ] No thread crosses text or buttons at 1440, 1280, 768 or 375px
- [ ] Every thread animates once only (no loops, no hover), and the app pages use the quieter header thread from THREAD-SPEC.md
- [ ] With "reduce motion" on (DevTools → Rendering → Emulate prefers-reduced-motion), every thread is fully visible and static
- [ ] A short screen recording or GIF of the hero thread drawing in is attached

---

Build the public landing page for Loose Ends at `/`, matching `docs/handoff/landing/reference/loose-ends-landing.html` (open it in a browser) and the design image `reference/design-reference-landing.png`. The HTML reference is the source of truth for layout, copy, spacing and responsive behaviour. Rebuild it as React/Tailwind components; don't paste the HTML file in.

## Setup
- Copy the images from `docs/handoff/landing/assets/` to `public/landing/`:
  - `hero-devices.webp` (+ `.png` fallback)
  - `thread-loop-forest.webp`
  - `thread-loop-cream-transparent.webp`
  - `thread-infinity.webp`, `thread-sweep-loop.webp`, `thread-wave-loop.webp` (transparent dividers)
- Serve them with `next/image`. Alt text: devices = "Loose Ends on a laptop and a phone, linked by a thread". The two thread images are decorative (`alt=""`).
- Move the current Overview from `/` to `/overview`. Update the sidebar link and any internal links to `/`. Leave `/reply/*` and `/api/*` untouched.
- The landing page has **no sidebar** and its own layout (`app/(marketing)/page.tsx` or similar). Load the fonts with `next/font/google`: Newsreader (400, 500) and Figtree (400–700).
- Tokens: forest `#123C30`, ivory `#F7F6F2`, lime `#D8EE79`, lime-soft `#EDF5CC`, line `#E3E6DF`, muted `#64736D`, thread `#B8CF4E`.

## Sections, in order (copy exactly as in the reference)
1. **Nav:**
   - Loop logo + "Loose Ends" serif wordmark.
   - Links: How it works · Why trust it · Roles (anchors).
   - An outlined "Sign in" button that opens the demo role picker. Later it becomes `/sign-in`.
2. **Hero:**
   - Eyebrow "Follow-through for startup teams".
   - H1 "The meeting ends. / The work moves." on two lines at desktop.
   - Subtitle "Loose Ends turns team conversations into clear commitments, updates and decisions."
   - "Try the demo →" (opens the role picker) and "See how it works" (anchor).
   - Right: the **Decisions card built in real HTML**, not an image. It has the Waiting 2 / Resolved tabs, a "Date change · Needs approval" row and an "Owner needed · Assign" row, and a "Review decisions →" button linking to `/decisions`.
   - **Thread:** see "Thread 1" at the top. Required.
   - Under the divider: three columns, **01 Capture · 02 Follow up · 03 Decide**.
3. **How it works** (`#how`):
   - Left: eyebrow, H2 "Your team stays in email. You see the whole picture.", the lead line, and a numbered list of three steps.
   - Right: `hero-devices` image anchored right, about 72vw wide.
   - On mobile the image goes **under** the text, larger and cropped from the left.
4. **The key moment:** on a white band, Priya's email reply in a quote card, then "Seconds later, on the board" and three result rows: Done · Blocked · New date waiting for Maya (Thu 5 Nov still applies).
5. **Why teams trust it** (`#trust`), dark forest band:
   - Desktop background: `thread-loop-forest.webp` (cover, right).
   - Mobile: hide that image and show `thread-loop-cream-transparent.webp` top-right at 16% opacity, so it never fights the text.
   - Three items with lime-outlined icons.
6. **Roles** (`#roles`): three cards, CEO (Maya) · Workstream owner (Priya) · Team member (Alex).
7. **Final CTA:** a small thread loop, "Nobody has to send a single reminder.", and "Try the demo →".
8. **Footer:** © 2026 Loose Ends · Built in a weekend at the Outskill hackathon by Iliyan, Jerry, Valerie, Abir, David and H.T. · Demo data · Live app.

## Image thread dividers
See "Threads 2–4" at the top. Required.

## Demo role picker (modal)
"Try Loose Ends as…", with three cards:
- **Maya Chen (CEO): active.** Links to `/overview`. This is the demo view today.
- **Priya Shah (Workstream owner)** and **Alex Romero (Team member): shown but disabled.** Use a dashed grey card, `aria-disabled="true"`, not focusable, with a "Coming soon" badge. These views aren't built yet.
- Note under the cards: "Today the demo opens as Maya, the CEO. The owner and member views are on the way, and real accounts with Clerk will follow."
- In the Roles section, add small tags: Priya "View coming soon", Alex "Works by email today".
- The final CTA copy is "Step into Maya's seat and see where her team stands, with our demo data."
- The modal must trap focus, close on Esc or a backdrop click, and return focus to the button that opened it.
- When the owner and member views exist, enable those cards (see `docs/handoff/polish/DEMO-SIGNIN-AND-LANDING.md`).

## Quality bar
- No horizontal scroll at 320, 375, 768, 1280 or 1440px.
- Keyboard accessible, with a visible focus ring (lime on the dark band).
- Lighthouse accessibility ≥ 95, performance ≥ 90.
- `npm run build` passes.
- PR includes screenshots at 1440px and 375px, the Vercel preview link, and a note that `/` moved to `/overview`.
