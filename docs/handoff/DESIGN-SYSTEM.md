# Design system: "The Living Thread"

The look is calm and editorial, like a well-funded startup: forest-green navigation, warm ivory canvas, white cards with fine borders, restrained lime accents and a thin thread motif. References: `references/designs/*.png` (Telly's 7 screens) and the prototype, which is the most exact source for spacing and states.

## Tokens
See `design/tokens.css`, which is ready for Tailwind v4 `@theme`. Key values: forest `#123C30` · forest-2 `#215846` · ink `#18201D` · canvas `#F7F6F2` · paper `#FFF` · lime `#D8EE79` · line `#E3E6DF` · muted `#64736D` · danger `#8E3426` on `#FBE9E5` · warn `#8A5E13` on `#FFF0CF`.

## Type
- **Newsreader** (serif, weight 400) for page headlines (clamp 36–56px, tracking −0.02em), card and task titles (18–30px), big numbers in stat tiles (34px) and the sidebar wordmark (38px, stacked "Loose / Ends").
- **Figtree** (sans) for body text (15.5px), subtitles (17–22px, muted), labels (14.5px semibold), and uppercase micro-labels (12.5px, letter-spacing .07em).
- Headline voice is short and declarative: "Turn meetings into follow-through." · "Review what was promised." · "A few decisions. Work moving again." · "Every change has a trail." · "Who owns what."

## Layout
- Sidebar 244px. Content padding 40px (18px on mobile), max width about 1380px. Main column plus a 340–420px right rail on desktop; they stack under 1080px.
- Spacing: 4, 8, 12, 16, 24, 32, 48. Cards: 1px line border, 14px radius, very light shadow. No heavy shadows and no large lime fills.

## Components (all in the prototype)
| Component | Notes |
|---|---|
| Status pill | 28px, rounded, **icon + text**. Done (ok), In progress (pale green), Blocked (danger + triangle), Not started (outline), Proposed (lime + spark). |
| Health pill | On track ✓ · Blocked △ · Decision needed (doc) · Update needed (clock) |
| Stat tile | Icon disc (46px, tinted) + serif number + muted label |
| Workstream card | Icon disc · serif title · goal · target · health pill · bar + "X of Y recorded tasks done" · tinted reason line · meta row |
| Quote block | Ivory bg, 3px lime left rule. Used for every source sentence and email reply. |
| Date boxes | "Current · approved" (ivory) next to "Requested · not approved" (lime wash). Never merge them. |
| Change receipt | Before → After tiles, authorised by, when, original request, original commitment, notification status |
| Inference tag | Dashed amber outline "Inference". AI tag: dashed grey "Simulated interpretation" (prototype only; in the app, "Read by AI"). |
| Loop panel | Lime-soft card. Thread draws into a loop with a lime knot after a decision ("One less loose end."). Disable the animation for reduced motion. |
| Thread motif | Thin 1.4–1.6px lime/olive curve in the sidebar and empty header space. Decorative only (`aria-hidden`), never behind text or controls; hide it on narrow screens. |

## Accessibility
AA contrast, a visible focus ring, status never shown by colour alone, tabs with `role="tab"` and arrow keys, the drawer and dialog close on Esc and keep focus inside, and Enter/Space work on everything clickable.
