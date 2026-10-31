**Loose Ends**

The follow-up assistant for startup teams

MVP proposal for the Outskill hackathon team \| 30 October 2026 \| Draft
v5 for team review

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>What changed from v4.</strong> This draft folds in the
gaps found when we checked the spec against the screen mockups:</p>
<ul>
<li><p><strong>Workstreams.</strong> Every task belongs to a workstream,
and every workstream has an owner. The board and the overview are
grouped by workstream, as in the mockups.</p></li>
<li><p><strong>New dates need approval.</strong> An owner can ask for
more time by replying to the morning email. The date only moves once the
workstream owner approves it.</p></li>
<li><p><strong>Our own demo data.</strong> We load our team list and a
few real meeting transcripts, and test the AI against them.</p></li>
<li><p><strong>One way in, one email address.</strong> Notes come in
through a paste page. One team email address sends the morning emails
and receives every reply.</p></li>
<li><p><strong>The three shared agreements are drafted</strong> (page
6), so the sub-teams can build against them tonight.</p></li>
</ul></td>
</tr>
</tbody>
</table>

# The idea

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p>Every startup team leaves its meetings with a list of action
items, and within a week nobody is sure which ones are done. The tasks
sit in a tool that people have to remember to open, so updates stop and
the founder ends up chasing people one message at a time.</p>
<p>Loose Ends takes care of everything after the meeting. Paste in the
notes and it works out who owes what, by when, and which workstream it
belongs to. Every morning, each person gets a short email listing their
own open tasks, most urgent first. They reply the way they would answer
a colleague, with "done" or "waiting on legal, need until Friday", and
the task board updates itself. When someone needs more time, the owner
of that workstream approves the new date with one click.</p>
<p><strong>The founder always knows where things stand, without sending
a single reminder.</strong></p></td>
</tr>
</tbody>
</table>

## Why this can win

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>It fixes the step other tools skip</strong></p>
<p>Fellow and Fireflies record what was promised, and Geekbot asks for
updates in Slack. None of them takes a reply and updates the right task,
which is where teams actually lose track.</p></td>
<td><p><strong>The demo explains itself</strong></p>
<p>A teammate answers an email from their phone on stage, and the judges
watch the board change a few seconds later.</p></td>
<td><p><strong>We can build it this weekend</strong></p>
<p>One AI step reads the notes, a second reads the replies, Supabase
holds the board, and one email address does all the sending and
receiving.</p></td>
</tr>
</tbody>
</table>

# What the judges will see

The demo follows one founder and her team through a normal week. Maya is
the founder and team lead. Priya owns the Product launch workstream;
Jordan, Alex and Maya own the other three.

1.  **Monday, after the team meeting.** Maya pastes her meeting notes on
    the Capture notes page. Loose Ends lists eight tasks, each with an
    owner, a due date, a suggested priority, a suggested workstream and
    the sentence it came from. Two are flagged because nobody was named.

2.  **Two minutes later.** Maya assigns the two flagged tasks, approves
    the list, and the tasks appear on the board under their workstreams.

3.  **Tuesday, 8 am.** Priya receives an email from the team address:
    "Good morning Priya. You have 3 open tasks. 1. High priority: launch
    the new pricing page, due Thursday."

4.  **Tuesday, 8:15 am.** From her phone, Priya replies: "Pricing page
    is live. The partner deck needs until next Wednesday, I'm waiting on
    numbers from finance."

5.  **Seconds later.** The board shows the pricing page as done. The
    partner deck shows as blocked by finance, with a request to move the
    date to next Wednesday, awaiting a decision. Because Priya owns
    Product launch herself, the request goes to Maya. The activity log
    shows both changes came from Priya's email.

6.  **Tuesday, 9 am.** Maya opens the overview, sees the partner deck
    under "Needs your decision", and approves the new date. The date
    moves, and Priya gets a one-line confirmation.

7.  **Friday.** Maya opens her follow-through view and sees who replies
    quickly and who delivers high-priority work on time. Only she can
    see it.

# What we commit to ship

These six steps, working together on the live app, are the whole MVP.
Everything else is optional.

<table style="width:100%;">
<colgroup>
<col style="width: 16%" />
<col style="width: 16%" />
<col style="width: 16%" />
<col style="width: 16%" />
<col style="width: 16%" />
<col style="width: 16%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>1 Paste notes</strong></p>
<p>The lead pastes notes or a transcript from any meeting</p></td>
<td><p><strong>2 Review</strong></p>
<p>AI proposes tasks, owners, dates, priority and workstream; the lead
approves</p></td>
<td><p><strong>3 Morning email</strong></p>
<p>Each owner gets their own open tasks, most urgent first</p></td>
<td><p><strong>4 Reply</strong></p>
<p>The owner answers in plain words, as they would to a
colleague</p></td>
<td><p><strong>5 Board updates</strong></p>
<p>Status and blockers change within 30 seconds</p></td>
<td><p><strong>6 Approve dates</strong></p>
<p>A new date waits for the workstream owner, then moves</p></td>
</tr>
</tbody>
</table>

|                                                                                                                                                                                                                                                                 |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Demo test:** an owner replies to their morning email. Within 30 seconds the correct task on the board changes status, and any new date they asked for appears in the workstream owner's "Needs your decision" list. Nobody opens the app to make this happen. |

# What is in and what waits *Framework 4.2*

We sorted every idea into four groups. Must-haves are the six steps
above; Should-haves come next; Could-haves only if time remains;
Won't-haves are deliberately out of this build. ★ marks a feature that
Fellow, Fireflies and Geekbot do not offer. **NEW** marks a change from
v4.

| **Feature**                                                                       | **M** | **S** | **C** | **W** | **★** | **Why it sits here**                                                                                                                                |
|-----------------------------------------------------------------------------------|-------|-------|-------|-------|-------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| **Must have: without these, the product does not keep its promise**               |       |       |       |       |       |                                                                                                                                                     |
| Paste meeting notes or a transcript, with date and attendees, on a web page       | **✓** |       |       |       |       | Where every demo starts. The date lets the AI turn "next Friday" into a real date.                                                                  |
| AI pulls out tasks, owners and due dates                                          | **✓** |       |       |       |       | Every competitor does this, and nothing else works without it.                                                                                      |
| AI suggests a priority and a workstream; the lead confirms **NEW**                | **✓** |       |       |       |       | Priority decides what goes to the top of each morning email; the workstream decides where the task sits and who approves date changes.              |
| Shows the sentence each task came from and flags gaps                             | **✓** |       |       |       | ★     | Reviewers of Fellow and Fireflies complain about wrong action items. This builds trust for very little work.                                        |
| Review and approve screen                                                         | **✓** |       |       |       |       | Nobody should get an email about a task the lead has not checked.                                                                                   |
| Workstreams, each with one owner **NEW**                                          | **✓** |       |       |       |       | Groups the work the way the team thinks about it, and names the person who approves date changes. Set up from our own team list.                    |
| Overview of workstreams with a health label and progress **NEW**                  | **✓** |       |       |       |       | The screen the lead opens first. Labels (On track, Blocked, Decision needed, Update needed) are worked out from the tasks, so they cannot go stale. |
| Task board grouped by workstream, with owner filter and overdue tasks highlighted | **✓** |       |       |       |       | Where the lead, and the judges, watch status change.                                                                                                |
| Team list with names, email addresses and roles                                   | **✓** |       |       |       |       | Tells the app who gets which morning email, who owns which workstream and who the team lead is.                                                     |
| Morning email to each owner with their own tasks, from one team address           | **✓** |       |       |       | ★     | Pain 2. Each person sees only what they owe, most urgent first. The same address receives the replies.                                              |
| Reply by email in plain words to update a task                                    | **✓** |       |       |       | ★     | Pain 1 and the heart of the demo. None of the competitors we checked does this.                                                                     |
| New due dates asked for by reply, approved by the workstream owner **NEW**        | **✓** |       |       |       |       | Owners can ask for more time in their own words, and the person responsible for the workstream decides. No date moves without a decision.           |
| "Needs your decision" list for each workstream owner **NEW**                      | **✓** |       |       |       |       | Collects date requests and tasks with no owner in one place, with Approve and Decline buttons.                                                      |
| Activity log on each task                                                         | **✓** |       |       |       |       | Shows that the reply caused the change, and feeds the follow-through view.                                                                          |
| **Should have: we build these once the core flow works**                          |       |       |       |       |       |                                                                                                                                                     |
| Follow-through view, visible to the lead only                                     |       | **✓** |       |       | ★     | Pain 3. Ranks people on replying and on delivering high-priority work on time. The core flow works without it.                                      |
| Confirm each change; ask when a reply is unclear                                  |       | **✓** |       |       |       | If the AI updates the wrong task, people stop trusting it. A one-line confirmation prevents that.                                                   |
| Email the workstream owner when a date request arrives **NEW**                    |       | **✓** |       |       |       | A short notice with a link to the decision, so approvals do not wait for someone to open the app.                                                   |
| **Could have: only if time remains**                                              |       |       |       |       |       |                                                                                                                                                     |
| Approve or decline a new date by replying to the notice **NEW**                   |       |       | **✓** |       |       | Keeps the workstream owner in email too. The reply-reading step can be reused.                                                                      |
| Notes sent in by email, webhook or MCP **NEW**                                    |       |       | **✓** |       |       | Pasting covers the demo. The same intake step can accept notes from other tools later.                                                              |
| Milestones inside a workstream **NEW**                                            |       |       | **✓** |       |       | Shown in the mockups, but workstreams already give the grouping the demo needs.                                                                     |
| Telegram as a second channel                                                      |       |       | **✓** |       | ★     | Shows the idea works beyond email. Few of our likely users are on Telegram, so it stays optional.                                                   |
| Voice-note updates                                                                |       |       | **✓** |       | ★     | Memorable on stage, but adds a speech-to-text service.                                                                                              |
| Alert the lead when a high-priority task goes quiet                               |       |       | **✓** |       | ★     | The "Update needed" label covers this on screen; an alert email is the next step.                                                                   |
| Next meeting's notes update open tasks                                            |       |       | **✓** |       | ★     | Useful, but email replies already keep the board current.                                                                                           |
| Ask questions about tasks ("what is Priya working on?")                           |       |       | **✓** |       |       | All three competitors offer this; a good roadmap slide.                                                                                             |
| Login, drag-and-drop, file uploads                                                |       |       | **✓** |       |       | Polish. A single demo workspace proves the idea.                                                                                                    |
| **Won't have in this build**                                                      |       |       |       |       |       |                                                                                                                                                     |
| Slack and Microsoft Teams                                                         |       |       |       | **✓** |       | Slack is the first channel to add after the hackathon, since that is where most startups talk.                                                      |
| SMS                                                                               |       |       |       | **✓** |       | US carrier registration for business texting can take days.                                                                                         |
| Recording meetings                                                                |       |       |       | **✓** |       | Fellow and Fireflies already do this well; we take notes from any tool.                                                                             |
| Asana or Jira sync, calendar, billing, mobile app                                 |       |       |       | **✓** |       | Needed for a real product, but not to prove the idea.                                                                                               |

# Final MVP scope *Framework 4.3*

<table>
<colgroup>
<col style="width: 23%" />
<col style="width: 76%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>The flow we commit to ship</strong></td>
<td>Notes go in, the lead approves the tasks under their workstreams,
each owner gets a morning email, their plain-language reply updates the
board, and any new date waits for the workstream owner's approval.</td>
</tr>
<tr class="even">
<td><strong>Should-haves (three)</strong></td>
<td><p>1. <strong>Follow-through view for the lead only</strong>,
ranking people on reply speed and on-time delivery of high-priority
tasks.</p>
<p>2. <strong>Confirm and clarify</strong>: the app confirms each change
by email and asks which task is meant when a reply is unclear.</p>
<p>3. <strong>Decision notice</strong>: the workstream owner gets an
email when a date request arrives.</p></td>
</tr>
<tr class="odd">
<td><strong>Parked deliberately</strong></td>
<td><p><strong>Approving by email reply, notes by email, webhook or MCP,
milestones</strong>: first in line if the six steps and the Should-haves
work early.</p>
<p><strong>Telegram and voice notes</strong>: after those.</p>
<p><strong>Slack</strong>: first channel after the hackathon; expect
judges to ask about it.</p>
<p><strong>Alerts on stalled tasks and next-meeting updates</strong>:
version 2.</p></td>
</tr>
</tbody>
</table>

# How we split the work

We split into two sub-teams covering four layers, so each can work in
parallel tonight and we connect the pieces on Saturday morning. Everyone
picks the layer they enjoy most or feel strongest in; roughly two people
per layer works for a team of seven.

| **Sub-team**  | **Layer**        | **What it covers in Loose Ends**                                                                                                                                                                                                                                                                                                                                                            | **Ready for Saturday morning when**                                                                                                     |
|---------------|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| **Front-end** | 1\. Screens      | The screens in the mockups: overview of workstreams with "Needs your decision" and recent updates, the workstream page with its tasks, and the task panel with the latest reply and any date request. Plus the screens the mockups do not show yet, in the same style: paste notes, review and approve (with source sentence and flags), and the team list. Later, the follow-through view. | Every screen works against the demo data in Supabase, and the flow from pasting notes to approving a new date can be clicked through.   |
| **Back-end**  | 2\. Automations  | The jobs that run on their own: sending each owner's morning email from the team address, receiving their reply at the same address, passing it to the AI, applying status and blocker changes, creating date requests for the right approver, and writing the activity log. Then the confirmation emails.                                                                                  | A test reply to a test email changes a task's status, creates a date request for the workstream owner, and writes activity log entries. |
| **Back-end**  | 3\. Data store   | The Supabase tables in agreement A (page 6), loaded with our team list, our workstreams and the tasks from our transcripts. Plus the calculated views for workstream health and the follow-through ranking.                                                                                                                                                                                 | Tables are live in Supabase, filled with our demo data, and the other layers can read and write them.                                   |
| **Back-end**  | 4\. AI and email | The two Claude prompts (one reads meeting notes, one reads replies) and the email service with our one team address. Includes a test set built from our transcripts and a list of messy replies.                                                                                                                                                                                            | Both prompts return clean results on the test set, and the team address can send and receive.                                           |

|                                                                                                                                                                                                                                                                                                                                                                                                                        |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **So the layers fit on Saturday:** before we split up tonight, we agree the three shared agreements on page 6: the fields in each Supabase table, the format the two AI steps return, and what the morning email looks like. They go into the Claude Project and into the code repository, so every sub-team's Claude builds against the same files. Connecting the pieces then becomes a check rather than a rebuild. |

## What we provide

- **Team list:** name, email address and role for each person, the team
  lead, and which workstream each person owns. Use real addresses for
  anyone who will reply on stage.

- **Workstreams:** four to start, each with a name, a one-line goal and
  an owner. The mockups use Product launch, Customer onboarding,
  Fundraising and Operations; we can swap in our own.

- **Meeting transcripts:** three to five, ideally messy ones with vague
  owners and dates like "next Friday". One becomes Monday's demo
  meeting; the rest test the notes-reading prompt.

- **Sample replies:** ten to fifteen, written the way people really
  answer: "done", "2 is blocked", "need till Friday", replies covering
  two tasks, and some that are unclear.

# The three shared agreements *Draft for tonight*

## A. What we keep: Supabase tables

| **Table**         | **What it holds**             | **Fields**                                                                                                                                                                                                                |
|-------------------|-------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **team_members**  | Everyone on the team          | name, email (unique), role (lead or member)                                                                                                                                                                               |
| **workstreams**   | Areas of work, one owner each | name, goal (one line), owner, target date                                                                                                                                                                                 |
| **meetings**      | Each set of pasted notes      | title, meeting date, attendees, the notes as pasted                                                                                                                                                                       |
| **tasks**         | Every commitment              | title, workstream, meeting, owner (can be blank), due date, priority (high, medium, low), status (proposed, not started, in progress, blocked, done), blocker, source sentence, flags (no owner, no date), date completed |
| **date_requests** | Requests to move a due date   | task, requested by, current date, requested date, reason, approver, status (waiting, approved, declined), decided at                                                                                                      |
| **emails**        | Every email sent or received  | direction (out or in), person, kind (morning, confirmation, question, decision notice, reply), text, time sent or received, processed (yes or no)                                                                         |
| **activity_log**  | Every change to a task        | task, who, how (app, email, reply page), what changed (old and new value), the words quoted from the reply, time                                                                                                          |

**Worked out, never stored:** workstream health, progress ("6 of 10
completed"), latest update and the follow-through ranking. They are
calculated from the tables above, so they always match the tasks.

## Rules everyone builds to

| **Rule**                | **How it works**                                                                                                                                                                                |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Status and blockers** | Change straight away when the task owner replies, and are logged.                                                                                                                               |
| **Due dates**           | Never change from a reply. A reply creates a date request; the date moves only when it is approved.                                                                                             |
| **Who approves**        | The workstream owner. If the person asking owns that workstream, the request goes to the team lead.                                                                                             |
| **Tasks with no owner** | Flagged at review. If still unassigned after approval, they appear in the workstream owner's "Needs your decision" list.                                                                        |
| **Workstream health**   | Blocked if any open task is blocked; otherwise Decision needed if anything is waiting for a decision; otherwise Update needed if an open task has had no update for 3 days; otherwise On track. |
| **Unclear replies**     | Until the Should-have is built, a change the AI is unsure about is logged but not applied.                                                                                                      |

## B. What the AI hands back

| **AI step**            | **It is given**                                                                      | **It returns, for each item**                                                                                                                                                                                          |
|------------------------|--------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Reading notes**   | The notes, the meeting date, the attendees, the team list and the workstream list    | Task title; owner (a name from the team list, or blank); due date as a calendar date (or blank); priority; workstream (from the list, or blank); the source sentence word for word; flags (no owner, no date, unclear) |
| **2. Reading a reply** | The reply, the date it arrived, and the numbered tasks from the email being answered | Task number; new status (or unchanged); blocker (or blank); requested due date (or blank); reason; sure or unsure. One reply can return changes to several tasks.                                                      |

Both steps return data in a fixed format that the code checks, never
free text. The format is written once in the code and shared by the AI
step, the review screen and the reply handler.

## C. What the morning email looks like

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>From:</strong> Loose Ends &lt;tasks@[our domain]&gt; (the
same address receives every reply)</p>
<p><strong>Subject:</strong> Your 3 open tasks for Tuesday</p>
<p>Good morning Priya. You have 3 open tasks, most urgent first.</p>
<p>1. <strong>High</strong> – Launch the new pricing page – Product
launch – due Thursday</p>
<p>2. <strong>High</strong> – Partner deck – Product launch – due
Thursday</p>
<p>3. <strong>Medium</strong> – Draft FAQ for support – Customer
onboarding – due next Monday</p>
<p><em>Just reply in your own words, for example "1 is done" or "2 needs
until Friday, waiting on finance".</em></p></td>
</tr>
</tbody>
</table>

- **Order:** overdue first, then by priority, then by due date. Numbers
  let a reply say "2" instead of the task name.

- **Matching:** the reply-to address carries a code for this email, so a
  reply is matched to these exact tasks.

- **Timing:** sent at 8 am by a scheduled job, plus a "Send morning
  emails now" button for the demo.

# How it is built

| **Part**     | **What we use**                                                                                                                                                                           |
|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Web app**  | One Next.js app on Vercel holds the screens and the server code that receives emails and talks to the AI. One project, one address.                                                       |
| **Data**     | Supabase. Live updates are switched on for tasks, date requests and the activity log, so the board changes on screen without a refresh.                                                   |
| **AI**       | The Claude API, with the two steps in agreement B.                                                                                                                                        |
| **Email**    | One email service that sends and receives on a domain we control. Incoming replies are passed to our app within seconds.                                                                  |
| **Code**     | One GitHub repository. A CLAUDE.md file tells every sub-team's Claude the folder each layer owns, the shared agreements and the rule that tables only change through new migration files. |
| **Not used** | n8n or other workflow tools. Everything runs inside the app, so Claude can see, test and fix all of it, and replies are not delayed by a polling cycle.                                   |

# Schedule and control points

Friday is day 1 of the hackathon, so we use tonight to align and start
building. There are three control points, and we submit on Sunday
evening, or Monday morning at the latest.

| **When**                                          | **What happens**                                                                                                                        | **Done means**                                                                                                                              |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| **Friday evening**                                | Team meeting: approve this draft, pick layers and agree the three shared agreements. Set up the email domain. Sub-teams start building. | Every Must-have has an owner, the agreements are saved in the Project and the repo, and a test email from the team address reaches a phone. |
| **Saturday morning**                              | **Control point 1.** Each sub-team has finished its layer. We connect them and try the tool end to end with our demo data.              | A reply to a morning email updates the right task on the board, and a date request reaches the workstream owner.                            |
| **Saturday, during the day**                      | Fix what broke when the layers met, list improvements, and start the Should-haves once the six steps work reliably.                     | Fixes and improvements are assigned.                                                                                                        |
| **Saturday evening**                              | **Control point 2.** Asynchronous check-in: each sub-team posts what is done, what is open and what it needs.                           | Sunday's work is agreed without a meeting.                                                                                                  |
| **Sunday midday**                                 | **Control point 3.** We confirm Loose Ends is working to our liking. Feature freeze from here.                                          | The demo story runs start to finish on the live app.                                                                                        |
| **Sunday afternoon**                              | Record the demo video and build the deck.                                                                                               | Video and deck are reviewed by the whole team.                                                                                              |
| **Sunday evening (Monday morning at the latest)** | **Submit.**                                                                                                                             | Submission confirmed by the organisers.                                                                                                     |

## If we fall behind

- **Friday night:** if the email domain is not receiving by the end of
  the evening, we build the "reply here" page first (below) and keep
  working on email in parallel.

- **Saturday morning:** if reading email replies is not working at
  control point 1, each morning email gets a "reply here" link to a
  simple page where the owner types the same plain-language update, so
  the AI step, the date requests and the demo stay intact.

- **Saturday evening:** if the six steps do not yet work reliably from
  start to finish, we drop the Should-haves and spend Sunday morning on
  reliability.

- **Sunday midday:** feature freeze. After this, only fixes, the video
  and the deck.

# Decisions for tonight's meeting

- **What we build.** Approve the six steps (page 2), including
  workstreams and owner approval of new dates, plus the three
  Should-haves if time allows.

- **Who approves a workstream owner's own request.** Proposed: the team
  lead.

- **Our workstreams.** Keep the four from the mockups or name our own,
  and name each owner.

- **Demo data.** Who supplies the team list, the transcripts and the
  sample replies, and by when tonight.

- **Email address.** Which domain we use for the team address, and who
  sets it up tonight.

- **The name.** Keep "Loose Ends" or choose a better one.

- **Who does what.** Each of us picks one of the four layers. Every
  layer needs at least one person, and every Must-have needs someone
  responsible for it.

# Appendix: every idea we considered *Framework 4.1*

The full list behind the scope table, drawn from our three pains, team
discussion, the competitor scan of Fellow, Fireflies and Geekbot, and
the screen mockups.

| **Area**             | **Ideas considered**                                                                                                                                                                                                                              |
|----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Capture**          | Paste notes or transcripts; notes by email, webhook or MCP; AI extraction of task, owner and date; suggested priority and workstream; source sentence and flags; file and photo uploads; meeting recording                                        |
| **Review and board** | Review screen; workstreams with owners and health labels; milestones; task board; owner filter and overdue highlight; activity log; next-meeting carry-over; drag-and-drop; recap email to attendees                                              |
| **Follow-up**        | Team list; morning email digest from one team address; plain-language email replies; date requests approved by the workstream owner; approval by email reply; confirmations and clarifying questions; Telegram; voice notes; Slack, Teams and SMS |
| **Lead's view**      | Workstream overview; "Needs your decision" list; follow-through ranking; alerts on stalled priority tasks; questions about tasks and past meetings; participation analytics                                                                       |
| **Platform**         | Supabase backend (required); Vercel hosting; login; Asana, Jira or Linear sync; calendar; workspaces; billing; mobile app; enterprise security                                                                                                    |
