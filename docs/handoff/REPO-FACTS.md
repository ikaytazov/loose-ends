# Repo facts and gaps (checked 31 Oct 2026, local copy at commit 6891ae8)

Re-check against `main` before building. Teammates have pushed since.

## Stack and settings
- Next.js 16.4, React 19.3, Tailwind v4 (`@import "tailwindcss"` + `@theme` in `app/globals.css`), Supabase JS 2, zod 4. Tests: `npm test` (tsx).
- `.env.example`: `TEAM_EMAIL=signalridgeco@gmail.com`, **`TEAM_TIMEZONE=America/Los_Angeles`**. So the 8 a.m. digest is **8 a.m. Pacific**. Show times in Pacific and say so.
- Replies come in at `signalridgeco+le-<code>@gmail.com`; the code matches a reply to its digest. The Gmail bridge (`gmail-bridge/Code.gs`) polls about every minute and posts to `/api/inbound`.
- At this commit `app/page.tsx` is still a placeholder, and `components/` and `app/(screens)/` don't exist. **Check whether Jerry's shell has landed since.**

## Routes screens call (`docs/api.md`, types in `lib/contracts/api.ts`)
| Route | Body | Notes |
|---|---|---|
| `POST /api/notes` | `{title, meeting_date, attendees[], notes}` | **Stub AI**: always returns the same 8 proposed tasks. Saving is real. Returns `{meeting_id, tasks[]}`. One meeting per call. |
| `POST /api/meetings/[id]/approve` | `{tasks:[{id,title,owner_id,workstream_id,due_date,priority,keep}]}` | Returns `{approved, removed}` |
| `POST /api/tasks/[id]/assign` | `{owner_id, acted_by}` | |
| `POST /api/date-requests/[id]/decide` | `{decision:'approved'|'declined', decided_by}` | **409** if already decided. Writes `activity_log`. |
| `POST /api/emails/send-morning` | `{}` or `{member_id}` | **Stub**: returns a preview, sends nothing |
Errors are always `{error}` with a 4xx/5xx status.

## Views and tables screens read
`workstream_overview` (cards: total/done/in_progress/not_started, last_update_at, health) · `task_board` (task + owner_name, workstream_name, is_overdue, last_update_at/source/quote, pending_date_request_id, pending_requested_due_date) · `decisions_needed` (kind date_change|assign_owner, approver_id, current/requested dates, reason) · `activity_log` (field, old/new value, quote, email_id, source app|email|reply_page|ai|system) · `team_members` (role lead|member) · `workstreams` (owner_id, target_date) · `meetings` (raw_notes, status processing|proposed|approved|failed).

## Gaps found: raise these with Iliyan (don't fix silently)
1. **Approver isn't enforced on the server.** `decide` checks status (409) but not that `decided_by === approver_id`. The UI hides the buttons for non-owners, but the route should reject the call (403). This is US-06.
2. **No dependency field.** `tasks` has `blocker` (text) but no `depends_on`. The Dependencies tab and the "linked blocker" need either a column or a convention, e.g. the reply reader writes the dependency task id in `activity_log`. Until then, show the blocker text only.
3. **Notification status isn't stored.** Receipts can't show queued/sent/failed until issue #16 (decision notice email) writes to `emails` with `kind = 'decision notice'`. Show "No notice sent" for now. Don't fake it.
4. **No duplicate check across transcripts.** `/api/notes` will re-propose tasks that already exist. Either the UI warns (BUILD-SPEC §3.2) or the route dedupes. Agree which.
5. **One meeting per `/api/notes` call.** Multi-transcript upload means calling it once per meeting, oldest first.
6. **`.docx`** isn't supported (the route takes text). Read `.txt`/`.md` in the browser only.
7. **"Three more days"**: calendar or working days. The reply reader decides (commit 6891ae8 works out relative dates in code). The UI just displays `requested_due_date`.

## PRD and technical spec vs the repo
`references/PRD.txt` and `references/technical-spec.txt` are Valerie's product intent. Where they differ from the code, **the repo wins**, and you note the difference in the PR:
- **Reading data:** the tech spec says the browser reads through server routes. The repo rule (`CLAUDE.md` #2, `docs/api.md`) is that screens read Supabase tables and views directly with `lib/supabase/browser.ts` and write only through routes. Follow the repo.
- **Digest timezone** (listed as open in the PRD): the repo has `TEAM_TIMEZONE=America/Los_Angeles`, so 8 a.m. Pacific.
- **Server-side checks the tech spec expects** (owner authority, request version, server file parsing): not in the current routes. Raise them as gaps 1, 4 and 6 above.

## Open team decisions (from the 31 Oct meeting and the use-case brief)
- Who builds issue #16 (decision notice email): Valerie, or the email owner once Valerie exposes the decision event?
- Who may act when a workstream owner is unavailable, or is the one asking? The repo spec says: the team lead.
- Exact hackathon deadline. The team said 10:00 a.m. Eastern, Sun 1 Nov; confirm on the organiser's countdown.

## Team roles (31 Oct meeting)
- **Valerie**: front-end coding (all screens; Decisions is formally hers).
- **Abir**: checks the front-end setup and Vercel.
- **David**: test data, 3–5 sequential weekly transcripts plus team structure (issues #7, #9).
- **Iliyan**: reply-reading prompt and back end.
- **Jerry**: end-to-end testing.
- **Hobson**: demo video.
