-- TEMPORARY test data so screens and the email loop can be tried tonight (Fri 30 Oct).
-- Based on the mockups. Priya's address is Iliyan's, so he can reply as Priya.
-- To be replaced by the real seed (supabase/seed.sql, owner: "Seed data" in docs/team-tasks.md).
-- Dates are relative to the day it is loaded. Safe to re-run: it clears the tables first.

truncate public.activity_log, public.date_requests, public.emails, public.tasks, public.meetings, public.workstreams, public.team_members cascade;

insert into public.team_members (name, email, role) values
  ('Maya Chen',    'maya@example.com',     'lead'),
  ('Priya Shah',   'ikaytazov@gmail.com',  'member'),
  ('Jordan Lee',   'jordan@example.com',   'member'),
  ('Alex Romero',  'alex@example.com',     'member');

insert into public.workstreams (name, goal, owner_id, target_date)
select w.name, w.goal, m.id, current_date + w.days
from (values
  ('Product launch',      'Launch a clear pricing offer and a reliable onboarding journey.', 'Priya Shah',  7),
  ('Customer onboarding', 'Get new customers live in their first week.',                      'Jordan Lee', 14),
  ('Fundraising',         'Close the seed extension.',                                         'Maya Chen',  30),
  ('Operations',          'Keep vendors, payroll and tools running.',                          'Alex Romero', 21)
) as w(name, goal, owner, days)
join public.team_members m on m.name = w.owner;

insert into public.meetings (title, meeting_date, attendees, raw_notes, source, status)
values ('Weekly launch meeting', current_date - 4, '{Maya,Priya,Jordan,Alex}', '(test data)', 'paste', 'approved');

insert into public.tasks (title, workstream_id, meeting_id, owner_id, due_date, priority, status, blocker, source_sentence, created_at)
select t.title, w.id, (select id from public.meetings limit 1), m.id, current_date + t.due, t.priority, t.status, t.blocker, t.src, now() - (t.age || ' days')::interval
from (values
  ('Launch the new pricing page',        'Product launch',      'Priya Shah',  2, 'high',   'in_progress', null, 'Priya will get the new pricing page live by Tuesday.', 4),
  ('Finish the partner deck',            'Product launch',      'Priya Shah',  2, 'high',   'in_progress', null, 'Priya also owns the partner deck, same deadline.',    4),
  ('Run five customer interviews',       'Product launch',      'Jordan Lee',  4, 'medium', 'in_progress', null, 'Jordan to line up five customer interviews.',         4),
  ('Own the launch checklist',           'Product launch',      null,          5, 'medium', 'not_started', null, 'Someone needs to own the launch checklist.',          4),
  ('Draft the help center FAQ',          'Customer onboarding', 'Priya Shah',  6, 'medium', 'not_started', null, 'Priya can draft the FAQ once pricing is final.',      1),
  ('Write the onboarding email sequence','Customer onboarding', 'Jordan Lee',  5, 'high',   'in_progress', null, 'Jordan drafts the onboarding emails.',                4),
  ('Script the welcome call',            'Customer onboarding', 'Jordan Lee',  8, 'low',    'not_started', null, 'Jordan will script the welcome call.',                1),
  ('Send the investor update',           'Fundraising',         'Maya Chen',  -2, 'high',   'done',        null, 'Maya sends the investor update on Wednesday.',        4),
  ('Refresh the data room',              'Fundraising',         'Maya Chen',   3, 'high',   'in_progress', null, 'Maya refreshes the data room before the partner calls.', 4),
  ('Renew the vendor contract',          'Operations',          'Alex Romero', 1, 'medium', 'in_progress', null, 'Alex will sort out the vendor contract renewal.',     5),
  ('Set up payroll for new hires',       'Operations',          'Alex Romero', 6, 'medium', 'not_started', null, 'Alex sets up payroll for the two new hires.',         5)
) as t(title, ws, owner, due, priority, status, blocker, src, age)
join public.workstreams w on w.name = t.ws
left join public.team_members m on m.name = t.owner;

-- Recent updates, so "Latest update" shows something (Operations is left quiet on purpose: Update needed)
insert into public.activity_log (task_id, actor_id, source, field, old_value, new_value, quote, created_at)
select t.id, t.owner_id, a.source, a.field, a.old_v, a.new_v, a.quote, now() - (a.hours || ' hours')::interval
from (values
  ('Launch the new pricing page',        'email', 'status', 'not_started', 'in_progress', 'Started on the pricing page, copy is with design.', 20),
  ('Finish the partner deck',            'email', 'status', 'not_started', 'in_progress', 'Deck outline done.',                                 26),
  ('Run five customer interviews',       'app',   'status', 'not_started', 'in_progress', 'Three interviews booked.',                           30),
  ('Write the onboarding email sequence','email', 'status', 'not_started', 'in_progress', 'First two emails drafted.',                          10),
  ('Send the investor update',           'email', 'status', 'in_progress', 'done',        'Investor update sent.',                              40),
  ('Refresh the data room',              'app',   'status', 'not_started', 'in_progress', null,                                                 8)
) as a(title, source, field, old_v, new_v, quote, hours)
join public.tasks t on t.title = a.title;
