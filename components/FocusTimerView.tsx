"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "lucide-react";
import { loadFocusWeek } from "@/app/actions/focus";
import {
  addDays,
  courseForLog,
  formatStudyTime,
  secondsInRange,
  studySummary,
  weekStart,
} from "@/lib/study";
import { barColorForIndex, pillClassForIndex } from "@/lib/courseTheme";
import { TIMER_DURATIONS } from "@/lib/study-timer";
import type { StudyTimer } from "@/lib/useStudyTimer";
import type { AcademicCourse, AcademicTask, FocusLog } from "@/lib/types";

type Props = {
  tasks: AcademicTask[];
  courses: AcademicCourse[];
  focusLogs: FocusLog[];
  timer: StudyTimer;
};
const MODES = {
  focus: "Focus (25m)",
  shortBreak: "Short break (5m)",
  longBreak: "Long break (15m)",
};
const fieldClass =
  "mt-2 w-full min-w-0 rounded-2xl border border-line bg-surface-soft px-4 py-3 text-base text-ink outline-offset-4 disabled:opacity-60";
const EMPTY_LOGS: FocusLog[] = [];

export function FocusTimerView({ tasks, courses, focusLogs, timer }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [history, setHistory] = useState<{
    key: string;
    logs: FocusLog[];
  } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  const monday = useMemo(
    () => weekStart(today, weekOffset),
    [today, weekOffset],
  );
  const nextMonday = useMemo(() => addDays(monday, 7), [monday]);
  const weekKey = `${monday.toISOString()}/${nextMonday.toISOString()}`;
  useEffect(() => {
    if (weekOffset === 0) return;
    let cancelled = false;
    // A week change clears an earlier error while the new request is loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistoryError(null);
    const [start, end] = weekKey.split("/");
    void loadFocusWeek(start, end)
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) setHistoryError(result.error);
        else setHistory({ key: weekKey, logs: result.logs });
      })
      .catch(() => {
        if (!cancelled)
          setHistoryError("Could not load this week. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [weekOffset, weekKey, retry]);
  const weekLogs =
    weekOffset === 0
      ? focusLogs
      : history?.key === weekKey
        ? history.logs
        : EMPTY_LOGS;
  const weekError = weekOffset === 0 ? null : historyError;
  const loading = weekOffset !== 0 && history?.key !== weekKey && !weekError;
  const summary = useMemo(
    () => studySummary(weekLogs, tasks, courses, monday, nextMonday),
    [weekLogs, tasks, courses, monday, nextMonday],
  );
  const todaySummary = useMemo(() => {
    const startToday = new Date(today);
    startToday.setHours(0, 0, 0, 0);
    return studySummary(
      focusLogs,
      tasks,
      courses,
      startToday,
      addDays(startToday, 1),
    );
  }, [focusLogs, tasks, courses, today]);
  const selectedCourse = courses.find(
    (course) => course.id === timer.state.courseId,
  );
  const selectedTask = tasks.find((task) => task.id === timer.state.taskId);
  const availableTasks = tasks.filter(
    (task) => task.courseCode === selectedCourse?.code && !task.completed,
  );
  const recent = useMemo(
    () => focusLogs.filter((log) => log.type === "focus").slice(0, 5),
    [focusLogs],
  );
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(monday, index);
        const end = addDays(date, 1);
        const seconds = weekLogs.reduce(
          (sum, log) => sum + secondsInRange(log, date, end),
          0,
        );
        const byCourse = summary.courses.map((course) => ({
          ...course,
          seconds: weekLogs.reduce(
            (sum, log) =>
              sum +
              (courseForLog(log, tasks, courses).key === course.key
                ? secondsInRange(log, date, end)
                : 0),
            0,
          ),
        }));
        return { date, seconds, byCourse, future: date > today };
      }),
    [monday, weekLogs, summary.courses, tasks, courses, today],
  );
  const maxSeconds = Math.max(1, ...days.map((day) => day.seconds));
  const progress =
    timer.state.timerStyle === "pomodoro"
      ? Math.min(100, (timer.elapsed / TIMER_DURATIONS[timer.state.type]) * 100)
      : 0;
  const clock = `${Math.floor(timer.seconds / 60)
    .toString()
    .padStart(2, "0")}:${(timer.seconds % 60).toString().padStart(2, "0")}`;
  const contextTitle =
    selectedCourse?.title ||
    selectedTask?.courseTitle ||
    (timer.state.courseId ? "Previous course" : "General focus");
  const locked = !timer.ready || timer.active;

  return (
    <div className="mx-auto grid max-w-[100rem] min-w-0 grid-cols-1 gap-7 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-7 lg:col-span-8">
        <article className="aksara-card min-w-0 rounded-[2rem] p-5 md:p-10">
          <div className="mb-7 hidden items-start justify-between gap-3 md:flex">
            <div>
              <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                Course study
              </p>
              <h1 className="aksara-serif mt-2 text-[2.8rem] leading-none text-ink md:text-[3.5rem]">
                Time to focus.
              </h1>
            </div>
            <BookOpen
              className="mt-2 size-5 shrink-0 text-maroon-soft"
              aria-hidden="true"
            />
          </div>
          <label
            className="block text-sm font-semibold text-ink-muted"
            htmlFor="study-course"
          >
            What are you studying?
          </label>
          <select
            id="study-course"
            className={fieldClass}
            value={timer.state.courseId || ""}
            disabled={locked}
            onChange={(event) => timer.selectCourse(event.target.value || null)}
          >
            <option value="">General focus</option>
            {timer.state.courseId && !selectedCourse && (
              <option value={timer.state.courseId}>Previous course</option>
            )}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.title}
              </option>
            ))}
          </select>
          {(selectedCourse || selectedTask) && (
            <details
              className="mt-3"
              key={timer.state.courseId}
              open={timer.state.taskId ? true : undefined}
            >
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-maroon">
                {timer.state.taskId ? "Linked task" : "Link a task · optional"}
              </summary>
              <label
                htmlFor="study-task"
                className="text-sm font-semibold text-ink-muted"
              >
                Task{" "}
                <span className="font-normal text-ink-soft">· optional</span>
              </label>
              <select
                id="study-task"
                className={fieldClass}
                disabled={locked}
                value={timer.state.taskId || ""}
                onChange={(event) =>
                  timer.selectTask(event.target.value || null)
                }
              >
                <option value="">Just studying the course</option>
                {timer.state.taskId &&
                  !availableTasks.some(
                    (task) => task.id === timer.state.taskId,
                  ) && (
                    <option value={timer.state.taskId}>
                      {selectedTask?.title || "Previous task"}
                    </option>
                  )}
                {availableTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              {timer.state.taskId && (
                <p className="mt-2 text-xs text-ink-soft">
                  This time is included in your course total.
                </p>
              )}
            </details>
          )}
          {!courses.length && (
            <p className="mt-3 text-sm text-ink-muted">
              Add a course in Courses to track its study time. General focus is
              available now.
            </p>
          )}
          <div
            className="mt-4 flex justify-center gap-2 md:mt-7"
            aria-label="Timer style"
          >
            {(["pomodoro", "stopwatch"] as const).map((style) => (
              <button
                key={style}
                type="button"
                disabled={locked}
                aria-pressed={timer.state.timerStyle === style}
                onClick={() => timer.configure(style, "focus")}
                className={`aksara-chip min-h-11 px-4 py-2 text-sm font-semibold disabled:opacity-60 ${timer.state.timerStyle === style ? "aksara-chip-active" : ""}`}
              >
                {style === "pomodoro" ? "Pomodoro" : "Stopwatch"}
              </button>
            ))}
          </div>
          {timer.state.timerStyle === "pomodoro" && (
            <div
              className="mx-auto mt-3 grid max-w-md grid-cols-3 gap-1 rounded-2xl border border-line bg-surface-soft p-1.5 md:mt-4"
              aria-label="Pomodoro interval"
            >
              {(Object.keys(MODES) as Array<keyof typeof MODES>).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  disabled={locked}
                  aria-pressed={timer.state.type === mode}
                  aria-label={MODES[mode]}
                  onClick={() => timer.configure("pomodoro", mode)}
                  className={`min-h-11 min-w-0 rounded-xl px-2 py-2 text-xs! font-semibold disabled:opacity-60 ${timer.state.type === mode ? "bg-surface text-maroon shadow-sm" : "text-ink-muted"}`}
                >
                  <span className="block whitespace-nowrap">
                    {mode === "focus"
                      ? "Focus"
                      : mode === "shortBreak"
                        ? "Short"
                        : "Long"}
                    <span className="hidden md:inline">
                      {mode !== "focus" ? " break" : ""}
                    </span>
                  </span>
                  <span className="block font-normal">
                    {TIMER_DURATIONS[mode] / 60}m
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="relative mx-auto my-4 flex size-44 items-center justify-center md:my-7 md:size-64">
            <svg
              className="absolute inset-0 size-full -rotate-90"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="var(--line)"
                strokeWidth="2.5"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="var(--maroon)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (progress / 100)}
              />
            </svg>
            <div className="max-w-full px-5 text-center">
              <p className="aksara-mono text-[0.6rem] text-maroon-soft">
                {timer.state.pending
                  ? "Ready to save"
                  : timer.running
                    ? "In progress"
                    : timer.active
                      ? "Paused"
                      : timer.state.type === "focus"
                        ? "Focus session"
                        : "Take a break"}
              </p>
              <p
                role="timer"
                aria-label="Study timer"
                className="aksara-serif mt-1 text-[3.3rem] font-semibold leading-none tabular-nums text-ink md:text-[4.4rem]"
              >
                {timer.ready ? clock : "—:—"}
              </p>
            </div>
          </div>
          <div className="mb-5 hidden text-center md:block">
            <p className="break-words text-base font-semibold text-ink">
              {contextTitle}
            </p>
            {selectedTask && (
              <p className="mt-1 break-words text-sm text-ink-muted">
                {selectedTask.title}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {timer.state.pending ? (
              <button
                type="button"
                onClick={() => void timer.finish()}
                disabled={timer.saving}
                className="aksara-primary-button min-h-12 rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {timer.saving ? "Saving…" : "Retry save"}
              </button>
            ) : (
              <button
                type="button"
                onClick={timer.toggle}
                disabled={!timer.ready || timer.saving}
                className="aksara-primary-button flex min-h-12 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {timer.running ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {timer.running
                  ? "Pause"
                  : timer.active
                    ? "Resume"
                    : "Start studying"}
              </button>
            )}
            {timer.active && !timer.state.pending && (
              <button
                type="button"
                onClick={() => void timer.finish()}
                className="aksara-chip min-h-12 px-5 py-3 text-sm font-semibold"
              >
                End & save
              </button>
            )}
            {timer.active && (
              <button
                type="button"
                aria-label="Discard session"
                disabled={timer.saving}
                onClick={() => setConfirmDiscard(true)}
                className="aksara-icon-button size-12 disabled:opacity-60"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
          </div>
          {confirmDiscard && (
            <div
              className="mt-4 rounded-2xl border border-line bg-surface-soft p-4"
              role="group"
              aria-label="Discard session confirmation"
            >
              <p className="text-sm text-ink-body">
                Discard this session without saving its time?
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={timer.saving}
                  onClick={() => {
                    timer.discard();
                    setConfirmDiscard(false);
                  }}
                  className="aksara-chip min-h-11 px-4 py-2 text-sm"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="min-h-11 px-3 text-sm text-maroon"
                >
                  Keep studying
                </button>
              </div>
            </div>
          )}
          {timer.error && (
            <p
              role="alert"
              className="mt-4 text-center text-sm text-maroon-bright"
            >
              {timer.error}
            </p>
          )}
          {timer.notice && (
            <p
              role="status"
              className="mt-4 text-center text-sm text-ink-muted"
            >
              {timer.notice}
            </p>
          )}
          {timer.storageWarning && (
            <p role="alert" className="mt-3 text-sm text-ink-muted">
              Device storage is unavailable. Keep this page open until your
              session is saved.
            </p>
          )}
        </article>

        <article className="aksara-card min-w-0 rounded-[2rem] p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="aksara-mono text-[0.6rem] text-maroon-soft">
                Your week
              </p>
              <h2 className="aksara-serif mt-2 text-[2.3rem] leading-none text-ink">
                Study time
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous study week"
                className="aksara-icon-button size-11"
                onClick={() => setWeekOffset((offset) => offset - 1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="aksara-chip min-h-11 px-3 text-xs font-semibold"
                disabled={weekOffset === 0}
                onClick={() => setWeekOffset(0)}
              >
                This week
              </button>
              <button
                type="button"
                aria-label="Next study week"
                disabled={weekOffset === 0}
                className="aksara-icon-button size-11 disabled:opacity-40"
                onClick={() =>
                  setWeekOffset((offset) => Math.min(0, offset + 1))
                }
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            {monday.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            –{" "}
            {addDays(monday, 6).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          {loading ? (
            <p role="status" className="py-10 text-sm text-ink-muted">
              Loading study history…
            </p>
          ) : weekError ? (
            <div role="alert" className="py-8 text-sm text-ink-muted">
              {weekError}
              <button
                type="button"
                className="ml-2 min-h-11 text-maroon"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="aksara-serif text-[2.7rem] leading-none text-maroon">
                  {formatStudyTime(summary.totalSeconds)}
                </p>
                <p className="text-sm text-ink-soft">
                  {summary.sessions} session{summary.sessions === 1 ? "" : "s"}{" "}
                  · breaks excluded
                </p>
              </div>
              <div
                className="mt-7 grid grid-cols-7 gap-2"
                aria-label="Daily study time"
              >
                {days.map((day) => (
                  <div
                    key={day.date.toISOString()}
                    className="min-w-0 text-center"
                  >
                    <p className="min-h-9 text-[11px] leading-4 text-ink-muted">
                      {day.future ? "—" : formatStudyTime(day.seconds)}
                    </p>
                    <div
                      className="flex h-32 items-end justify-center border-b border-line"
                      role="img"
                      aria-label={`${day.date.toLocaleDateString("en-GB", { weekday: "long" })}: ${day.future ? "upcoming" : formatStudyTime(day.seconds)}`}
                    >
                      <div className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-t-md">
                        {day.byCourse
                          .filter((course) => course.seconds > 0)
                          .map((course) => (
                            <div
                              key={course.key}
                              className={barColorForIndex(course.colorIndex)}
                              style={{
                                height: `${(course.seconds / maxSeconds) * 120}px`,
                              }}
                              title={`${course.title}: ${formatStudyTime(course.seconds)}`}
                            />
                          ))}
                      </div>
                    </div>
                    <p
                      className={`mt-2 text-xs ${day.date.toDateString() === today.toDateString() ? "font-semibold text-maroon" : "text-ink-soft"}`}
                    >
                      {day.date.toLocaleDateString("en-GB", {
                        weekday: "short",
                      })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-5">
                {summary.courses.map((course) => (
                  <div key={course.key}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-block max-w-full break-words rounded-lg px-2 py-1 text-xs font-semibold ${pillClassForIndex(course.colorIndex)}`}
                        >
                          {course.code || "General"}
                        </span>
                        <p className="mt-1 break-words text-sm font-semibold text-ink">
                          {course.title}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-maroon">
                        {formatStudyTime(course.seconds)}
                      </span>
                    </div>
                    {course.taskSeconds.size > 0 && (
                      <details className="mt-2">
                        <summary className="min-h-8 text-xs text-ink-muted">
                          Study and task time
                        </summary>
                        {course.directSeconds > 0 && (
                          <div className="mt-2 flex justify-between gap-4 text-xs text-ink-muted">
                            <span>Course study</span>
                            <span className="shrink-0">
                              {formatStudyTime(course.directSeconds)}
                            </span>
                          </div>
                        )}
                        {[...course.taskSeconds].map(([id, task]) => (
                          <div
                            key={id}
                            className="mt-2 flex justify-between gap-4 text-xs text-ink-muted"
                          >
                            <span className="min-w-0 break-words">
                              {task.title}
                            </span>
                            <span className="shrink-0">
                              {formatStudyTime(task.seconds)}
                            </span>
                          </div>
                        ))}
                      </details>
                    )}
                  </div>
                ))}
                {!summary.sessions && (
                  <p className="text-sm text-ink-muted">
                    No study time recorded this week.
                  </p>
                )}
              </div>
            </>
          )}
        </article>
      </div>

      <aside className="flex min-w-0 flex-col gap-7 lg:col-span-4">
        <article className="aksara-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Today’s focus</h2>
            <Clock className="size-4 text-maroon-soft" aria-hidden="true" />
          </div>
          <p className="aksara-serif mt-5 text-[2.8rem] leading-none text-maroon">
            {formatStudyTime(todaySummary.totalSeconds)}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {todaySummary.sessions} session
            {todaySummary.sessions === 1 ? "" : "s"} completed
          </p>
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            {todaySummary.courses.map((course) => (
              <div
                key={course.key}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="min-w-0 break-words text-ink-muted">
                  {course.title}
                </span>
                <span className="shrink-0 tabular-nums text-ink">
                  {formatStudyTime(course.seconds)}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="aksara-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Recent study</h2>
            <Timer className="size-4 text-maroon-soft" aria-hidden="true" />
          </div>
          <div className="mt-3 divide-y divide-line">
            {recent.map((log) => {
              const course = courseForLog(log, tasks, courses);
              return (
                <div key={log.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-semibold text-ink">
                      {course.title}
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-maroon">
                      {formatStudyTime(log.duration)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs text-ink-muted">
                    {course.taskTitle || "Course study"}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {new Date(log.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    ·{" "}
                    {log.timerStyle === "stopwatch" ? "Stopwatch" : "Pomodoro"}
                  </p>
                </div>
              );
            })}
            {!recent.length && (
              <p className="py-4 text-sm text-ink-muted">
                Your saved study sessions will appear here.
              </p>
            )}
          </div>
        </article>
      </aside>
    </div>
  );
}
