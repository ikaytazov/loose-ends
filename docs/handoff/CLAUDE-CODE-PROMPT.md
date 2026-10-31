# Paste this into Claude Code (then paste your assigned issue below it)

You are building the front-end screens for **Loose Ends** in the repo `ikaytazov/loose-ends` (Next.js App Router, TypeScript, Tailwind v4, Supabase). I'm Valerie, front-end owner. The handoff package is in `docs/handoff/` (or attached). Read these before writing code, in this order:

1. The repo's `CLAUDE.md`, `AGENTS.md`, `docs/spec-v5.md`, `docs/agreements.md`, `docs/api.md`, `docs/team-tasks.md` and `lib/contracts/*`. **The repo is the source of truth.**
2. `docs/handoff/references/PRD.txt` and `technical-spec.txt` (product intent), then `docs/handoff/REPO-FACTS.md`: what exists today and the known gaps.
3. `docs/handoff/BUILD-SPEC.md`: the screens, build order and acceptance criteria.
4. `docs/handoff/DESIGN-SYSTEM.md` and `design/tokens.css`.
5. `docs/handoff/prototype/loose-ends-prototype.html`: the clickable prototype. Open it and read its markup and CSS for layout, copy, states and interactions. It is a **reference, not code to paste**: it uses fake local data, a simulated AI and a "Demo tools" menu that must not ship.

## Hard rules (from the repo; don't break them)
- Import shared types from `lib/contracts/` (`domain.ts`, `api.ts`). Never redefine Task, statuses or API shapes.
- Screens **never write to Supabase**. Read with `lib/supabase/browser.ts` from `workstream_overview`, `task_board`, `decisions_needed`, `activity_log`, `team_members`, `workstreams`, `meetings`. Make every change by calling a route in `docs/api.md`.
- Due dates never change from a reply. Only `POST /api/date-requests/[id]/decide` moves a date. Show **current (approved)** and **requested** dates as separate fields everywhere.
- Fixed labels. Task status: `proposed | not_started | in_progress | blocked | done`. Health: On track, Blocked, Decision needed, Update needed. The button says **Decline**, never Reject. The brand is **Loose Ends**.
- No login. "Me" is the team lead (`team_members.role = 'lead'`).
- Don't add libraries without a reason. `npm run build` must pass before every push.
- Stay inside `app/(screens)/`, `components/`, `app/page.tsx`, `app/layout.tsx` and `app/globals.css`. Ask before touching `app/api/`, `lib/server/`, `lib/contracts/` or `supabase/`; those belong to Iliyan. If a screen needs a contract change, write it up in the PR; don't make it.

## Product truths the UI must keep
- An AI proposal is not a task until the lead approves it. Show the exact `source_sentence` next to every proposal and task.
- A missing reply is **unknown**. Show "No update · N days", never progress.
- Completion = `done_tasks / total_tasks` from `workstream_overview`, labelled "recorded tasks done". It is not effort.
- Anything the UI works out for itself (e.g. dependency risk) is labelled "Inference".
- Never show an email as delivered. The digest route is a stub, so show its real response (`stub: true`, recipients, preview).

## How to work
1. Inspect the repo first, including any shell or components Jerry has already merged, and **reuse them**. If no shell exists, build it as part of the first PR (sidebar, top bar, tokens).
2. Write a short plan for the assigned issue, then build in the order in BUILD-SPEC §1.
3. For every screen, implement loading, empty, error and long-text states. Test keyboard use, visible focus, and widths down to 320px.
4. Test against the real routes and seed data (`supabase/seed-dev.sql`, then David's test data when it lands). Where data isn't seeded yet, use a typed fixture in one isolated file and say so in the PR.
5. One small PR per screen, on branch `fe-valerie` or `fe-valerie/<screen>`. Include what a user can now do, screenshots at desktop and 375px, the Vercel preview URL, test results, and any dependency on Iliyan's routes. Don't merge it yourself.

## My assigned issue
[PASTE THE FULL ISSUE TEXT HERE]
