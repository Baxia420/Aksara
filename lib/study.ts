import type { AcademicCourse, AcademicTask, FocusLog } from "./types";

export function weekStart(date: Date, offset = 0): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function addDays(date: Date, count: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

export function formatStudyTime(seconds: number): string {
  if (seconds === 0) return "0m";
  if (seconds < 60) return "< 1m";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours
    ? `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
    : `${minutes}m`;
}

/** Active intervals keep pauses out of totals and split midnight/week boundaries. */
export function secondsInRange(log: FocusLog, start: Date, end: Date): number {
  if (log.type !== "focus") return 0;
  if (log.intervals?.length) {
    const milliseconds = log.intervals.reduce(
      (sum, interval) =>
        sum +
        Math.max(
          0,
          Math.min(Date.parse(interval.end), end.getTime()) -
            Math.max(Date.parse(interval.start), start.getTime()),
        ),
      0,
    );
    return Math.min(log.duration, Math.floor(milliseconds / 1000));
  }
  // Existing sessions only have their completion timestamp.
  const timestamp = Date.parse(log.createdAt);
  return timestamp >= start.getTime() && timestamp < end.getTime()
    ? log.duration
    : 0;
}

export function courseForLog(
  log: FocusLog,
  tasks: AcademicTask[],
  courses: AcademicCourse[],
) {
  const task = tasks.find((task) => task.id === log.taskId);
  const course = courses.find((course) =>
    log.courseId
      ? course.id === log.courseId
      : course.code === (log.courseCode || task?.courseCode) &&
        (!log.semesterId || course.semesterId === log.semesterId),
  );
  return {
    key:
      log.courseId ||
      course?.id ||
      log.courseCode ||
      task?.courseCode ||
      "__general__",
    code: log.courseCode || course?.code || task?.courseCode || "",
    title:
      log.courseTitle || course?.title || task?.courseTitle || "General focus",
    colorIndex: course?.colorIndex ?? 0,
    taskTitle:
      log.taskTitle || task?.title || (log.taskId ? "Previous task" : null),
  };
}

export function studySummary(
  logs: FocusLog[],
  tasks: AcademicTask[],
  courses: AcademicCourse[],
  start: Date,
  end: Date,
) {
  const groups = new Map<
    string,
    {
      key: string;
      code: string;
      title: string;
      colorIndex: number;
      seconds: number;
      sessions: number;
      directSeconds: number;
      taskSeconds: Map<string, { title: string; seconds: number }>;
    }
  >();
  let totalSeconds = 0;
  let sessions = 0;
  const seen = new Set<string>();
  for (const log of logs) {
    const key = log.sessionId || log.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const seconds = secondsInRange(log, start, end);
    if (!seconds) continue;
    const course = courseForLog(log, tasks, courses);
    const group = groups.get(course.key) || {
      ...course,
      seconds: 0,
      sessions: 0,
      directSeconds: 0,
      taskSeconds: new Map(),
    };
    group.seconds += seconds;
    group.sessions++;
    if (course.taskTitle) {
      const taskKey = log.taskId || course.taskTitle;
      const previous = group.taskSeconds.get(taskKey);
      group.taskSeconds.set(taskKey, {
        title: course.taskTitle,
        seconds: seconds + (previous?.seconds || 0),
      });
    } else group.directSeconds += seconds;
    groups.set(course.key, group);
    totalSeconds += seconds;
    sessions++;
  }
  return {
    totalSeconds,
    sessions,
    courses: [...groups.values()].sort((a, b) => b.seconds - a.seconds),
  };
}

export function mapFocusLog(row: Record<string, unknown>): FocusLog {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    taskId: row.task_id as string | null,
    duration: row.duration as number,
    type: row.type as FocusLog["type"],
    createdAt: row.created_at as string,
    sessionId: row.session_id as string | null,
    courseId: row.course_id as string | null,
    courseCode: row.course_code as string | null,
    courseTitle: row.course_title as string | null,
    taskTitle: row.task_title as string | null,
    semesterId: row.semester_id as string | null,
    timerStyle: row.timer_style === "stopwatch" ? "stopwatch" : "pomodoro",
    intervals: Array.isArray(row.intervals) ? row.intervals : [],
  };
}
