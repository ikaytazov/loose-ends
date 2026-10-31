# Who does what

Update this page when you pick up a task (pull request or ask Iliyan).

## Assigned

| Person | Area | Tasks |
|---|---|---|
| **Iliyan** | Back-end | Repo, Vercel and Supabase set up and shared · schema and shared contracts (`lib/contracts`, `docs/`) · stub routes · team address on Gmail (send + receive) · reply-reading prompt and applying updates |
| **Jerry** | Front-end | App shell and styling (sidebar, colors, fonts from the mockups) first, then Overview, Workstream page, task side panel |
| **Valerie** | Front-end | Capture notes, Review & approve, Team list, Approve/Decline for dates (starts after Jerry pushes the shell) |
| **David** | Test data | Team list, 3–5 messy transcripts with answer keys, 10–15 sample replies — format in `test-data/README.md` |

## Unassigned — Abir and H.T., pick from here

| # | Task | When | Depends on | Where |
|---|---|---|---|---|
| 1 | **Seed data**: load David's team list, workstreams and sample tasks into Supabase so screens show real data | Tonight | Schema (done); `test-data/team.json` | `supabase/seed.sql` |
| 2 | **Notes-reading prompt** (AI step 1): replace the stub in `lib/notes/extract.ts` with a Claude call; score it against David's answer keys | Tonight / Sat am | David's transcripts | `lib/notes/` |
| 3 | **Morning email**: wording, sending, saving `reply_code` + `task_refs`, 8 am scheduled job, "Send now" | Sat am | Seed data; Gmail bridge | `app/api/emails/send-morning/route.ts` (instructions at the top) |
| 4 | **Demo owner**: script for the 7-step story, then video and deck on Sunday | Start Sat | Spec v5 | `docs/demo/` |
| 5 | **End-to-end tester**: run the demo test after each merge, report what broke | Sat | Everything merged | — |
| 6 | **"Reply here" fallback page**, if email replies are unreliable | Sat, only if needed | Reply handling | new route + screen |
| 7 | **Confirmation and clarifying emails** (Should-have) | Sat pm | Reply handling (`question` field) | `lib/email/` |
| 8 | **Decision notice email** to the workstream owner (Should-have) | Sat pm | Date requests | `lib/email/` |
| 9 | **Follow-through view**: query and screen, lead only (Should-have) | Sat pm | Activity log data | new view + screen |

Suggested: Abir takes 1 and 2 (data and AI), H.T. takes 3 and 4 (email and demo).
