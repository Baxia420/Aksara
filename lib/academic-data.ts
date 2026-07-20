import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type {
  AcademicCourse,
  AcademicTask,
  DashboardData,
  FocusLog,
  ReminderPreferences,
  Semester,
  UserProfile,
} from "@/lib/types";
import { DEFAULT_REMINDER_PREFERENCES } from "@/lib/types";

/**
 * Fetches everything the dashboard needs (profile, tasks, courses, focus logs)
 * in one place. Wrapped in React.cache so it is memoized per-request — a Server
 * Component and a passed-down promise both resolve to the same result without a
 * duplicate round-trip.
 *
 * Returns null when there is no authenticated user (the middleware already
 * redirects unauthenticated visitors away from /dashboard).
 */
export const getDashboardData = cache(async (): Promise<DashboardData | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [tasksRes, coursesRes, completionsRes, semestersRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order("due_date", { ascending: true }),
    supabase
      .from("courses")
      .select("*")
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order("code", { ascending: true }),
    supabase
      .from("user_task_completions")
      .select("task_id, completed_at")
      .eq("user_id", user.id),
    // Tolerated failure: before the semesters migration has run this table
    // doesn't exist — treat that as "no semesters" (legacy mode) not an error.
    supabase
      .from("semesters")
      .select("id, name, is_active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (coursesRes.error) throw coursesRes.error;
  if (completionsRes.error) throw completionsRes.error;

  const semesters: Semester[] = (semestersRes.error ? [] : semestersRes.data ?? []).map(
    (s) => ({
      id: s.id,
      name: s.name,
      isActive: Boolean(s.is_active),
      createdAt: s.created_at,
    }),
  );
  const activeSemesterId =
    semesters.find((s) => s.isActive)?.id ?? semesters.at(-1)?.id ?? null;

  const completions = completionsRes.data ?? [];
  const completedTaskIds = new Set(completions.map((c) => c.task_id));
  const completionMap = new Map<string, string>(
    completions.map((c) => [c.task_id, c.completed_at]),
  );

  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  // Scope to the active semester. Rows without a semester (legacy mode, or
  // created before the migration backfill) always stay visible.
  const inActiveSemester = (row: { semester_id?: string | null }) =>
    !activeSemesterId || !row.semester_id || row.semester_id === activeSemesterId;

  const tasks: AcademicTask[] = (tasksRes.data ?? [])
    .filter(inActiveSemester)
    .filter((task) => {
      if (!task.due_date) {
        console.error(`Task ${task.id} has no due_date; excluding from dashboard.`);
        return false;
      }
      return true;
    })
    .map((task) => {
      const [year, month, day] = task.due_date.split("-").map(Number);
      const dueUtc = Date.UTC(year, month - 1, day);
      const daysRemaining = Math.round((dueUtc - todayUtc) / 86_400_000);

      let dueTime = "";
      if (task.due_time) {
        const [hours, minutes] = task.due_time.split(":");
        const hr = parseInt(hours, 10);
        const period = hr >= 12 ? "PM" : "AM";
        const hr12 = hr % 12 || 12;
        dueTime = `${hr12}:${minutes} ${period}`;
      }

      const isCompleted =
        completedTaskIds.has(task.id) || (task.completed && task.user_id === user.id);
      const completedAt =
        completionMap.get(task.id) ||
        (task.completed && task.user_id === user.id ? task.completed_at : null);

      return {
        id: task.id,
        completed: isCompleted,
        courseCode: task.course_code,
        courseDisplay: task.course_title
          ? `${task.course_code} - ${task.course_title}`
          : task.course_code,
        courseTitle: task.course_title || "General",
        daysRemaining,
        dueDateIso: task.due_date,
        dueTime,
        title: task.title,
        type: task.type,
        completedAt,
        createdAt: task.created_at || null,
        userId: task.user_id,
        isPublic: task.is_public || false,
        semesterId: task.semester_id ?? null,
      };
    });

  const courses: AcademicCourse[] = (coursesRes.data ?? [])
    .filter(inActiveSemester)
    .map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      colorIndex: course.color_index || 0,
      isPublic: course.is_public || false,
      semesterId: course.semester_id ?? null,
    }));

  // Only the authenticated user's focus logs, capped at 90 days back.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: focusLogsData, error: focusLogsError } = await supabase
    .from("focus_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  if (focusLogsError) throw focusLogsError;

  const focusLogs: FocusLog[] = (focusLogsData ?? []).map((log) => ({
    id: log.id,
    userId: log.user_id,
    taskId: log.task_id,
    duration: log.duration,
    type: log.type,
    createdAt: log.created_at,
  }));

  const firstName =
    user.user_metadata?.first_name ||
    user.user_metadata?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Student";
  const lastName =
    user.user_metadata?.last_name ||
    user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
    "";

  const profile: UserProfile = {
    email: user.email ?? "",
    firstName,
    lastName,
    name: firstName,
  };

  const meta = user.user_metadata ?? {};
  const reminderPreferences: ReminderPreferences = {
    enabled:
      typeof meta.reminders_enabled === "boolean"
        ? meta.reminders_enabled
        : DEFAULT_REMINDER_PREFERENCES.enabled,
    leadTimes: Array.isArray(meta.reminder_lead_times)
      ? (meta.reminder_lead_times as number[])
      : DEFAULT_REMINDER_PREFERENCES.leadTimes,
  };

  return {
    user: profile,
    isAdmin: isAdmin(user.email),
    reminderPreferences,
    tasks,
    courses,
    focusLogs,
    semesters,
    activeSemesterId,
    syncedAt: new Date().toISOString(),
  };
});
