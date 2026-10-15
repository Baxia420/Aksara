# Course study

Choose a course in Focus or press Study on its card. Tasks are optional and the
task picker only lists that course's pending tasks. General focus remains
available without a course. There are no topics or topic fields.

Pomodoro uses the existing 25/5/15 minute intervals. Stopwatch counts upward and
ends when the student chooses End & save (with a 24-hour active-time limit per
session). Ending either mode early saves actual elapsed time. Pause time and
breaks are excluded from study totals. A completed Pomodoro stops at its planned
duration even if its tab was backgrounded or the device slept.

The timer belongs to the dashboard rather than the visible Focus screen, so tab
navigation and mobile/desktop layout changes do not reset it. The current session
is stored per account on the device and restored after reload. A failed save
remains available for Retry save, using the same session ID to prevent duplicates.
Discarding an active or unsaved session requires an explicit confirmation.

Course cards show the current calendar week, Monday through Sunday, in the
student's browser timezone. Weekly review shows total focused time, daily course
allocation, and each course's combined total, with optional task detail. Earlier
weeks load on demand, including those older than the initial 90-day dashboard
window. Active intervals crossing midnight or a week boundary are split between
the relevant dates. Historical records without intervals use their completion
timestamp. Records whose original task was already deleted cannot have their old
course inferred; they remain General focus.

## Release

Apply `supabase/migrations/20261015_course_study.sql` in the Supabase SQL editor
after the semesters migration. This is an additive, transactional migration that
can be re-run. Existing sessions are backfilled using their still-available task
and course. New sessions keep course/task name snapshots for historical review;
the task reference is detached on deletion, preserving time. Course and semester
identifiers remain historical snapshots so reusing a course code cannot merge
time from a deleted course into a new one. All reads and writes stay
scoped to the authenticated student's logs.

Deploying the app before the migration does not report successful saves: the
session stays on the device with a database-update message until it can be retried.

## Checks

`npm test` covers direct/course/task accounting, legacy logs, duplicate retries,
break exclusion, deleted references, term boundaries, week splits, pause timing,
backgrounded countdowns, storage recovery, and malformed session requests.

The UI was checked using the existing dashboard with isolated fixture data; no
production records or authentication settings were changed. The original palette,
fonts, rounded cards, sidebar and mobile navigation are retained. Screenshots in
`screenshots/` document the original Focus view and the course-study version.

| Screen | Light | Dark |
| --- | --- | --- |
| Original Focus | [Desktop](screenshots/before-focus-light.jpg) | — |
| Course Focus | [Desktop](screenshots/focus-desktop-light.jpg) | [Desktop](screenshots/focus-desktop-dark.jpg) |
| Mobile Focus | [Mobile](screenshots/focus-mobile-light.jpg) | [Mobile](screenshots/focus-mobile-dark.jpg) |
| Weekly course cards | — | [Mobile](screenshots/courses-mobile-dark.jpg) |

Browser checks covered 1440, 1024, 768, 390 and 320px widths in both themes,
course shortcuts, task filtering, navigation/reload recovery, early completion,
pause/resume, automatic Pomodoro completion, break exclusion, failed-save retry,
and recovery from an earlier-week loading error. These used fixture data and a
test save adapter, not production database writes.

The migration was also executed twice against an isolated PostgreSQL runtime;
legacy backfill, task/course deletion survival and retry uniqueness were checked.
The production webpack build and TypeScript check passed. The default Turbopack
build could not run in the isolated copy because its dependencies are symlinked
outside that copy's filesystem root. Full-repository ESLint still reports five
pre-existing errors in AddTaskModal, InstallPrompt, ManageCoursesModal,
NotificationToggle and ThemeToggle; all files changed for course study pass.
