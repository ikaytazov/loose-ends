# Server routes

Screens **read** from Supabase directly (tables and views, see `docs/agreements.md`) and **change** things only through these routes.
Types for every request and response: `lib/contracts/api.ts`. Every error comes back as `{ "error": "message" }` with a 4xx/5xx status.

| Route | What it does | State |
|---|---|---|
| `POST /api/notes` | Paste notes → proposed tasks | Real (Claude reads the notes; can take 10–40 seconds) |
| `POST /api/meetings/[id]/approve` | Lead approves the reviewed list | Real |
| `POST /api/tasks/[id]/assign` | Give a task an owner | Real |
| `POST /api/date-requests/[id]/decide` | Approve or decline a new date | Real |
| `POST /api/emails/send-morning` | "Send morning emails now" (also `GET` for the 8 am job) | Real |
| `POST /api/inbound` | Gmail bridge delivers a reply | Real (not for screens) |
| `GET`, `POST /api/reply/[code]` | The "reply here" page: load the tasks of one morning email, send a plain-language update | Real |
| `GET /api/health` | Shows missing settings, database status and whether the Gmail bridge answers (`gmail_bridge: "ok"`) | Real |
| `POST /api/dev/test-email` | Sends one test email through the Gmail bridge to a team member (header `x-bridge-secret`) | Real (not for screens) |
| `GET /api/dev/score-notes?n=01` | Scores the notes reader against a test transcript's answer key (header `x-score-key`) | Real (not for screens) |

"Stub" means the route has its final address and answer format but fakes the work. When the real version lands, screens do not change.

---

### POST /api/notes
Paste notes. Saves the meeting and the proposed tasks (status `proposed`), returns them for the review screen.
```json
// request
{ "title": "Weekly launch meeting", "meeting_date": "2026-11-02", "attendees": ["Maya", "Priya", "Jordan"], "notes": "Priya will get the pricing page live by Thursday..." }
// response
{ "meeting_id": "uuid", "tasks": [ { "id": "uuid", "title": "Launch the new pricing page", "owner_id": "uuid", "workstream_id": "uuid",
  "due_date": "2026-11-05", "priority": "high", "status": "proposed", "source_sentence": "Priya will get...", "flags": [] , "...": "..." } ] }
```
Tasks the AI could not give an owner or date carry `flags: ["no_owner"]` / `["no_date"]` — highlight them on the review screen.

### POST /api/meetings/[id]/approve
Send back every proposed task from the review screen, edited by the lead. `keep: false` removes it.
```json
// request
{ "tasks": [ { "id": "uuid", "title": "Launch the new pricing page", "owner_id": "uuid", "workstream_id": "uuid", "due_date": "2026-11-05", "priority": "high", "keep": true } ] }
// response
{ "approved": 7, "removed": 1 }
```

### POST /api/tasks/[id]/assign
```json
// request  (acted_by = who clicked, optional)
{ "owner_id": "uuid", "acted_by": "uuid" }
// response
{ "task": { "id": "uuid", "owner_id": "uuid", "...": "..." } }
```

### POST /api/team-members
Adds a teammate (Team page "Add teammate", Review "Add Sarah"). Never sends an email: the new person gets the normal morning email.
```json
// request  (assign_task_ids = proposed tasks to give them; added_by = who clicked, optional)
{ "name": "Sarah Kim", "email": "sarah@example.com", "role": "member", "assign_task_ids": ["uuid"], "added_by": "uuid" }
// response  (existing = the email was already on the team; no duplicate is created)
{ "member": { "id": "uuid", "name": "Sarah Kim", "email": "sarah@example.com", "...": "..." }, "assigned": 1, "existing": false }
```
Only tasks still `proposed` are assigned. 400 for a bad name or email, 429 after 10 new teammates in 24 hours.

### POST /api/date-requests/[id]/decide
`id` is `decision_id` from the `decisions_needed` view (or `pending_date_request_id` from `task_board`).
```json
// request
{ "decision": "approved", "decided_by": "uuid" }
// response
{ "date_request": { "id": "uuid", "status": "approved", "...": "..." }, "task": { "id": "uuid", "due_date": "2026-11-11", "...": "..." } }
```
Returns 409 if the request was already decided.

### POST /api/emails/send-morning
```json
// request: everyone with open tasks, or one person
{}            or            { "member_id": "uuid" }
// response: recipients = who was sent an email; failed = who was not, and why
{ "sent": 1, "recipients": ["priya@example.com"], "failed": [] }
```
The 8 am job is `GET` on the same address, called by Vercel (`vercel.json`) with `Authorization: Bearer <CRON_SECRET>`.

### POST /api/inbound  (Gmail bridge only)
Header `x-bridge-secret: <BRIDGE_SECRET>`.
```json
// request
{ "gmail_message_id": "18c...", "from": "Priya <priya@example.com>", "to": "signalridgeco+le-k3x9p2@gmail.com",
  "subject": "Re: Your 3 open tasks", "text": "Pricing page is live. The partner deck needs until next Wednesday...", "received_at": "2026-11-03T15:15:00Z" }
// response
{ "ok": true, "status": "applied", "applied": [ { "task_id": "uuid", "field": "status", "new_value": "done" },
  { "task_id": "uuid", "field": "date_request", "new_value": "2026-11-11" } ], "question": null }
```
`status` can also be `duplicate`, `unknown_sender`, `no_tasks` or `error`.

### GET /api/reply/[code]
`code` is the morning email's `reply_code`; the link in the email is the only way in (no login). 404 if the code is unknown.
```json
// response
{ "name": "Priya", "tasks": [ { "n": 1, "title": "Launch the new pricing page", "priority": "high", "status": "in_progress", "due_date": "2026-11-05" } ] }
```

### POST /api/reply/[code]
Runs the same reply handling as an email (`handleInbound`), logged with `source = reply_page`. Sends no follow-up email: the page shows the result. Due dates still become date requests.
```json
// request
{ "text": "1 is done" }
// response: same as /api/inbound
{ "ok": true, "status": "applied", "applied": [ { "task_id": "uuid", "field": "status", "new_value": "done" } ], "question": null }
```

---

## Reading data in screens (examples)

```ts
import { browserSupabase } from "@/lib/supabase/browser";
import type { WorkstreamOverviewRow, TaskBoardRow, DecisionNeededRow } from "@/lib/contracts/domain";

const sb = browserSupabase();
const { data: cards } = await sb.from("workstream_overview").select("*").order("name");          // Overview cards
const { data: tasks } = await sb.from("task_board").select("*").eq("workstream_id", id);         // Workstream page
const { data: decisions } = await sb.from("decisions_needed").select("*").eq("approver_id", me);  // Needs your decision
const { data: log } = await sb.from("activity_log").select("*").eq("task_id", taskId).order("created_at", { ascending: false });

// Live: reload when tasks, date requests or the log change
sb.channel("board")
  .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, reload)
  .on("postgres_changes", { event: "*", schema: "public", table: "date_requests" }, reload)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, reload)
  .subscribe();
```
No login: for "me", use the team lead (`team_members.role = 'lead'`) or let the user pick a person from a dropdown.
