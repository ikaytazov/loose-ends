# Test data (owner: David)

No coding needed. Create these files and upload them on GitHub (open the `test-data` folder → **Add file → Upload files**),
or send them to Iliyan. Keep the names exactly as below — other people's code reads them.

Use the cast from the mockups unless we agree otherwise: **Maya** (founder, team lead), **Priya**, **Jordan**, **Alex**,
plus anyone else you like. Workstreams: **Product launch** (Priya), **Customer onboarding** (Jordan), **Fundraising** (Maya), **Operations** (Alex).
Use **real email addresses** for anyone who will reply on stage (ask teammates), made-up ones for the rest.

## 1. `team.json` — the team and workstreams
```json
{
  "members": [
    { "name": "Maya Chen", "email": "maya@example.com", "role": "lead" },
    { "name": "Priya Shah", "email": "priya@example.com", "role": "member" }
  ],
  "workstreams": [
    { "name": "Product launch", "goal": "Launch a clear pricing offer and a reliable onboarding journey.", "owner": "Priya Shah", "target_date": "2026-11-06" }
  ]
}
```

## 2. `transcripts/01.md` … `05.md` — messy meeting notes
Write them the way real notes look: half sentences, vague owners ("someone should…"), relative dates ("next Friday",
"end of week"), side chatter, one or two things that are NOT tasks. 300–1,000 words each. Put the meeting date and
attendees on the first two lines:
```
Date: 2026-11-02
Attendees: Maya, Priya, Jordan, Alex
...notes...
```
Make `01.md` the Monday meeting from the demo story (8 tasks, 2 with no owner).

## 3. `expected/01.json` … — the answer key for each transcript
The tasks a careful person would pull out. This lets the AI be scored automatically.
```json
{
  "tasks": [
    { "title": "Launch the new pricing page", "owner_name": "Priya Shah", "due_date": "2026-11-05", "priority": "high",
      "workstream_name": "Product launch", "source_sentence": "Priya will get the new pricing page live by Thursday.", "flags": [] },
    { "title": "Own the launch checklist", "owner_name": null, "due_date": "2026-11-06", "priority": "medium",
      "workstream_name": "Product launch", "source_sentence": "Someone needs to own the launch checklist.", "flags": ["no_owner"] }
  ]
}
```
`priority`: high, medium or low. `flags`: any of no_owner, no_date, unclear. Dates as YYYY-MM-DD.

## 4. `replies.json` — sample replies and what they should do
Each reply answers a morning email with numbered tasks. Mix easy and hard ones: "done", "2 is blocked", "need till Friday",
one reply covering two tasks, a reply naming the task instead of the number, typos, and a few genuinely unclear ones.
```json
[
  {
    "from": "priya@example.com",
    "received_date": "2026-11-03",
    "email_tasks": [
      { "n": 1, "title": "Launch the new pricing page", "status": "in_progress", "due_date": "2026-11-05", "priority": "high" },
      { "n": 2, "title": "Finish the partner deck", "status": "not_started", "due_date": "2026-11-05", "priority": "high" }
    ],
    "reply": "Pricing page is live. The partner deck needs until next Wednesday, I'm waiting on numbers from finance.",
    "expected": [
      { "task_number": 1, "new_status": "done", "blocker": null, "requested_due_date": null },
      { "task_number": 2, "new_status": "blocked", "blocker": "numbers from finance", "requested_due_date": "2026-11-11" }
    ],
    "should_be_unsure": false
  }
]
```
