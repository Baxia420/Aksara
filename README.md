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

## Architecture notes

- Dashboard data is fetched **once on the server** in `app/dashboard/layout.tsx`
  via `lib/academic-data.ts` (`getDashboardData`, memoized with `React.cache`).
  The layout passes the promise down through `DashboardDataProvider`; the page
  reads it with the React `use` API. Because the layout stays mounted across the
  dashboard tabs, switching tabs never refetches. Mutations call
  `router.refresh()` to pull fresh server data.
- `app/dashboard/loading.tsx` provides the instant skeleton, and
  `app/dashboard/error.tsx` the error boundary.
- Shared modules live in `lib/`: `types.ts` (domain types), `dateUtils.ts`
  (date/relative-time helpers), `courseTheme.ts` (the single source of truth for
  course colors), and small hooks (`useIsDesktop`, `useEscapeKey`).
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
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side) |
| `ADMIN_EMAIL` | Owner of shared/public courses and tasks |

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

## Database

Supabase (PostgreSQL) with Row Level Security. Tables: `tasks`, `courses`,
`user_task_completions`, `focus_logs`. Data mutations go through Next.js Server
Actions in `app/actions.ts`.
