# Aksara — Deferred Work & Roadmap

Living doc for larger features intentionally not built yet. Small in-flight fixes
live in git history / commit messages, not here.

---

## Per-user semesters (the big one)

**Status: DEFERRED — single user today.** Aksara currently has exactly one real
user (the owner). Rebuilding the whole data model for multi-user semesters now
would be effort spent on capacity nobody uses yet. This is a passion project and
may never grow past one user — so we keep the plan on record and revisit **only
if the user base actually grows.**

**Decision already made (2026-07-18):** if/when we build this, go **fully
per-user** and **remove the admin/shared model entirely** (`ADMIN_EMAIL`,
`isAdmin`, `lib/admin.ts`, all `is_public` task/course logic). Every user owns
their own courses and tasks, grouped into semesters they create. New users are
prompted on signup to create their first semester and add their courses. This
supersedes the shared-syllabus / read-only-shared-tasks work shipped earlier the
same day — that was correct for the old model and would be torn out here.

### Phases

- **Phase 1 — Database migration** *(deferred; blocks Phase 3)*
  New per-user `semesters` table; `semester_id` FK on `courses` and `tasks`;
  `focus_logs` inherit semester via `task_id`. RLS: each user only touches their
  own rows. Migrate existing data by wrapping the current courses/tasks into an
  initial "Semester 2, 2025/26" so nothing (incl. focus history) is lost. Runs
  as SQL in the Supabase SQL editor (no migrations folder; service-role key
  can't run DDL via PostgREST). Irreversible on prod — take a backup first.

- **Phase 2 — Remove the admin/shared model** *(deferred)*
  Delete `ADMIN_EMAIL` / `isAdmin` / `lib/admin.ts`; drop all `is_public`
  branches; change the dashboard query from "my tasks + shared" to just "my
  tasks."

- **Phase 3 — Semester management in Settings** *(WANTED near-term — but needs
  Phase 1 schema first)*
  Create / rename / switch / delete semesters. Switching sets the active term;
  the dashboard shows only that term's tasks. Delete = hard delete of the term's
  tasks/courses/focus history, behind a strong confirm (user explicitly wants
  delete, not archive). This is the piece with real near-term value: it's how we
  deal with a finished semester instead of leaving old tasks cluttering the view.

- **Phase 4 — New-user onboarding** *(deferred)*
  After signup / first load with no semester: a wizard — name your semester →
  add your courses → land on a ready, empty dashboard.

- **Phase 5 — Wire the rest** *(WANTED, with Phase 3)*
  New tasks/courses attach to the active semester; the reminder cron switches to
  per-user active-semester tasks (drop the `is_public` union).

### Dependency note
Phase 3 (the valuable near-term bit) can't ship without at least a minimal
Phase 1 (the `semesters` table + `semester_id` columns). So the smallest useful
slice is **1 → 3 → 5**, leaving 2 and 4 until multi-user actually matters.

---

## Other known follow-ups

- **Dashboard code split** — `app/dashboard/page.tsx` (~1900 lines) still has
  `TaskTable` duplicated across the Home and Tasks views; extract shared view
  components. (Carried over from the overhaul.)
- **Set `ADMIN_EMAIL` in Vercel** — currently relies on a hardcoded fallback in
  `lib/admin.ts`; set the env var, then drop the fallback. (Moot once Phase 2
  removes the admin model.)
- **Login image polish** — the `login-bg-*.png` backdrops are ~1.8 MB each;
  compress, and confirm text legibility over both photos.
- **Stray forked "FINAL" task** — a duplicate personal copy of SCSE1203's FINAL
  created during admin-access testing; delete the stray row.
