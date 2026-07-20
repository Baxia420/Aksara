# Aksara — Roadmap & Deferred Work

Living doc for larger features intentionally not built yet. Small in-flight
fixes live in git history, not here.

---

## Per-user semesters

**Status: core slice shipped (July 2026) — multi-user extras deferred.**

Tasks and courses group into per-user semesters so a finished term can be
switched away from (and revisited later) instead of cluttering the dashboard.

Shipped:

- **Schema** — `semesters` table (RLS'd, per-user), `semester_id` on `courses`
  and `tasks`, backfill of pre-existing rows into an initial active term.
  Migration: `supabase/migrations/20260720_semesters.sql`, run manually in the
  Supabase SQL editor (idempotent). Focus logs stay attached via `task_id`.
- **Settings → Semesters** — create (becomes active), switch, delete. Deleting
  a term removes its tasks/courses and completions but detaches focus logs so
  timer history survives.
- **Scoping** — dashboard data and the reminder cron only consider the active
  semester; new tasks/courses attach to it automatically. The app degrades
  gracefully if the migration hasn't run (legacy unscoped mode).

Deferred until there is real multi-user demand:

- **Retire the admin/shared-syllabus model** — remove `ADMIN_EMAIL` /
  `lib/admin.ts` / all `is_public` branches, making every account fully
  self-contained.
- **Signup onboarding** — first-run wizard: name your semester, add courses,
  land on a ready dashboard.

## Other follow-ups

- **Dashboard component split** — `app/dashboard/page.tsx` (~2000 lines) still
  duplicates the task table across the Home and Tasks views; extract shared
  view components.
- **`ADMIN_EMAIL` env var** — set in Vercel, then drop the source fallback in
  `lib/admin.ts`. (Moot once the admin model is retired.)
- **Login backdrop weight** — `public/login-bg-*.png` are ~1.8 MB each;
  compress for faster first paint.
- **Data cleanup** — remove the stray duplicated "FINAL" task (SCSE1203) left
  over from testing.
