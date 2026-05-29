import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order("due_date", { ascending: true });

    if (tasksError) throw tasksError;

    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order("code", { ascending: true });

    if (coursesError) throw coursesError;

    const { data: completions, error: completionsError } = await supabase
      .from("user_task_completions")
      .select("task_id, completed_at")
      .eq("user_id", user.id);

    if (completionsError) throw completionsError;

    const completedTaskIds = new Set(completions?.map((c) => c.task_id) || []);
    const completionMap = new Map<string, string>(
      completions?.map((c) => [c.task_id, c.completed_at]) || []
    );

    const formattedTasks = tasks.map((task) => {
      const today = new Date();
      const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      
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

      const isCompleted = completedTaskIds.has(task.id) || (task.completed && task.user_id === user.id);
      const completedAt = completionMap.get(task.id) || (task.completed && task.user_id === user.id ? task.completed_at : null);

      return {
        id: task.id,
        completed: isCompleted,
        courseCode: task.course_code,
        courseDisplay: task.course_title ? `${task.course_code} - ${task.course_title}` : task.course_code,
        courseTitle: task.course_title || "General",
        daysRemaining: daysRemaining,
        dueDateIso: task.due_date,
        dueTime: dueTime,
        title: task.title,
        type: task.type,
        completedAt: completedAt,
        createdAt: task.created_at || null,
        userId: task.user_id,
        isPublic: task.is_public || false,
      };
    });

    const formattedCourses = courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      colorIndex: course.color_index || 0,
      isPublic: course.is_public || false,
    }));

    const { data: focusLogs, error: focusLogsError } = await supabase
      .from("focus_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (focusLogsError) throw focusLogsError;

    const formattedFocusLogs = (focusLogs || []).map((log) => ({
      id: log.id,
      userId: log.user_id,
      taskId: log.task_id,
      duration: log.duration,
      type: log.type,
      createdAt: log.created_at,
    }));

    return NextResponse.json({
      sourceUrl: "supabase",
      syncedAt: new Date().toISOString(),
      user: {
        email: user.email,
        firstName: user.user_metadata?.first_name || (user.email === "alam.j@graduate.utm.my" ? "Jobayer" : user.user_metadata?.full_name?.split(" ")[0]) || user.email?.split("@")[0] || "Student",
        lastName: user.user_metadata?.last_name || (user.email === "alam.j@graduate.utm.my" ? "Alam" : user.user_metadata?.full_name?.split(" ").slice(1).join(" ")) || "",
        name: user.user_metadata?.first_name || (user.email === "alam.j@graduate.utm.my" ? "Jobayer" : user.user_metadata?.full_name?.split(" ")[0]) || user.email?.split("@")[0] || "Student",
      },
      tasks: formattedTasks,
      courses: formattedCourses,
      focusLogs: formattedFocusLogs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
