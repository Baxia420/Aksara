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
      .order("due_date", { ascending: true });

    if (tasksError) throw tasksError;

    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .order("code", { ascending: true });

    if (coursesError) throw coursesError;

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

      return {
        id: task.id,
        completed: task.completed,
        courseCode: task.course_code,
        courseDisplay: task.course_title ? `${task.course_code} - ${task.course_title}` : task.course_code,
        courseTitle: task.course_title || "General",
        daysRemaining: daysRemaining,
        dueDateIso: task.due_date,
        dueTime: dueTime,
        title: task.title,
        type: task.type,
      };
    });

    const formattedCourses = courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      colorIndex: course.color_index || 0,
    }));

    return NextResponse.json({
      sourceUrl: "supabase",
      syncedAt: new Date().toISOString(),
      tasks: formattedTasks,
      courses: formattedCourses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
