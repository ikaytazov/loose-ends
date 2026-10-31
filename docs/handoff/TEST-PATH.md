# End-to-end test path (for Jerry and Abir)

Based on §6 of the use-case brief, mapped to the real routes. Record for each step: transcript or email id, task id, expected vs observed state, timestamp, and a screenshot or API response.

| # | Step | Expected | Story |
|---|---|---|---|
| 1 | Load the seed data and David's team structure (CEO, workstream owners, members). | `/team` shows roles and which workstream each owner runs. | US-08 |
| 2 | On Vercel `/capture`, upload transcript 1 (`.txt`). | "Reading your notes…" then Review. `meetings.status` = proposed. | US-01 |
| 3 | Edit one owner, remove one proposal, approve. | `{approved, removed}` matches. Tasks appear on `/workstreams/[id]` and the Overview counts change. | US-02, US-07 |
| 4 | Upload transcripts 2 and 3 in date order. | Repeated commitments are flagged, not duplicated. | S1 |
| 5 | Press "Send morning emails now" (stub), then check the 8 a.m. Pacific job. | The preview lists only each person's own tasks, most urgent first. Nothing claims to be delivered while the route is a stub. | US-03 |
| 6 | From a teammate's inbox, reply to the digest: "1 is done. I haven't touched 2, can I have three more days?" | Processed once (Gmail id). Task 1 done; task 2 unchanged plus a pending request to its **workstream owner**. The approved date stays. | US-04, US-05 |
| 7 | As someone who isn't the owner, open `/decisions`. | The request is visible, with no Approve/Decline buttons. (Also POST decide as that person; the server should refuse, see REPO-FACTS gap 1.) | US-06 |
| 8 | As the owner, Approve. | The due date moves once, `activity_log` records it, the receipt shows before → after, actor and time. Overview updates live. | US-06, US-10 |
| 9 | Repeat 6–8 with Decline, then submit the same decision twice. | The date stays; the second call → 409 "Already decided". | US-06 |
| 10 | Reply "I'm working on it" while holding two tasks. | No task changes; a clarifying question is recorded. | US-11 |
| 11 | Reply from an address not on the team list. | `unknown_sender`, nothing changes. | edge |
| 12 | Leave a task with no reply for 3+ days (or seed an old `last_update_at`). | "No update · N days", and the workstream says Update needed. Never shown as on track. | US-07 |
| 13 | Narrow the browser to 320px and use only the keyboard on Capture → Review → Decisions. | No horizontal scroll; every action reachable; focus visible. | — |

You can rehearse every step in the prototype first (Demo tools → restart at Monday). Remember the prototype simulates the AI and email.
