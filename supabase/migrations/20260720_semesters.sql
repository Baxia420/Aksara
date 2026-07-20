-- Per-user semesters: group courses/tasks into terms so a finished semester can
-- be archived (switched away from) without deleting anything.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is idempotent: safe to re-run.
--
-- The app is backwards-compatible with this migration: it behaves exactly as
-- before until the table exists, so run this before or after deploying.

-- 1) Semesters table, owned per-user.
create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.semesters enable row level security;

drop policy if exists "Users manage own semesters" on public.semesters;
create policy "Users manage own semesters"
  on public.semesters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Attach columns. No cascade: the app deletes a semester's contents
--    explicitly (preserving focus logs), and RESTRICT guards against
--    accidental mass deletes from any other path.
alter table public.tasks
  add column if not exists semester_id uuid references public.semesters (id);
alter table public.courses
  add column if not exists semester_id uuid references public.semesters (id);

create index if not exists tasks_semester_id_idx on public.tasks (semester_id);
create index if not exists courses_semester_id_idx on public.courses (semester_id);

-- 3) Backfill: every user that owns tasks or courses gets an active
--    "Semester 2, 2025/26" and their existing rows are assigned to it.
insert into public.semesters (user_id, name, is_active)
select u.user_id, 'Semester 2, 2025/26', true
from (
  select user_id from public.tasks
  union
  select user_id from public.courses
) u
where not exists (
  select 1 from public.semesters s where s.user_id = u.user_id
);

update public.tasks t
set semester_id = s.id
from public.semesters s
where s.user_id = t.user_id
  and s.is_active
  and t.semester_id is null;

update public.courses c
set semester_id = s.id
from public.semesters s
where s.user_id = c.user_id
  and s.is_active
  and c.semester_id is null;
