-- Loose Ends demo seed (issue #9). Built from test-data/team.json.
-- Replaces the temporary seed-dev.sql. Load it in the Supabase SQL editor (paste and Run).
--
-- What it sets up: the team, the four workstreams, and LAST WEEK's work from three meetings
-- (launch planning, test-data/transcripts/02.md and 03.md). The Monday demo meeting
-- (transcripts/01.md) is deliberately NOT loaded: Maya pastes it live in the demo.
--
-- Starting health on the overview, one of each:
--   Product launch      on_track         (Sam's graphics updated a few hours ago)
--   Fundraising         decision_needed  (financial model has no owner)
--   Operations          blocked          (Maya is waiting on laptops coming back in stock)
--   Customer onboarding update_needed    (welcome call script: no update for 4 days)
-- Priya has no open tasks here, so after the demo paste her morning email lists exactly 3.
--
-- Dates are relative to the day it is loaded, so load it on the day you test or record.
-- Safe to re-run: it clears every table first (including any emails and date requests).

truncate public.activity_log, public.date_requests, public.emails, public.tasks,
         public.meetings, public.workstreams, public.team_members cascade;

-- ---------------------------------------------------------------------------
-- Team (roles and emails from test-data/team.json)
-- ---------------------------------------------------------------------------
insert into public.team_members (name, email, role) values
  ('Maya Chen', 'abiralameddine+maya@gmail.com', 'lead'),
  ('Priya Shah', 'abiralameddine@gmail.com', 'member'),
  ('Jordan Lee', 'abiralameddine+jordan@gmail.com', 'member'),
  ('Alex Romero', 'abiralameddine+alex@gmail.com', 'member'),
  ('Sam Okafor', 'abiralameddine+sam@gmail.com', 'member');

-- ---------------------------------------------------------------------------
-- Workstreams, one owner each. Target dates are days from today.
-- ---------------------------------------------------------------------------
insert into public.workstreams (name, goal, owner_id, target_date)
select w.name, w.goal, m.id, current_date + w.days
from (values
  ('Product launch', 'Launch a clear pricing offer and a reliable onboarding journey.', 'Priya Shah', 7),
  ('Customer onboarding', 'Get new customers live in their first week.', 'Jordan Lee', 14),
  ('Fundraising', 'Close the seed extension.', 'Maya Chen', 30),
  ('Operations', 'Keep vendors, payroll and tools running.', 'Alex Romero', 21)
) as w(name, goal, owner, days)
join public.team_members m on m.name = w.owner;

-- ---------------------------------------------------------------------------
-- Last week's meetings (already approved)
-- ---------------------------------------------------------------------------
insert into public.meetings (title, meeting_date, attendees, raw_notes, source, status, created_at) values
  ('Launch planning', current_date - 7, '{Maya,Priya,Jordan,Sam}', $notes$Launch planning (Maya's notes)

- launch is next Friday, date is locked, no more moving it
- Priya to write the launch announcement post before launch week.
- Jordan to set up signup tracking on the website this week.
- Sam will make the launch social graphics.
- pricing page still needs work, Maya will raise it at the Monday meeting
- long chat about the launch party. no budget, maybe pizza$notes$,
   'paste', 'approved', now() - interval '7 days'),
  ('Fundraising sync', current_date - 5, '{Maya,Alex,Priya}', $notes$Fundraising sync (auto-transcript from the call recorder, lightly cleaned up)

Maya: Okay, I think we're all here. Alex, can you hear me? Your mic was doing the robot thing earlier.

Alex: I can hear you. I moved rooms, the kitchen has better wifi apparently.

Maya: Great. So, quick one today. The main thing is the seed extension. We've got soft interest from two of the existing investors, and I want to have everything tight before the partner calls.

Priya: Do we know which partners yet?

Maya: Mostly. I'll book the two partner calls by Friday. They want the week of the ninth, so that lines up with the launch nicely.

Alex: Nice. Is that the one where they asked about burn last time?

Maya: Same people, yes. Which brings me to the boring part. I'll get the investor update out tomorrow, it's mostly written, I just need the October revenue line.

Alex: I can send you that today, it's basically done.

Maya: Perfect. Alex, can you pull the cap table summary together by Monday? Just a one-pager, nothing fancy.

Alex: Yep, I can do that.

Maya: Thanks. Then the model. Someone should update the financial model with the October numbers. I don't care who, it just can't be me this week.

Priya: Um, I'm not touching the model, I broke it last time.

Maya: Fair. We'll figure it out. The other thing, and this is a nice to have, the deck could really use some customer voice.

Priya: Like quotes?

Maya: Yeah. Priya, maybe you can grab a couple of customer quotes for the deck at some point?

Priya: I can try, I've got a few from the interviews in September.

Maya: Great, no rush on that.

Alex: Are we still talking to the fund in Austin? The one that wanted a board seat?

Maya: No. We're not doing that one, the terms were silly. Not a thing anymore.

Alex: Okay good, I was worried.

Priya: What about valuation, are we holding the same number?

Maya: Same number. I don't want to reopen it, honestly. If they push, they push.

Alex: Makes sense.

Maya: Oh, and the thing with the lawyer, we should probably sort that out at some point.

Priya: Which thing?

Maya: You know, the, um, the paperwork thing from the summer. Anyway.

Alex: Right.

Maya: Okay, that's it from me. Alex, how was your weekend, did you do the race?

Alex: I did. My knees are not speaking to me.

Maya: Ha. Okay, thanks everyone.$notes$,
   'paste', 'approved', now() - interval '5 days'),
  ('Ops standup', current_date - 4, '{Alex,Maya,Jordan}', $notes$ops standup thurs - alex notes

attendance: alex, maya, jordan (priya out, dentist)

payroll
- 2 new hires start nov 2, both full time
- alex - payroll for 2 new hires by fri
- maya asked if benefits enrolment is part of that, alex says yes same form, so one thing not two
- reminder that payroll runs on the 15th and the last working day, nothing changes there

tools / subscriptions
- we are paying for 4 tools nobody opens. design tool, old CRM, 2 analytics things
- jordan to audit the tool subscriptions and cancel the ones nobody uses, end of month
- maya said keep the analytics one jordan likes, the rest can go
- alex: also the domain renewal is auto, its fine, not a task

vendors
- hosting contract renews nov 15. if we dont act it rolls onto the new pricing which is ~30% more
- need someone to handle the hosting contract renewal by nov 13
- nobody grabbed it. maya will bring it up monday

equipment
- new hires need laptops
- maya to order laptops for the new hires asap
- jordan asked for a second monitor, maya said put it on the list, not urgent (not a task, she will just add it to the laptop order if theres budget)

billing
- couple of customers got charged twice last week
- the stripe thing - jordan? or alex? TBD who looks into it
- jordan thinks its a webhook retrying, alex thinks its the plan change flow. we didnt settle it

onboarding (came up at the end)
- jordan mentioned welcome calls are taking 45 min each, wants them down to 20
- jordan will script the welcome call next wk
- maya likes that, said keep it friendly not salesy

misc
- office plant is dead. RIP
- next ops standup next thurs same time$notes$,
   'paste', 'approved', now() - interval '4 days');

-- ---------------------------------------------------------------------------
-- Tasks. due = days from today (null = no date). Created on the day of their meeting.
-- ---------------------------------------------------------------------------
insert into public.tasks (title, workstream_id, meeting_id, owner_id, due_date, priority, status, blocker,
                          source_sentence, flags, created_at)
select t.title, w.id, mt.id, m.id, current_date + t.due, t.priority, t.status, t.blocker,
       t.src, t.flags::text[], mt.created_at
from (values
  -- Launch planning
  ('Write the launch announcement post',   'Product launch',      'Launch planning',  'Priya Shah',  -1,   'medium', 'done',        null, 'Priya to write the launch announcement post before launch week.', '{}'),
  ('Set up signup tracking on the website','Product launch',      'Launch planning',  'Jordan Lee',  -3,   'medium', 'done',        null, 'Jordan to set up signup tracking on the website this week.', '{}'),
  ('Make the launch social graphics',      'Product launch',      'Launch planning',  'Sam Okafor',   3,   'low',    'in_progress', null, 'Sam will make the launch social graphics.', '{}'),
  -- Fundraising sync (transcripts/02.md)
  ('Book the two partner calls',           'Fundraising',         'Fundraising sync', 'Maya Chen',   -3,   'high',   'done',        null, 'I''ll book the two partner calls by Friday.', '{}'),
  ('Send the investor update',             'Fundraising',         'Fundraising sync', 'Maya Chen',   -4,   'high',   'done',        null, 'I''ll get the investor update out tomorrow, it''s mostly written, I just need the October revenue line.', '{}'),
  ('Pull together the cap table summary',  'Fundraising',         'Fundraising sync', 'Alex Romero',  2,   'medium', 'in_progress', null, 'Alex, can you pull the cap table summary together by Monday?', '{}'),
  ('Update the financial model with October numbers','Fundraising','Fundraising sync', null,         null, 'medium', 'not_started', null, 'Someone should update the financial model with the October numbers.', '{no_owner,no_date}'),
  ('Gather customer quotes for the deck',  'Fundraising',         'Fundraising sync', 'Priya Shah',  null, 'low',    'done',        null, 'Priya, maybe you can grab a couple of customer quotes for the deck at some point?', '{no_date}'),
  -- Ops standup (transcripts/03.md)
  ('Set up payroll for the two new hires', 'Operations',          'Ops standup',      'Alex Romero', -3,   'high',   'done',        null, 'alex - payroll for 2 new hires by fri', '{}'),
  ('Audit and cancel unused tool subscriptions','Operations',     'Ops standup',      'Jordan Lee',  -2,   'low',    'done',        null, 'jordan to audit the tool subscriptions and cancel the ones nobody uses, end of month', '{}'),
  ('Order laptops for the new hires',      'Operations',          'Ops standup',      'Maya Chen',    1,   'high',   'blocked',     'laptops coming back in stock', 'maya to order laptops for the new hires asap', '{}'),
  ('Look into the double Stripe charges',  'Operations',          'Ops standup',      'Jordan Lee',   2,   'high',   'in_progress', null, 'the stripe thing - jordan? or alex? TBD who looks into it', '{}'),
  ('Script the welcome call',              'Customer onboarding', 'Ops standup',      'Jordan Lee',   6,   'low',    'not_started', null, 'jordan will script the welcome call next wk', '{}')
) as t(title, ws, meeting, owner, due, priority, status, blocker, src, flags)
join public.workstreams w   on w.name = t.ws
join public.meetings mt     on mt.title = t.meeting
left join public.team_members m on m.name = t.owner;

-- ---------------------------------------------------------------------------
-- Activity log: how each task got to where it is. hours = how long ago.
-- "Script the welcome call" has none on purpose (Customer onboarding: Update needed).
-- ---------------------------------------------------------------------------
insert into public.activity_log (task_id, actor_id, source, field, old_value, new_value, quote, created_at)
-- An owner change logs the new owner's id, as POST /api/tasks/[id]/assign does ('owner_id' stands for it here).
select t.id, coalesce(m.id, t.owner_id), a.source, a.field, a.old_v,
       case when a.field = 'owner' and a.new_v = 'owner_id' then t.owner_id::text else a.new_v end,
       a.quote, now() - (a.hours || ' hours')::interval
from (values
  ('Write the launch announcement post',   null,        'email', 'status',  'in_progress', 'done',        'Announcement post is done, scheduled for launch morning.', 30),
  ('Set up signup tracking on the website',null,        'app',   'status',  'in_progress', 'done',        null, 70),
  ('Make the launch social graphics',      null,        'email', 'status',  'not_started', 'in_progress', 'First drafts of the graphics are in the shared drive.', 6),
  ('Book the two partner calls',           null,        'email', 'status',  'in_progress', 'done',        'Both partner calls are booked for next week.', 72),
  ('Send the investor update',             null,        'email', 'status',  'in_progress', 'done',        'Investor update sent.', 90),
  ('Pull together the cap table summary',  null,        'email', 'status',  'not_started', 'in_progress', 'Started the cap table one-pager.', 20),
  ('Gather customer quotes for the deck',  null,        'email', 'status',  'not_started', 'done',        'Got three good quotes from the September interviews.', 28),
  ('Set up payroll for the two new hires', null,        'app',   'status',  'in_progress', 'done',        null, 50),
  ('Audit and cancel unused tool subscriptions', null,  'email', 'status',  'in_progress', 'done',        'Cancelled the old CRM and the design tool, kept the analytics one.', 26),
  ('Order laptops for the new hires',      null,        'email', 'status',  'in_progress', 'blocked',     'Laptops are out of stock until next week, I''ll order the moment they''re back.', 16),
  ('Order laptops for the new hires',      null,        'email', 'blocker', null,          'laptops coming back in stock', 'Laptops are out of stock until next week, I''ll order the moment they''re back.', 16),
  ('Look into the double Stripe charges',  'Maya Chen', 'app',   'owner',   null,          'owner_id',    null, 90),
  ('Look into the double Stripe charges',  null,        'app',   'status',  'not_started', 'in_progress', null, 10)
) as a(title, actor, source, field, old_v, new_v, quote, hours)
join public.tasks t on t.title = a.title
left join public.team_members m on m.name = a.actor;

-- Done tasks: completed when their last "done" update happened (the trigger only sets this on updates).
update public.tasks t
set completed_at = (select max(a.created_at) from public.activity_log a
                    where a.task_id = t.id and a.field = 'status' and a.new_value = 'done')
where t.status = 'done';
