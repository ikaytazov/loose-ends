-- Loose Ends: initial schema (agreement A in docs/agreements.md)
-- Change the schema ONLY by adding a new migration file. Never edit this one after it has been applied.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  role        text not null default 'member' check (role in ('lead', 'member')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table public.workstreams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  goal         text,
  owner_id     uuid references public.team_members(id) on delete set null,
  target_date  date,
  created_at   timestamptz not null default now()
);

create table public.meetings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  meeting_date  date not null,
  attendees     text[] not null default '{}',
  raw_notes     text not null,
  source        text not null default 'paste' check (source in ('paste', 'email', 'webhook', 'mcp')),
  status        text not null default 'proposed' check (status in ('processing', 'proposed', 'approved', 'failed')),
  created_at    timestamptz not null default now()
);

create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  workstream_id    uuid references public.workstreams(id) on delete set null,
  meeting_id       uuid references public.meetings(id) on delete set null,
  owner_id         uuid references public.team_members(id) on delete set null,
  due_date         date,
  priority         text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status           text not null default 'proposed'
                   check (status in ('proposed', 'not_started', 'in_progress', 'blocked', 'done')),
  blocker          text,
  source_sentence  text,
  flags            text[] not null default '{}',   -- 'no_owner', 'no_date', 'unclear'
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.tasks (owner_id);
create index on public.tasks (workstream_id);

create table public.emails (
  id                    uuid primary key default gen_random_uuid(),
  direction             text not null check (direction in ('out', 'in')),
  member_id             uuid references public.team_members(id) on delete set null,
  kind                  text not null
                        check (kind in ('morning', 'confirmation', 'question', 'decision_notice', 'reply', 'other')),
  subject               text,
  body                  text,
  from_address          text,
  to_address            text,
  reply_code            text unique,          -- outgoing: code in the reply-to address (signalridgeco+le-<code>@gmail.com)
  task_refs             jsonb,                -- morning email: [{"n":1,"task_id":"..."}] so "2 is done" maps to a task
  in_reply_to_email_id  uuid references public.emails(id) on delete set null,
  gmail_message_id      text unique,          -- incoming: Gmail id, stops the same email being processed twice
  at                    timestamptz not null default now(),  -- sent or received time
  processed             boolean not null default false,
  processing_error      text
);
create index on public.emails (member_id, kind, at desc);

create table public.date_requests (
  id                  uuid primary key default gen_random_uuid(),
  task_id             uuid not null references public.tasks(id) on delete cascade,
  requested_by        uuid references public.team_members(id) on delete set null,
  current_due_date    date,
  requested_due_date  date not null,
  reason              text,
  approver_id         uuid references public.team_members(id) on delete set null,
  status              text not null default 'waiting' check (status in ('waiting', 'approved', 'declined')),
  source_email_id     uuid references public.emails(id) on delete set null,
  decided_at          timestamptz,
  created_at          timestamptz not null default now()
);
create index on public.date_requests (task_id);
create index on public.date_requests (approver_id, status);

create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.tasks(id) on delete cascade,
  actor_id    uuid references public.team_members(id) on delete set null,
  source      text not null check (source in ('app', 'email', 'reply_page', 'ai', 'system')),
  field       text not null,      -- 'status', 'blocker', 'due_date', 'owner', 'date_request', 'created', 'unclear', ...
  old_value   text,
  new_value   text,
  quote       text,               -- the words from the reply that caused the change
  email_id    uuid references public.emails(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.activity_log (task_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers: keep updated_at and completed_at right without anyone remembering
-- ---------------------------------------------------------------------------

create or replace function public.tasks_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger tasks_touch before update on public.tasks
for each row execute function public.tasks_touch();

-- ---------------------------------------------------------------------------
-- Views: worked out, never stored (docs/agreements.md)
-- ---------------------------------------------------------------------------

-- One row per task with the names and flags the screens need.
create view public.task_board with (security_invoker = true) as
select
  t.*,
  m.name                                         as owner_name,
  m.avatar_url                                   as owner_avatar_url,
  w.name                                         as workstream_name,
  (t.due_date < current_date and t.status not in ('done', 'proposed')) as is_overdue,
  coalesce(la.last_at, t.created_at)             as last_update_at,
  la.last_source                                 as last_update_source,
  la.last_quote                                  as last_update_quote,
  dr.id                                          as pending_date_request_id,
  dr.requested_due_date                          as pending_requested_due_date
from public.tasks t
left join public.team_members m on m.id = t.owner_id
left join public.workstreams w  on w.id = t.workstream_id
left join lateral (
  select a.created_at as last_at, a.source as last_source, a.quote as last_quote
  from public.activity_log a
  where a.task_id = t.id
  order by a.created_at desc
  limit 1
) la on true
left join lateral (
  select d.id, d.requested_due_date
  from public.date_requests d
  where d.task_id = t.id and d.status = 'waiting'
  order by d.created_at desc
  limit 1
) dr on true;

-- One row per workstream: progress and health label.
-- Health: blocked > decision_needed > update_needed (no update for 3 days) > on_track
create view public.workstream_overview with (security_invoker = true) as
with open_tasks as (
  select * from public.task_board where status not in ('proposed', 'done')
)
select
  w.id,
  w.name,
  w.goal,
  w.owner_id,
  m.name as owner_name,
  m.avatar_url as owner_avatar_url,
  w.target_date,
  (select count(*) from public.tasks t where t.workstream_id = w.id and t.status <> 'proposed')           as total_tasks,
  (select count(*) from public.tasks t where t.workstream_id = w.id and t.status = 'done')                as done_tasks,
  (select count(*) from public.tasks t where t.workstream_id = w.id and t.status = 'in_progress')         as in_progress_tasks,
  (select count(*) from public.tasks t where t.workstream_id = w.id and t.status = 'not_started')         as not_started_tasks,
  (select max(b.last_update_at) from public.task_board b where b.workstream_id = w.id and b.status <> 'proposed') as last_update_at,
  case
    when exists (select 1 from open_tasks o where o.workstream_id = w.id and o.status = 'blocked') then 'blocked'
    when exists (select 1 from open_tasks o where o.workstream_id = w.id
                 and (o.pending_date_request_id is not null or o.owner_id is null)) then 'decision_needed'
    when exists (select 1 from open_tasks o where o.workstream_id = w.id
                 and o.last_update_at < now() - interval '3 days') then 'update_needed'
    else 'on_track'
  end as health
from public.workstreams w
left join public.team_members m on m.id = w.owner_id;

-- Everything waiting for someone's decision: date requests and tasks with no owner.
create view public.decisions_needed with (security_invoker = true) as
select
  'date_change'::text         as kind,
  d.id                        as decision_id,
  t.id                        as task_id,
  t.title                     as task_title,
  t.workstream_id,
  w.name                      as workstream_name,
  d.approver_id,
  d.requested_by,
  rb.name                     as requested_by_name,
  d.current_due_date,
  d.requested_due_date,
  d.reason,
  d.created_at
from public.date_requests d
join public.tasks t on t.id = d.task_id
left join public.workstreams w on w.id = t.workstream_id
left join public.team_members rb on rb.id = d.requested_by
where d.status = 'waiting'
union all
select
  'assign_owner'::text,
  null::uuid,
  t.id,
  t.title,
  t.workstream_id,
  w.name,
  coalesce(w.owner_id, (select id from public.team_members where role = 'lead' order by created_at limit 1)),
  null::uuid,
  null::text,
  t.due_date,
  null::date,
  null::text,
  t.created_at
from public.tasks t
left join public.workstreams w on w.id = t.workstream_id
where t.owner_id is null and t.status not in ('proposed', 'done');

-- ---------------------------------------------------------------------------
-- Security: one demo workspace, no login (login is a Could-have).
-- The browser can READ (anon key). All WRITES go through our server routes,
-- which use the service-role key. Emails are not readable from the browser.
-- ---------------------------------------------------------------------------

alter table public.team_members  enable row level security;
alter table public.workstreams   enable row level security;
alter table public.meetings      enable row level security;
alter table public.tasks         enable row level security;
alter table public.emails        enable row level security;
alter table public.date_requests enable row level security;
alter table public.activity_log  enable row level security;

create policy "demo read" on public.team_members  for select to anon, authenticated using (true);
create policy "demo read" on public.workstreams   for select to anon, authenticated using (true);
create policy "demo read" on public.meetings      for select to anon, authenticated using (true);
create policy "demo read" on public.tasks         for select to anon, authenticated using (true);
create policy "demo read" on public.date_requests for select to anon, authenticated using (true);
create policy "demo read" on public.activity_log  for select to anon, authenticated using (true);

grant select on public.task_board, public.workstream_overview, public.decisions_needed to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Live updates: the board changes on screen without a refresh
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.tasks, public.date_requests, public.activity_log;
