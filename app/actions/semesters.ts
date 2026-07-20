"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSemester(
  name: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Semester name is required." };
  if (trimmed.length > 60) return { error: "Semester name is too long." };

  // Deactivate current terms first — the new semester becomes the active one.
  const { error: deactivateError } = await supabase
    .from("semesters")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (deactivateError) {
    return { error: `Could not create semester: ${deactivateError.message}` };
  }

  const { error } = await supabase
    .from("semesters")
    .insert({ user_id: user.id, name: trimmed, is_active: true });
  if (error) {
    return { error: `Could not create semester: ${error.message}` };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function switchSemester(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: target, error: fetchError } = await supabase
    .from("semesters")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchError || !target) return { error: "Semester not found." };

  const { error: deactivateError } = await supabase
    .from("semesters")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (deactivateError) return { error: deactivateError.message };

  const { error } = await supabase
    .from("semesters")
    .update({ is_active: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSemester(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: semester, error: fetchError } = await supabase
    .from("semesters")
    .select("id, is_active")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchError || !semester) return { error: "Semester not found." };

  const { data: taskRows, error: tasksError } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", user.id)
    .eq("semester_id", id);
  if (tasksError) return { error: tasksError.message };
  const taskIds = (taskRows ?? []).map((t) => t.id);

  if (taskIds.length > 0) {
    // Clear references first: completions go with their tasks, but focus-timer
    // history is kept (detached) so overall stats survive semester deletion.
    const { error: compError } = await supabase
      .from("user_task_completions")
      .delete()
      .eq("user_id", user.id)
      .in("task_id", taskIds);
    if (compError) return { error: compError.message };

    const { error: focusError } = await supabase
      .from("focus_logs")
      .update({ task_id: null })
      .eq("user_id", user.id)
      .in("task_id", taskIds);
    if (focusError) return { error: focusError.message };

    const { error: taskDeleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("semester_id", id);
    if (taskDeleteError) return { error: taskDeleteError.message };
  }

  const { error: courseDeleteError } = await supabase
    .from("courses")
    .delete()
    .eq("user_id", user.id)
    .eq("semester_id", id);
  if (courseDeleteError) return { error: courseDeleteError.message };

  const { error } = await supabase
    .from("semesters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  // If the active semester was deleted, promote the most recent remaining one.
  if (semester.is_active) {
    const { data: remaining } = await supabase
      .from("semesters")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (remaining && remaining.length > 0) {
      await supabase
        .from("semesters")
        .update({ is_active: true })
        .eq("id", remaining[0].id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}
