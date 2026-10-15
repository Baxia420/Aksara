-- Run once in the Supabase SQL editor before using course study.
-- Additive and safe to re-run; existing task sessions keep their attribution.
begin;

alter table public.focus_logs
  add column if not exists session_id uuid,
  -- Historical identifiers intentionally have no foreign keys: keep the original
  -- identity after deletion, so reusing a course code in a new term cannot merge time.
  add column if not exists course_id uuid,
  add column if not exists course_code text,
  add column if not exists course_title text,
  add column if not exists task_title text,
  add column if not exists started_at timestamptz,
  add column if not exists semester_id uuid,
  add column if not exists timer_style text not null default 'pomodoro',
  add column if not exists intervals jsonb not null default '[]'::jsonb;

create unique index if not exists focus_logs_user_session_idx on public.focus_logs(user_id, session_id);
create index if not exists focus_logs_user_created_idx on public.focus_logs(user_id, created_at);

update public.focus_logs f
set course_code = t.course_code, course_title = t.course_title,
    task_title = t.title, semester_id = t.semester_id
from public.tasks t
where f.task_id = t.id and f.course_code is null;

-- Resolve by code only when there is exactly one accessible course in that term.
update public.focus_logs f
set course_id = (
  select min(c.id::text)::uuid from public.courses c
  where c.code = f.course_code and (c.user_id = f.user_id or c.is_public)
    and c.semester_id is not distinct from f.semester_id
  having count(*) = 1
)
where f.course_id is null and f.course_code is not null;

-- Deleting a task must detach its logs rather than delete study history.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.focus_logs'::regclass
      and confrelid = 'public.tasks'::regclass and contype = 'f'
  loop
    execute format('alter table public.focus_logs drop constraint %I', constraint_name);
  end loop;
  alter table public.focus_logs add constraint focus_logs_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete set null;
end $$;

commit;
