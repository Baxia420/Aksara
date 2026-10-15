"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { mapFocusLog } from "@/lib/study";
import type { FocusLog, StudySessionInput } from "@/lib/types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function logFocusSession(
  input: StudySessionInput,
): Promise<{ log: FocusLog } | { error: string }> {
  if (
    !input ||
    !UUID.test(input.sessionId) ||
    !Number.isInteger(input.duration) ||
    input.duration < 1 ||
    input.duration > 86400 ||
    !["focus", "shortBreak", "longBreak"].includes(input.type) ||
    !["pomodoro", "stopwatch"].includes(input.timerStyle) ||
    (input.courseId && !UUID.test(input.courseId)) ||
    (input.taskId && !UUID.test(input.taskId)) ||
    !Array.isArray(input.intervals) ||
    !input.intervals.length ||
    input.intervals.length > 1000
  ) {
    return { error: "Invalid study session. Your session has not been saved." };
  }
  let intervalMilliseconds = 0;
  let previousEnd = 0;
  for (const interval of input.intervals) {
    if (
      !interval ||
      typeof interval.start !== "string" ||
      typeof interval.end !== "string"
    )
      return {
        error: "Invalid session timing. Your session has not been saved.",
      };
    const start = Date.parse(interval.start),
      end = Date.parse(interval.end);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      start < previousEnd ||
      end > Date.now() + 300000
    ) {
      return {
        error: "Invalid session timing. Your session has not been saved.",
      };
    }
    intervalMilliseconds += end - start;
    previousEnd = end;
  }
  if (Math.floor(intervalMilliseconds / 1000) !== input.duration)
    return { error: "Session duration does not match its study time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again to save this session." };

  // A retry reuses the session ID. Return the saved record without counting it twice,
  // even if its course or task has since been removed.
  const existing = await supabase
    .from("focus_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (existing.error)
    return {
      error:
        existing.error.code === "42703" || existing.error.code === "PGRST204"
          ? "Course study needs a database update before sessions can be saved. Your session is kept on this device."
          : "Could not check this session. Please retry when you are connected.",
    };
  if (existing.data) return { log: mapFocusLog(existing.data) };

  let course: {
    id: string;
    code: string;
    title: string;
    semester_id: string | null;
  } | null = null;
  if (input.courseId) {
    const result = await supabase
      .from("courses")
      .select("id, code, title, semester_id")
      .eq("id", input.courseId)
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .maybeSingle();
    if (result.error || !result.data)
      return {
        error:
          "This course is no longer available. Your session is kept on this device.",
      };
    course = result.data;
  }
  let task: {
    title: string;
    course_code: string;
    course_title: string;
    semester_id: string | null;
  } | null = null;
  if (input.taskId) {
    const result = await supabase
      .from("tasks")
      .select("title, course_code, course_title, semester_id")
      .eq("id", input.taskId)
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .maybeSingle();
    if (result.error || !result.data)
      return {
        error:
          "This task is no longer available. Your session is kept on this device.",
      };
    task = result.data;
    if (
      course &&
      (task.course_code !== course.code ||
        (task.semester_id &&
          course.semester_id &&
          task.semester_id !== course.semester_id))
    ) {
      return { error: "Choose a task from the selected course." };
    }
  }
  const row = {
    user_id: user.id,
    session_id: input.sessionId,
    task_id: input.taskId,
    course_id: course?.id ?? null,
    course_code: course?.code ?? task?.course_code ?? null,
    course_title: course?.title ?? task?.course_title ?? null,
    task_title: task?.title ?? null,
    semester_id: course?.semester_id ?? task?.semester_id ?? null,
    duration: input.duration,
    type: input.type,
    timer_style: input.timerStyle,
    intervals: input.intervals,
    started_at: input.intervals[0].start,
    created_at: input.intervals.at(-1)!.end,
  };
  const result = await supabase
    .from("focus_logs")
    .upsert(row, { onConflict: "user_id,session_id", ignoreDuplicates: true })
    .select("*")
    .maybeSingle();
  if (result.error)
    return {
      error:
        "Could not save your session. It is kept on this device; please retry.",
    };
  const saved =
    result.data ||
    (
      await supabase
        .from("focus_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_id", input.sessionId)
        .single()
    ).data;
  if (!saved) return { error: "Could not confirm the save. Please retry." };
  revalidatePath("/dashboard");
  return { log: mapFocusLog(saved) };
}

/** Load earlier weeks on demand rather than silently stopping at the initial 90 days. */
export async function loadFocusWeek(
  startIso: string,
  endIso: string,
): Promise<{ logs: FocusLog[] } | { error: string }> {
  const start = Date.parse(startIso),
    end = Date.parse(endIso);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 8 * 86400000
  )
    return { error: "Invalid week." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again to view study history." };
  // Include sessions that overlap the week, even after a long pause. Their active
  // intervals are clipped in the UI; old records use their completion timestamp.
  // Page explicitly so PostgREST's row limit cannot silently truncate a busy week.
  const logs: FocusLog[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("focus_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "focus")
      .gte("created_at", new Date(start).toISOString())
      .or(
        `started_at.lt.${new Date(end).toISOString()},and(started_at.is.null,created_at.lt.${new Date(end).toISOString()})`,
      )
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
    if (error) return { error: "Could not load this week. Please try again." };
    logs.push(...(data || []).map(mapFocusLog));
    if (!data || data.length < 1000) break;
  }
  return { logs };
}
