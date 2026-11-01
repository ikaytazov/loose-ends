# Demo script (issue #12, owner: David)

The video follows the 7-step story in `docs/spec-v5.md` ("What the judges will see"), recorded on the live app.
Aim for **about 3½ minutes**. Everything the demo types or pastes already exists in `test-data/`.

## Cast: who plays whom, and from which inbox

| Character | Role in the story | Email (from `test-data/team.json`) | Who holds the inbox on recording day |
|---|---|---|---|
| **Maya Chen** | Founder, team lead. Pastes notes, approves dates | ikaytazov@gmail.com | Abir (drives the app on screen) |
| **Priya Shah** | Owns Product launch. Gets the morning email and replies | abiralameddine@gmail.com | Abir too: she replies from her own Gmail in a browser tab |
| Jordan Lee | Owns Customer onboarding | tellyonu@gmail.com | Valerie (not on camera) |
| Alex Romero | Owns Operations | jerry.yeoh1270@gmail.com | Jerry (not on camera) |
| Sam Okafor | Team member | htvaught@gmail.com | H.T. (not on camera) |

Only **Maya's screen** and **Priya's phone** appear on camera. Screen-record the laptop, and screen-record
(or film) Iliyan's phone for the reply.

## Before every take (5 minutes)

1. **Reset the data.** Open `<live app>/demo`, enter the team password (the `BRIDGE_SECRET`, ask Iliyan) and press
   **Reset demo data**. It loads the same data as `supabase/seed.sql`, which still works in the Supabase SQL editor
   as a fallback. This also clears old emails, so **reply only to the newest morning email**. Older ones no longer
   match anything.
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

### Opening: the problem (0:00–0:20)
- **Do:** Maya's **Overview**, still.
- **Say:** "Every team leaves a meeting with a list of action items. A week later, nobody is sure which ones got done,
  and the founder ends up chasing people one message at a time. Loose Ends takes care of everything after the
  meeting. Let me show you."

### Scene 1: Monday, after the team meeting (0:20–0:45)
- **Do:** Maya opens **Capture notes**. Drop in `test-data/transcripts/01.md` (or paste it). The date reads
  2026-11-02 from the first line; leave it. Pick attendees Maya, Priya, Jordan, Alex. Press **Read these notes**.
- **Say:** "It's Monday, right after our weekly meeting. Maya, our team lead, just pastes her notes, messy as they
  are."
- **Check:** the Review screen opens.

### Scene 2: Review and approve (0:45–1:10)
- **Do:** Show the notes on the left with highlighted sentences. Point at one task's source sentence. Two tasks are
  flagged amber with no owner: **Own the launch checklist** and **Renew the vendor contract**. Assign both to
  **Alex Romero**. Press **Approve 8 tasks** and confirm.
- **Say:** "Loose Ends pulls out eight tasks, each with an owner, a due date, a priority, a workstream, and the exact
  sentence it came from. Two are flagged because nobody was named. Maya gives them an owner and approves. That's the
  last time anyone has to type tasks in."
- **Check:** 8 tasks approved. On the board, Priya now has 3 open tasks: the pricing page and partner deck
  (due Thursday 11/5) and the help center FAQ (due Monday 11/9).

### Scene 3: Tuesday, 8 am. The morning email (1:10–1:30)
- **Do:** Press **Send morning emails now** in the top bar, then **Send**. Cut to Priya's phone. Open
  **"Your 3 open tasks for …"**.
- **Say:** "Tuesday, 8 a.m. Priya gets one short email with only her open tasks, most urgent first. No app to open,
  no login."
- **Check:** the email lists 1. pricing page, 2. partner deck, 3. FAQ.

### Scene 4: Tuesday, 8:15. Priya replies from her phone (1:30–1:50)
- **Do:** Iliyan taps Reply and types:
  > Pricing page is live. The partner deck needs until Wednesday the 11th, I'm waiting on numbers from finance.

  Send. **Pause the recording** here: the inbox is checked about once a minute.
- **Say:** "She answers the way she'd answer a colleague. That's it."
- **Why "Wednesday the 11th":** the spec says "next Wednesday", but the reply is read relative to the day it
  arrives. On recording day (Sunday 11/1), "next Wednesday" could mean 11/4, which is before the current due date.
  The explicit date always lands on 11/11.

### Scene 5: Seconds later. The board updates itself (1:50–2:20)
- **Do:** Resume recording. On Maya's screen, open **Workstreams**, then **Product launch**, then click
  **Finish the partner deck** to open its side panel.
- **Say:** "A few seconds later, the board has changed on its own. Nobody touched the app. The pricing page is done.
  The partner deck is blocked and waiting on finance, in Priya's own words. Her request for more time is waiting for
  a decision. Notice the due date hasn't moved: in Loose Ends, a reply can never change a deadline by itself."
- **Check:** pricing page *Done*. Partner deck *Blocked* ("numbers from finance"), with a requested date of 11/11
  marked "not approved". The panel quotes Priya's reply. Product launch health shows *Blocked*.

### Scene 6: Maya's overview (2:20–2:55)
- **Do:** Click **Overview**. Point to each part as you mention it.
- **Say:** "Here's Maya's view as team lead. She sees all four workstreams: Product launch, Customer onboarding,
  Fundraising and Operations. Each card shows progress, a health label and the reason behind it: blocked, on track,
  decision needed, or update needed, which means nobody has given an update in three days."
- **Say:** "On the right is Needs your decision. Priya owns Product launch herself, so her request comes to Maya.
  Below that, Recent movement shows what just changed, with the words that caused it."
- **Check:** the partner deck is at the top of **Needs your decision**, marked "you decide".

### Scene 7: Maya decides (2:55–3:15)
- **Do:** Click the partner deck item (or **Open decisions**). On **Decisions**, the card shows Thursday 11/5 →
  Wednesday 11/11 with Priya's reason. Press **Approve** and confirm. Flash Priya's phone.
- **Say:** "One click. The date moves, and Priya gets a one-line confirmation."
- **Check:** the due date is now 11/11 and the card moves to *Resolved*. Priya's phone shows "Loose Ends: new date
  approved".

### Close (3:15–3:30)
- **Do:** Back to the **Overview**. If the Activity page is merged, a two-second shot of Priya's reply card there
  (her words, then everything it changed) works well before this line.
- **Say:** "Paste the notes once. After that, the team keeps the board up to date just by answering email. Maya
  always knows where things stand, without sending a single reminder. That's Loose Ends."
- The follow-through view (#17) isn't built, so it's left out of the video; it's on the roadmap slide instead.

Opening, close and the Overview walkthrough are from H.T.'s draft.

## If something goes wrong during a take

| Problem | Fix |
|---|---|
| Reply doesn't show after 2 minutes | Check the reply kept "open tasks" in its subject and went to the newest email. Look in the team Gmail: if the email is still unread, the bridge didn't pick it up. Re-run its `setup` once. |
| The date request goes to the wrong person, or the date moves without approval | Stop and re-seed. Report it in the group chat: it breaks the core promise. |
| Review shows a task as **Already tracked** and leaves it out | The board already has that task. Re-run `seed.sql`; the seed doesn't contain any of the Monday tasks. |
| Notes reader returns fewer or different tasks than 8 | Check the meeting date reads 2026-11-02 and the whole of `transcripts/01.md` was pasted. Retake; the AI can vary slightly between runs. |
| Anything else | Re-seed and retake. A take costs about 4 minutes. |

## Status before Sunday midday (control point 3)

Everything the script needs is merged:
- **Send morning emails now** button in the top bar (scene 3).
- **Real notes reader** (#10), so scene 2 shows the 8 tasks from transcript 01.
- **Overview, Workstreams and the task panel** (#2, #3), so scenes 1, 5 and 6 have their screens.
- **Confirmation to Priya** after Maya decides (scene 6), and **a notice to Maya** when Priya asks for more time
  (#16): optionally flash Maya's inbox in scene 5, subject "Decision needed: Priya asked for more time".

Still to do:
1. **Load `supabase/seed.sql` into the live database** (Iliyan), then one **full dry run** with this script on the
   live app. That dry run is also the end-to-end test (#13).
2. **Follow-through view (#17)** is optional and unassigned. Scene 7 falls back to the Team screen.

## Video plan

**One continuous Loom take. No stitching.** Loom's desktop app can pause and resume inside a single video, so the
whole demo is one recording with one link. Loom's free plan allows 5 minutes, which covers a 3½-minute video. The
Loom mobile app isn't needed.

**Getting Priya's phone into the same take.** Pick one of these before the dry run:

1. **Zoom screen share (simplest for a group).** Everyone joins one Zoom call. Iliyan shares his iPhone screen from
   the Zoom app (Share → Screen). Abir drives the app as Maya. Whoever records (H.T.) captures their *whole screen*
   with Loom and switches between the browser (the app) and the Zoom window (the phone) at scenes 3, 4 and 7.
2. **Iliyan records it himself.** Priya's inbox is his, so he records on his own laptop: the app in one browser
   window and his Gmail (or his iPhone mirrored to his Mac) in another. One person, no handovers.
3. **iPhone mirroring on a Mac.** Mirror the phone into a window (QuickTime with a cable: File → New Movie
   Recording → pick the iPhone as the camera; or macOS iPhone Mirroring), then record the whole screen with Loom.

**During the take**
- **Pause Loom** right after Priya's reply is sent (scene 4). Resume once the board has updated, about a minute
  later, so the video doesn't show the wait. Add a small "1 minute later" caption if you edit.
- Keep the phone's notifications off, and have Priya's newest "open tasks" email ready to open.

**Before recording:** reset the demo data (step 1 of "Before every take"), send one test morning email to Priya's
address and check it arrives, reset again, then do one full dry run with a timer.

**Length:** about 3½ minutes, no longer than 4.

**Fallback if Loom fights back:** QuickTime or OBS for the laptop screen plus the phone's own screen recorder, with
the voice-over recorded afterwards, then joined in any video editor.

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
