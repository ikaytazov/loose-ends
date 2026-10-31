# The three shared agreements

Everyone builds to these. The code versions are in `lib/contracts/` and `supabase/migrations/`; this page explains them.
To change anything here, post in the group chat first — Iliyan updates this page, the code contract and the migration together.

## A. What we keep (Supabase tables)

| Table | What it holds | Fields |
|---|---|---|
| `team_members` | Everyone on the team | name, email (unique), role (`lead` or `member`), avatar_url |
| `workstreams` | Areas of work, one owner each | name (unique), goal, owner_id, target_date |
| `meetings` | Each set of pasted notes | title, meeting_date, attendees, raw_notes, source, status |
| `tasks` | Every commitment | title, workstream_id, meeting_id, owner_id (can be empty), due_date, priority, status, blocker, source_sentence, flags, completed_at |
| `date_requests` | Requests to move a due date | task_id, requested_by, current_due_date, requested_due_date, reason, approver_id, status (`waiting`, `approved`, `declined`), decided_at |
| `emails` | Every email sent or received | direction (`out`/`in`), member_id, kind, subject, body, reply_code, task_refs, gmail_message_id, at, processed |
| `activity_log` | Every change to a task | task_id, actor_id, source (`app`, `email`, `reply_page`, `ai`, `system`), field, old_value, new_value, quote, email_id |

**Worked out, never stored** (database views — read them, don't recalculate them in screens):

| View | Use it for |
|---|---|
| `task_board` | Board and task panel. Adds owner_name, workstream_name, is_overdue, last_update_at/source/quote, pending date request |
| `workstream_overview` | Overview cards. Adds owner_name, total/done/in-progress/not-started counts, last_update_at, **health** |
| `decisions_needed` | "Needs your decision". One row per waiting date request (`kind = date_change`) or task with no owner (`kind = assign_owner`). Filter by `approver_id` |

## Rules everyone builds to

| Rule | How it works |
|---|---|
| Status and blockers | Change straight away when the task owner replies, and are logged |
| Due dates | Never change from a reply. A reply creates a date request; the date moves only when it is approved |
| Who approves | The workstream owner. If the person asking owns that workstream (or it has no owner), the team lead |
| Tasks with no owner | Flagged at review. If still unassigned after approval, they appear in the workstream owner's "Needs your decision" |
| Workstream health | `blocked` if any open task is blocked; else `decision_needed` if a date request is waiting or a task has no owner; else `update_needed` if an open task has had no update for 3 days; else `on_track` |
| Unclear replies | A change the AI is unsure about is logged (`field = unclear`) but not applied |
| One demo workspace | No login. The browser reads everything except emails; all writes go through server routes |

Status values: `proposed` (AI suggested, not yet approved) → `not_started` → `in_progress` / `blocked` → `done`.
Priority: `high`, `medium`, `low`. Task flags: `no_owner`, `no_date`, `unclear`.

## B. What the AI hands back

Code: `lib/contracts/ai.ts`. Both steps return this exact shape (checked by the code), never free text.

**Step 1 — reading notes** (`lib/notes/extract.ts`, currently a stub)
- Given: the notes, meeting date, attendees, team names, workstream names.
- Returns `{ tasks: [...] }`, each with: `title`, `owner_name` (as in the team list, or null), `due_date` (YYYY-MM-DD or null), `priority`, `workstream_name` (as in the list, or null), `source_sentence` (word for word), `flags`.

**Step 2 — reading a reply** (`lib/replies/parse.ts`)
- Given: the reply (quoted history removed), the date it arrived, and the numbered tasks from the email being answered.
- Returns `{ changes: [...], question }`, each change with: `task_number`, `new_status` (or `unchanged`), `blocker`, `requested_due_date`, `reason`, `quote`, `confidence` (`sure`/`unsure`). One reply can change several tasks.

## C. What the morning email looks like

```
From:    Loose Ends <signalridgeco@gmail.com>
Reply-To: signalridgeco+le-<code>@gmail.com      (same inbox; the code says which email is being answered)
Subject: Your 3 open tasks for Tuesday      (must contain "open tasks": the Gmail bridge only picks up replies with these words)

Good morning Priya. You have 3 open tasks, most urgent first.

1. High – Launch the new pricing page – Product launch – due Thursday
2. High – Partner deck – Product launch – due Thursday
3. Medium – Draft FAQ for support – Customer onboarding – due next Monday

Just reply in your own words, for example "1 is done" or "2 needs until Friday, waiting on finance".

Or type your update here: https://<app>/reply/<code>
```

- **Order:** overdue first, then priority, then due date — always via `orderForEmail()` in `lib/email/ordering.ts`.
- **Saved:** each sent morning email is stored in `emails` with `kind = 'morning'`, `reply_code`, and `task_refs = [{ "n": 1, "task_id": "..." }, ...]`. This is how "2 is done" finds the right task.
- **Reply link:** the last line links to the "reply here" page, and is left out when the app address is not set (`APP_URL`).
- **Timing:** 8 am (team time zone) by a scheduled job, plus a "Send morning emails now" button for the demo.
