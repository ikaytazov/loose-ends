# Server routes

Screens **read** from Supabase directly (tables and views, see `docs/agreements.md`) and **change** things only through these routes.
Types for every request and response: `lib/contracts/api.ts`. Every error comes back as `{ "error": "message" }` with a 4xx/5xx status.

| Route | What it does | State |
|---|---|---|
| `POST /api/notes` | Paste notes → proposed tasks | **Stub AI** (always the same 8 tasks), real saving |
| `POST /api/meetings/[id]/approve` | Lead approves the reviewed list | Real |
| `POST /api/tasks/[id]/assign` | Give a task an owner | Real |
| `POST /api/date-requests/[id]/decide` | Approve or decline a new date | Real |
| `POST /api/emails/send-morning` | "Send morning emails now" | **Stub** (preview only, sends nothing) |
| `POST /api/inbound` | Gmail bridge delivers a reply | Real (not for screens) |
| `GET /api/health` | Shows missing settings and database status | Real |

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
// response (stub)
{ "stub": true, "sent": 0, "recipients": ["priya@example.com"], "preview": [ { "to": "priya@example.com", "tasks": ["1. high – Launch the new pricing page – due 2026-11-05"] } ] }
```

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
