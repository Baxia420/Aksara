import type { FocusInterval, FocusLog, StudySessionInput } from "./types";

export const TIMER_DURATIONS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};
export type StudyTimerState = {
  version: 1;
  sessionId: string | null;
  courseId: string | null;
  taskId: string | null;
  timerStyle: "pomodoro" | "stopwatch";
  type: FocusLog["type"];
  intervals: FocusInterval[];
  runningAt: number | null;
  pending: StudySessionInput | null;
};

export const emptyTimer = (): StudyTimerState => ({
  version: 1,
  sessionId: null,
  courseId: null,
  taskId: null,
  timerStyle: "pomodoro",
  type: "focus",
  intervals: [],
  runningAt: null,
  pending: null,
});

export function elapsedMilliseconds(
  state: StudyTimerState,
  now: number,
): number {
  return (
    state.intervals.reduce(
      (sum, interval) =>
        sum + Date.parse(interval.end) - Date.parse(interval.start),
      0,
    ) + (state.runningAt === null ? 0 : Math.max(0, now - state.runningAt))
  );
}

export function closeInterval(
  state: StudyTimerState,
  now: number,
  limitSeconds = 86400,
): FocusInterval[] {
  const intervals = [...state.intervals];
  if (state.runningAt !== null && now > state.runningAt)
    intervals.push({
      start: new Date(state.runningAt).toISOString(),
      end: new Date(now).toISOString(),
    });
  let remaining = limitSeconds * 1000;
  return intervals.flatMap((interval) => {
    const start = Date.parse(interval.start);
    const duration = Math.min(remaining, Date.parse(interval.end) - start);
    remaining -= duration;
    return duration > 0
      ? [
          {
            start: interval.start,
            end: new Date(start + duration).toISOString(),
          },
        ]
      : [];
  });
}

export function restoreTimer(raw: string | null): StudyTimerState | null {
  if (!raw || raw.length > 150000) return null;
  try {
    const value = JSON.parse(raw) as StudyTimerState;
    const uuid = /^[0-9a-f-]{36}$/i;
    if (
      value.version !== 1 ||
      !["pomodoro", "stopwatch"].includes(value.timerStyle) ||
      !["focus", "shortBreak", "longBreak"].includes(value.type) ||
      (value.sessionId !== null && !uuid.test(value.sessionId)) ||
      (value.courseId !== null && !uuid.test(value.courseId)) ||
      (value.taskId !== null && !uuid.test(value.taskId)) ||
      (value.runningAt !== null &&
        (!Number.isFinite(value.runningAt) ||
          value.runningAt < 0 ||
          value.runningAt > Date.now() + 300000)) ||
      !Array.isArray(value.intervals) ||
      value.intervals.length > 1000
    )
      return null;
    let previousEnd = 0;
    for (const interval of value.intervals) {
      const start = Date.parse(interval.start),
        end = Date.parse(interval.end);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < previousEnd ||
        end <= start
      )
        return null;
      previousEnd = end;
    }
    if (value.runningAt !== null && value.runningAt < previousEnd) return null;
    if (
      value.pending &&
      (value.pending.sessionId !== value.sessionId ||
        !Array.isArray(value.pending.intervals))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
