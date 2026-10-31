@AGENTS.md

# Loose Ends — instructions for every teammate's Claude

Loose Ends turns meeting notes into tasks, emails each owner their open tasks every morning, and updates the
board from their plain-language email replies. New due dates wait for the workstream owner's approval.
Hackathon build: 3 days, 7 people, each working with their own Claude on their own laptop. This file is how
we stay one system. Read it fully before changing anything.

## Read first
- `docs/spec-v5.md` — what we are building and why (MoSCoW scope, demo story).
- `docs/agreements.md` — the three shared agreements: tables, AI output, morning email. **Build to these exactly.**
- `docs/api.md` — every server route the screens call, with example requests and responses.
- `docs/mockups/` — the screen designs. Match their look.
- `docs/team-tasks.md` — who owns what.

## Stack
- Next.js (App Router, TypeScript, Tailwind) on Vercel. One app: screens + server routes.
- Supabase (Postgres + live updates). Schema in `supabase/migrations/`.
- Claude API for the two AI steps. Gmail (team address) for email, via `gmail-bridge/Code.gs`.
- No n8n or other workflow tools.

## Who changes what (folder ownership)
| Folder | Owner | Others |
|---|---|---|
| `app/(screens)/`, `components/`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | Front-end (Jerry, Valerie) | Ask first |
| `app/api/`, `lib/server/`, `lib/replies/`, `lib/email/`, `gmail-bridge/` | Back-end (Iliyan) | Ask first |
| `lib/notes/` | Whoever owns "Notes-reading prompt" in docs/team-tasks.md | Ask first |
| `supabase/` | Iliyan (schema); seed file owned by whoever owns "Seed data" | Never edit an applied migration |
| `lib/contracts/`, `docs/agreements.md`, `docs/api.md` | Iliyan — **shared contract** | Propose changes in the group chat; never change silently |
| `test-data/` | David | Read-only for everyone else |

## Rules
1. **Import shared types from `lib/contracts/`** (`domain.ts`, `api.ts`, `ai.ts`). Never redefine a Task, status list or API shape in your own file.
2. **Screens never write to Supabase.** Read with `lib/supabase/browser.ts` (tables and the views `task_board`, `workstream_overview`, `decisions_needed`); make every change by calling a route in `docs/api.md`.
3. **Schema changes only through a new file in `supabase/migrations/`** plus a matching update to `lib/contracts/domain.ts`, in the same pull request, agreed in the group chat first.
4. **Statuses and labels are fixed:** task status `proposed | not_started | in_progress | blocked | done`; priority `high | medium | low`; workstream health `on_track | blocked | decision_needed | update_needed`. Show them with the labels and colors in the mockups.
5. **Due dates never change from a reply.** A reply creates a date request; only `POST /api/date-requests/[id]/decide` moves a date.
6. **No secrets in the repo.** Keys go in `.env.local` (laptop) or Vercel settings. `.env.example` lists the names.
7. **Work on your own branch** (`fe-jerry`, `fe-valerie`, `be-iliyan`, `data-david`, ...), open a pull request, Iliyan merges to `main`.
8. Before pushing: `npm run build` must pass. Back-end: `npm test` must pass.
9. Keep it simple. This is a 3-day demo with one workspace and no login. Do not add libraries without a reason.

## Useful commands
- `npm run dev` — run the app at http://localhost:3000
- `npm run build` — check everything compiles
- `npm test` — back-end tests (reply handling)
- http://localhost:3000/api/health — shows which settings are missing and whether the database answers
