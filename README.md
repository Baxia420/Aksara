# Aksara — Academic OS

A calm, private academic planning dashboard for tracking assignments, quizzes,
exams, courses, and focus sessions. Built with Next.js (App Router), React,
Tailwind CSS v4, and Supabase.

## Features

- **Dashboard** — greeting, progress wheel, weekly focus time, and a task
  completion velocity sparkline.
- **Calendar** — month view with per-day deadline markers and hover details.
- **Tasks** — filterable sprint board (pending / group / urgent / done) with
  inline complete and edit.
- **Courses** — explicit course list with per-course color theming.
- **Focus** — Pomodoro timer with per-task/per-course weekly time breakdown.
- **Semesters** — per-user terms; the dashboard scopes to the active term and
  finished semesters stay browsable from Settings.
- **Push reminders** — installable PWA with deadline notifications delivered
  through a cron-driven Web Push pipeline.

## Architecture notes

- Dashboard data is fetched **once on the server** in `app/dashboard/layout.tsx`
  via `lib/academic-data.ts` (`getDashboardData`, memoized with `React.cache`).
  The layout passes the promise down through `DashboardDataProvider`; the page
  reads it with the React `use` API. Because the layout stays mounted across the
  dashboard tabs, switching tabs never refetches. Mutations call
  `router.refresh()` to pull fresh server data.
- `app/dashboard/loading.tsx` provides the instant skeleton, and
  `app/dashboard/error.tsx` the error boundary.
- **Mutations are Next.js Server Actions**, organized by domain in
  `app/actions/` (`tasks.ts`, `courses.ts`, `semesters.ts`, `push.ts`,
  `account.ts`); `app/actions.ts` is a thin barrel re-exporting all of them.
  Expected failures are returned as `{ error: string }` values rather than
  thrown — Next.js redacts thrown action errors in production, so returning is
  the only way real messages reach the UI.
- Reusable dashboard UI lives in `components/dashboard/` (`TaskTable`,
  `CalendarWidget`, `ProfileMenu`, `MobileTopBar`, `MobileTaskCard`, `Brand`,
  `CoursePill`); `app/dashboard/page.tsx` orchestrates the views and owns the
  page-level state.
- Shared modules live in `lib/`: `types.ts` (domain types), `dateUtils.ts`
  (date/relative-time helpers), `courseTheme.ts` (the single source of truth for
  course colors), `semesters.ts` (active-term lookup), `push.ts` (Web Push
  client), `admin.ts` (admin check), and small hooks (`useIsDesktop`,
  `useEscapeKey`).
- Design tokens are defined in `app/globals.css` and exposed to Tailwind via
  `@theme` (e.g. `text-maroon`, `bg-gold`, `text-ink-muted`).
- Auth/session handling runs in `proxy.ts` (this Next version's middleware) using
  Supabase SSR cookies.

## Getting started

1. Copy `.env.example` to `.env.local` and fill in your Supabase project values
   and `ADMIN_EMAIL` (the account that owns shared/public courses and tasks).
2. Install and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side; used by the reminder cron) |
| `ADMIN_EMAIL` | Owner of shared/public courses and tasks |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID public key (exposed to the client) |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key (server-only) |
| `CRON_SECRET` | Shared secret protecting `/api/cron/send-reminders` |

> All of these must also be set in the hosting environment (e.g. Vercel) — a
> missing server-side variable fails at request time, not build time.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

## Database

Supabase (PostgreSQL) with Row Level Security. Tables: `tasks`, `courses`,
`semesters`, `user_task_completions`, `focus_logs`. Data mutations go through
the Next.js Server Actions in `app/actions/`.

Schema changes are plain SQL files in `supabase/migrations/`, run manually in
the Supabase SQL editor (there is no migration runner). Write them to be
idempotent, and write app code to degrade gracefully when a migration hasn't
run yet — deploys and migrations should be safe in either order.

## Reminders pipeline

`/api/cron/send-reminders` (protected by `CRON_SECRET`) is polled every 15
minutes by an external scheduler (cron-job.org). For each user it collects
pending tasks in the active semester, applies the user's lead-time preferences,
and delivers Web Push notifications to every subscribed device, pruning dead
subscriptions as it goes. Sent reminders are logged in user metadata so nothing
fires twice. The Vercel Hobby plan only allows daily built-in crons, which is
why scheduling lives outside Vercel.
