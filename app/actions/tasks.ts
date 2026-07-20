"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { getActiveSemesterId } from "@/lib/semesters";

export async function toggleTaskCompletion(taskId: string, isCompleted: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!isCompleted) {
    // Mark as completed: insert user completion record
    const { error } = await supabase
      .from("user_task_completions")
      .insert({
        user_id: user.id,
        task_id: taskId,
        completed_at: new Date().toISOString()
      });

    // Code 23505 is unique constraint violation (already completed)
    if (error && error.code !== "23505") {
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  } else {
    // Mark as incomplete: remove completion record
    const { error } = await supabase
      .from("user_task_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("task_id", taskId);

    if (error) {
      throw new Error(`Failed to un-complete task: ${error.message}`);
    }
  }

  revalidatePath("/dashboard");
}

export async function createTask(formData: FormData): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const courseCode = formData.get("courseCode") as string;
  const courseTitle = formData.get("courseTitle") as string;
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  const dueDate = formData.get("dueDate") as string;
  const dueTime = (formData.get("dueTime") as string) || null;

  if (!courseCode || !title || !dueDate || !type) {
    return { error: "Missing required fields" };
  }

  const isPublic = isAdmin(user.email);
  const semesterId = await getActiveSemesterId(supabase, user.id);

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    course_code: courseCode,
    course_title: courseTitle,
    title,
    type,
    due_date: dueDate,
    due_time: dueTime,
    completed: false,
    is_public: isPublic,
    ...(semesterId ? { semester_id: semesterId } : {}),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function editTask(formData: FormData): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const id = formData.get("id") as string;
  const courseCode = formData.get("courseCode") as string;
  const courseTitle = formData.get("courseTitle") as string;
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  const dueDate = formData.get("dueDate") as string;
  const dueTime = (formData.get("dueTime") as string) || null;

  if (!id || !courseCode || !title || !dueDate || !type) {
    return { error: "Missing required fields" };
  }

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id, is_public")
    .eq("id", id)
    .single();

  if (fetchError || !task) {
    return { error: `Task not found${fetchError ? `: ${fetchError.message}` : ""}` };
  }

  // Shared tasks are the admin-owned syllabus — read-only to everyone else.
  // The UI hides the edit button for these; this is the server-side backstop.
  if (task.is_public && !isAdmin(user.email)) {
    return { error: "Only the administrator can edit shared tasks." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      course_code: courseCode,
      course_title: courseTitle,
      title,
      type,
      due_date: dueDate,
      due_time: dueTime,
    })
    .eq("id", id)
    .eq(isAdmin(user.email) ? "id" : "user_id", isAdmin(user.email) ? id : user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTask(id: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("user_id, is_public")
    .eq("id", id)
    .single();

  if (fetchError || !task) {
    return { error: `Task not found${fetchError ? `: ${fetchError.message}` : ""}` };
  }

  if (task.is_public && !isAdmin(user.email)) {
    return { error: "Only the administrator can delete shared tasks." };
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq(isAdmin(user.email) ? "id" : "user_id", isAdmin(user.email) ? id : user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
