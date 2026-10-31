# Build spec: Loose Ends screens

Sources: the repo (wins on any conflict), the clickable prototype, Telly's 7 screen designs, and the use-case brief (US-01…US-12). The prototype's names, dates and counts are demo data. Never hard-code them.

## 1. Build order (critical path first)

| # | Screen | URL | Why this order | Stories |
|---|---|---|---|---|
| 0 | Shell + design tokens | all | Everything sits in it. Reuse Jerry's if it's merged. | — |
| 1 | **Capture notes** (upload landing page) | `/capture` | Iliyan's critical path: nothing can be tested until transcripts go in | US-01, US-08 |
| 2 | **Review & approve** | `/capture/review/[meetingId]` | Turns proposals into real tasks | US-02 |
| 3 | **Decisions** | `/decisions` | Assigned to Valerie: owner approves or declines extensions | US-05, US-06 |
| 4 | Overview | `/` | The CEO view | US-07 |
| 5 | Workstream + task panel | `/workstreams/[id]` | Board, blocker, source evidence | US-07, US-09 |
| 6 | Activity + change receipt | `/activity` | Evidence trail | US-10, US-04 view |
| 7 | Team | `/team` | Who owns what, last reply | — |
| 8 | Workstreams list | `/workstreams` | Same cards as Overview | — |

Ship 1–3 as the first vertical slice and tell the team on WhatsApp the moment `/capture` works on Vercel, so David and Jerry can start testing.

## 2. Shared shell
- **Sidebar** (244px, forest `#123C30`): the loop logo and stacked "Loose / Ends" serif wordmark, then Overview, Workstreams, Decisions (lime count badge = waiting decisions for "me"), Activity, Capture notes, Team. The active item gets a lighter surface and a 3px lime bar. A fine lime thread curls through the empty lower area, never behind text. "Maya Jackson · Founder · Lead" sits at the foot; in the real app, read it from the lead's `team_members` row.
- **Top bar**: page name, workspace label, search, a **Demo data** chip (keep it while the data is seed data), and the bell (outgoing notifications log).
- **Under 900px**: the sidebar becomes a slide-in drawer (hamburger, Esc closes it, focus goes into it). Search wraps to its own row. There must be no horizontal scrolling at 320px.
- **Not for production**: the prototype's "Demo tools" menu, the demo clock and "act as" switching are all simulation. Leave them out unless Iliyan asks for a demo mode.

## 3. Screens

### 3.1 Capture notes (`/capture`). US-01, US-08
**Job:** get one or more weekly transcripts in quickly, oldest first.
- **Fields:** meeting title, meeting date (needed so "Tuesday" becomes a date), attendee chips taken from `team_members`, and a notes textarea.
- **Upload:** drag-and-drop or file picker, `.txt` and `.md` only, read in the browser with `FileReader`, maximum 200 KB each. `.docx` is **not supported** by the current route (it takes text); say so in the UI.
- **Several transcripts:** "Add another meeting" moves the current entry into a queue. Dropping several files queues each as its own meeting, with the date read from its first line (e.g. "Weekly call, 9 Nov") and editable. Process them **sequentially, oldest first**: one `POST /api/notes` per meeting, awaiting each before the next.
- **Submit:** `POST /api/notes` with `{title, meeting_date, attendees, notes}`, then go to Review with the returned `meeting_id`. For several meetings, show progress ("Meeting 2 of 3") and go to a review that lists each meeting.
- **States:** empty notes (inline error, keep the other fields), unsupported or oversized file (clear message naming the allowed formats), processing (spinner plus "Reading your notes…" skeleton), route error (`{error}` shown with a **Retry** that doesn't lose the input). On retry, don't create a second meeting if the first call actually succeeded: check `meetings` for the same title + date + notes before re-posting.
- **Right rail:** three steps (Paste or upload → Review what was promised → Approve and notify).

### 3.2 Review & approve (`/capture/review/[meetingId]`). US-02
**Job:** correct the proposals before anything becomes a task.
- **Data:** the tasks from the `/api/notes` response, or on reload `tasks where meeting_id = X and status = 'proposed'`, plus `meetings.raw_notes` for the source panel.
- **Left panel:** the full original notes, with each `source_sentence` highlighted. Clicking a highlight focuses its proposal card.
- **Proposal card:** number; editable title (serif); Owner select (from `team_members`); due date (date input); Priority (high, medium or low, marked "Suggested"); Workstream select (from `workstreams`); the exact `source_sentence` in a quote block labelled "From your notes · exact words"; a "Proposed" pill; Remove/Restore (`keep:false`). The `no_owner` and `no_date` flags show an amber field and the text "No owner named in the notes" or "No date in the notes". `unclear` gets the same treatment.
- **Duplicate warning** (proposed; tell Iliyan in the PR): compare each proposal with `task_board` (same owner and similar title, or identical `source_sentence`). If it matches, default it to removed and label it "Already tracked · T-xxx". Within one multi-meeting upload, a later repeat is labelled "Repeated".
- **Header tiles:** N proposed · N need an owner · N need a date, all computed.
- **Sticky footer:** "X ready · Y need attention · Z left out", Save draft (local only), and **Approve N tasks**. The confirm dialog says who will be emailed at 08:00 Pacific, that tasks without an owner will wait in Decisions, and that tasks without a date stay flagged.
- **Approve:** `POST /api/meetings/[id]/approve` with **every** proposal, using `keep:false` for removed ones. On success, show "N tasks are now on the board" with links to the workstream and to Decisions if any have no owner.
- **Empty state:** "No commitments found", with an example sentence and a link back to edit the notes.

### 3.3 Decisions (`/decisions`). US-05, US-06 (Valerie's assigned issue)
**Job:** the workstream owner approves or declines with full context. Nothing moves until they do.
- **Data:** `decisions_needed`. Tabs: **Waiting** (filter `approver_id = me`; offer a "Show all" toggle for the CEO) and **Resolved** (from `date_requests` where `status != 'waiting'`, joined to tasks and `activity_log`).
- **Date change card:** task title, workstream, task id, a "Date change" pill. "Requested by X · by email reply · time · goes to Y (workstream owner)". Two boxes: **Current date · approved** ("applies until you decide") and **Requested date · not approved**. Then the reason; the **linked blocker** (`task.blocker` and the dependency task if known); the **original reply** quote from `activity_log.quote` / `emails`, with a "View original email" link; an optional note field; and **Approve [date]** / **Decline, keep [date]** buttons with an inline confirm step.
- **Authority:** show the buttons only when `me === approver_id`. Anyone else sees "Only [owner] can decide this". The route doesn't enforce this yet; see REPO-FACTS.
- **Call** `POST /api/date-requests/[id]/decide` with `{decision, decided_by: me}`. A **409** means "Already decided. No change made." Show it as a warning and reload. Disable the buttons while the request runs.
- **Owner-needed card** (`kind = 'assign_owner'`): source quote, a team member select, **Assign owner**, which calls `POST /api/tasks/[id]/assign` with `{owner_id, acted_by: me}`.
- **Right rail:** **Latest change receipt** (empty state until the first decision): before → after, decided by, when, and notification status, which reads "No notice sent" until issue #16 exists. Below it, the "One less loose end." loop panel. The loop draws once after a decision; respect `prefers-reduced-motion`.
- **Inference line** (optional): if the requested date equals or passes the workstream target, add "Inference: approving leaves no buffer before the target."
- **Open policy:** whether "three more days" means calendar or working days is the backend's call. Display whatever `requested_due_date` the reply reader produced.

### 3.4 Overview (`/`). US-07
- "Good morning, [lead first name]." The greeting follows the time of day.
- **Stat tiles:** workstreams · blocked tasks · awaiting your decision · no update in 3+ days.
- **Filter pills:** All / Needs attention (health blocked or decision_needed) / Awaiting updates (update_needed).
- **Workstream card** (`workstream_overview`): icon, name, goal · target date, health pill with icon, bar plus "X of Y recorded tasks done", a **reason line** (e.g. "Alex is waiting for Priya's pricing figures" taken from the blocked task, or "No update on 2 tasks for 4 days"), owner, the people doing the work, blocked count, decision count, and either "Last update" or **"No update · N days"** in amber.
- **Right rail:** Needs your decision (from `decisions_needed`; each item says who decides) and Recent movement (latest `activity_log` rows).
- **Live:** subscribe to `tasks`, `date_requests` and `activity_log` inserts and reload, as `docs/api.md` shows.
- Footer note: "Completion = recorded done ÷ approved tasks. Not effort. A missing reply is unknown."

### 3.5 Workstream detail (`/workstreams/[id]`). US-07, US-09
- **Header:** back link, name (large serif), "target [weekday, date]", owner ("approves date changes"), health pill, and a "Why blocked:" reason banner.
- **Tiles:** approved tasks · done · blocked · decisions needed. A progress card with a legend (done / in progress / blocked / not started).
- **Tabs:** Tasks | Dependencies | Updates. Arrow keys move between tabs.
- **Tasks table** (`task_board`): status circle, title (with "depends on…" when known), owner or a "Needs owner" pill, approved due date (red "overdue" if `is_overdue`) plus a small "Requested [date] · not approved" line if there's a `pending_requested_due_date`, status pill, and last update (or "No update · N days" or "No reply yet"). There's a search box and a filter (All / Open / Blocked / No reply yet / Done). Under 720px each row becomes a labelled card.
- **Task panel** (right side on desktop, a drawer under 1080px, Esc closes it): latest update quote with its source and time, then owner, approved due date, requested date, status, blocker, dependency (a link that opens that task), priority. A "Request for more time · Pending · Review date request" button. An evidence timeline from `activity_log`, and **"Source in meeting notes"**, the exact `source_sentence`.
- **Dependencies tab:** "Needed first → Then" cards. If the first task isn't done, add an "Inference" line about the risk. The `tasks` table has no dependency column; see REPO-FACTS.
- **Rule:** completing a dependency must **not** mark the blocked task done or clear its blocker.

### 3.6 Activity + change receipt (`/activity`). US-10
- "Every change has a trail." Filters: All / Decisions / Replies / Tasks. The timeline is grouped by day (Today / Yesterday / date) from `activity_log`, joined to `emails`.
- **Selecting an email event** shows the email (From, To `signalridgeco@gmail.com`, Subject, Received, body). Under it, "What Loose Ends recorded": one row per applied change, taken from `activity_log` rows sharing that `email_id`. Unclear replies show "No task changed · asked which task" (`InboundResponse.question`). Unknown senders show "No task changed".
- **Selecting a decision** shows the **Change receipt**: receipt or decision id, task (a link), workstream, field, Before → After, authorised by (name and role), when (Pacific), original request quote, original commitment (`source_sentence`), "Still blocked" if it applies, and notification status ("No notice sent" until issue #16).
- A line noting that replies go to `signalridgeco@gmail.com` and the inbox is checked every minute.

### 3.7 Team (`/team`)
- "Who owns what." Filters: All / Leads / No recent reply, plus search.
- **Columns:** name (avatar, title), email, role (a forest "Lead" pill or a grey "Member" pill), workstream(s) owned, open tasks, last reply (green dot and time, or amber "No update · N days").
- **Hide** the design's "Add teammate" and Slack labels; neither feature exists.

## 4. States checklist (every screen)
Loading skeleton · empty with a next step · error showing the route's `{error}` with Retry · long titles wrap · keyboard: Tab order, Enter/Space, Esc closes panels, dialogs and drawers, arrows move between tabs · visible focus ring (forest, 2.5px) · status shown with an icon **and** text · `prefers-reduced-motion` respected · 320px with no horizontal scroll.

## 5. Out of scope for this build
The follow-through ranking (issue #17, optional), Slack, login, approving by email reply, and webhook or MCP intake (Iliyan: "after that we can go nuts").
