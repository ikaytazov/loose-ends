# Demo script (issue #12, owner: David)

The video follows the 7-step story in `docs/spec-v5.md` ("What the judges will see"), recorded on the live app.
Aim for **about 3 minutes**. Everything the demo types or pastes already exists in `test-data/`.

## Cast: who plays whom, and from which inbox

| Character | Role in the story | Email (from `test-data/team.json`) | Who holds the inbox on recording day |
|---|---|---|---|
| **Maya Chen** | Founder, team lead. Pastes notes, approves dates | abiralameddine@gmail.com | Abir (drives the app on screen) |
| **Priya Shah** | Owns Product launch. Gets the morning email, replies from her phone | ikaytazov@gmail.com | Iliyan (his phone is "Priya's phone") |
| Jordan Lee | Owns Customer onboarding | tellyonu@gmail.com | Valerie (not on camera) |
| Alex Romero | Owns Operations | jerry.yeoh1270@gmail.com | Jerry (not on camera) |
| Sam Okafor | Team member | htvaught@gmail.com | H.T. (not on camera) |

Only **Maya's screen** and **Priya's phone** appear on camera. Screen-record the laptop, and screen-record
(or film) Iliyan's phone for the reply.

## Before every take (5 minutes)

1. **Reset the data.** Paste `supabase/seed.sql` into the Supabase SQL editor and press Run. This also clears old
   emails, so **reply only to the newest morning email**. Older ones no longer match anything.
2. **Check the starting overview.** The four workstreams should read: Product launch *On track*,
   Fundraising *Decision needed*, Operations *Blocked*, Customer onboarding *Update needed*.
   Priya should have **no open tasks**.
3. Open `http://<live app>/api/health`. Every setting should show as present, and the database should answer.
4. **Clean Iliyan's inbox.** Archive older "open tasks" emails so the new one is obvious on the phone.
5. Have `test-data/transcripts/01.md` open, ready to copy, or drop the file on Capture notes.
6. Close Slack, mail and notifications on both screens. Browser at 100% zoom, a window around 1440px wide.

## The script

Each scene has: **Do** (what the person on screen does), **Say** (voice-over), and **Check** (what must be on
screen before moving on). Times are a guide for the edit.

### Scene 1: Monday, after the team meeting (0:00–0:40)
- **Do:** Maya opens **Capture notes**. Drop in `test-data/transcripts/01.md` (or paste it). The date reads
  2026-11-02 from the first line; leave it. Pick attendees Maya, Priya, Jordan, Alex. Press **Read these notes**.
- **Say:** "Every startup has this meeting. Twenty things get promised, and by Thursday nobody remembers who said
  what. Maya just pastes her notes, messy as they are."
- **Check:** the Review screen opens.

### Scene 2: Review and approve (0:40–1:10)
- **Do:** Show the notes on the left with highlighted sentences. Point at one task's source sentence. Two tasks are
  flagged amber with no owner: **Own the launch checklist** and **Renew the vendor contract**. Assign both to
  **Alex Romero**. Press **Approve 8 tasks** and confirm.
- **Say:** "Loose Ends pulls out eight commitments: owner, due date, priority, workstream, and the exact sentence it
  came from. Two have no owner, and it says so instead of guessing. Maya assigns them and approves."
- **Check:** 8 tasks approved. On the board, Priya now has 3 open tasks: the pricing page and partner deck
  (due Thursday 11/5) and the help center FAQ (due Monday 11/9).

### Scene 3: Tuesday, 8 am. The morning email (1:10–1:35)
- **Do:** Press **Send morning emails now** in the top bar, then **Send**. Cut to Priya's phone. Open
  **"Your 3 open tasks for …"**.
- **Say:** "Every morning, each owner gets one email with their open tasks, most urgent first. No app to open, no
  login."
- **Check:** the email lists 1. pricing page, 2. partner deck, 3. FAQ.

### Scene 4: Tuesday, 8:15. Priya replies from her phone (1:35–1:55)
- **Do:** Iliyan taps Reply and types:
  > Pricing page is live. The partner deck needs until Wednesday the 11th, I'm waiting on numbers from finance.

  Send.
- **Say:** "Priya answers the way anyone would, in her own words, from her phone."
- **Why "Wednesday the 11th":** the spec says "next Wednesday", but the reply is read relative to the day it
  arrives. On recording day (Sunday 11/1), "next Wednesday" could mean 11/4, which is before the current due date.
  The explicit date always lands on 11/11.

### Scene 5: Seconds later. The board updates itself (1:55–2:25)
- **Do:** Back on Maya's screen, open **Product launch**. Wait for the update. The inbox is checked every minute,
  so **cut the wait in the edit** and keep the clock visible to stay honest. Open the partner deck's side panel and
  show the activity log.
- **Say:** "Nobody touched the app. The pricing page is done. The partner deck is blocked by finance, and the new
  date is a request, not a change. Because Priya owns this workstream herself, the request goes to Maya. Every change
  shows exactly which words in Priya's email caused it."
- **Check:** pricing page *Done*. Partner deck *Blocked* ("numbers from finance"), with a pending date of 11/11.
  The activity log shows source *email* with Priya's quote. Product launch health shows *Blocked*.

### Scene 6: Tuesday, 9 am. Maya decides (2:25–2:50)
- **Do:** Open **Decisions** (the sidebar badge shows it). The partner deck card shows Thursday 11/5 → Wednesday
  11/11, with Priya's reason. Press **Approve** and confirm.
- **Say:** "Dates only move when the workstream owner says so. Maya approves, the date moves, and Priya gets a
  one-line confirmation."
- **Check:** the due date is now 11/11 and the card moves to *Resolved*. Flash Priya's phone: "Loose Ends: new date
  approved".

### Scene 7: Friday. Follow-through (2:50–3:05)
- **If #17 (follow-through view) is built:** Maya opens it and shows who replies quickly and who delivers
  high-priority work on time. "Only Maya sees this."
- **If not (likely):** open **Team** and show each person's open tasks and last reply. Then close on the overview.
- **Say (close):** "Meeting notes become tasks, tasks become a morning email, and a plain reply keeps the board
  true. Loose Ends: the follow-up nobody has to remember."

## If something goes wrong during a take

| Problem | Fix |
|---|---|
| Reply doesn't show after 2 minutes | Check the reply kept "open tasks" in its subject and went to the newest email. Look in the team Gmail: if the email is still unread, the bridge didn't pick it up. Re-run its `setup` once. |
| The date request goes to the wrong person, or the date moves without approval | Stop and re-seed. Report it in the group chat: it breaks the core promise. |
| Review shows a task as **Already tracked** and leaves it out | The board already has that task. Re-run `seed.sql`; the seed doesn't contain any of the Monday tasks. |
| Notes reader returns 8 *different* tasks (venue, investor update, …) | The real notes reader (#10) isn't live yet, so this is the stub. Its investor update clashes with a seeded task. Record anyway, or wait for #10. |
| Anything else | Re-seed and retake. A take costs about 4 minutes. |

## Gaps to close by Sunday midday (control point 3)

1. ~~"Send morning emails now" button~~ **Fixed:** it's in the top bar of every screen, with a confirm step.
   Scene 3: press it, then **Send**.
2. **Real notes reader (#10, Iliyan).** Scene 2 needs it, so the tasks match transcript 01 and Priya gets exactly 3.
3. ~~Confirmation to Priya after approval~~ **Fixed:** approving or declining now emails the person who asked
   ("Maya approved your new date: … is now due Wed 11 Nov"). Scene 6: flash it on Priya's phone.
4. **Follow-through view (#17).** Unassigned. Scene 7 falls back to the Team screen.
5. **Screens merged and live.** Merge #23 → #24 → #25 → #26, plus Jerry's Overview and Workstream pages, then do one
   full dry run with this script. That dry run is also the end-to-end test (#13).

## Video plan (Sunday afternoon)

- **Record:** laptop screen at 1440px wide (QuickTime or OBS) and Iliyan's phone screen (built-in screen
  recorder). Record the voice-over separately afterwards, so the takes can be cut freely.
- **Edit:** cut the inbox wait in scene 5, keeping a visible "1 minute later" caption. Show the phone side by side
  with the laptop in scenes 3–5. Add the scene times as small captions (Monday, Tuesday 8 am, …).
- **Length:** 3 minutes, and no longer than 4.

## Deck outline (Sunday afternoon, 6–8 slides)

1. **Title:** Loose Ends, the follow-up assistant for startup teams.
2. **The problem:** commitments get lost between meetings. Fellow and Fireflies record what was promised, and
   Geekbot asks for updates, but none of them turns a reply into an updated task.
3. **How it works:** notes → tasks → morning email → plain reply → board updates → owner approves dates. Use the
   overview screenshot.
4. **Demo:** embed the video, or a link to it.
5. **What makes it trustworthy:** due dates never move from a reply; every change shows the words that caused it;
   unclear replies are asked about, not guessed.
6. **How it's built:** Next.js on Vercel, Supabase, Claude for the two AI steps, Gmail.
7. **What's next:** Slack as the first new channel, then asking questions about tasks, login, and the
   follow-through view.
8. **Team:** names and roles.
