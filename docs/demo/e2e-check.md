# End-to-end check (issue #13)

Run this after each merge to `main`, until Sunday's feature freeze. Post what broke in the group chat or as a new issue.

## 1. Automatic check (2 minutes)

Needs `.env.local` with the same Supabase and `BRIDGE_SECRET` values as the app being tested, plus `TEAM_EMAIL`.

```bash
E2E_URL=https://<live app> E2E_MEMBER_EMAIL=<your team address> npm run e2e
```

It runs paste notes → approve → send morning email → reply → board updates → approve the new date, and stops at the first failure.

- It writes to the live database. Two `[E2E]` tasks stay on the board, so reset the data before recording (`docs/demo/script.md`).
- It emails only `E2E_MEMBER_EMAIL`.
- `/api/inbound` stands in for the reply, so the script does **not** prove that a real Gmail reply reaches the app.

## 2. By hand on the live app (5 minutes)

| Step | Expected |
|---|---|
| Paste `test-data/transcripts/01.md` on Capture notes and approve | Tasks appear on the workstream page |
| Press "Send morning emails now" | The email arrives, with your tasks most urgent first |
| Reply from a phone: "1 is done. 2 needs until Friday" | Within a minute, task 1 is Done, and task 2 keeps its date and shows a date request |
| Approve the new date on Decisions | The date moves, and the person gets a notice |

## What to record when something breaks

The step, what you expected, what you saw, the time, and the commit on `main`.
