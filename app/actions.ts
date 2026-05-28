"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleTaskCompletion(taskId: string, isCompleted: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ completed: !isCompleted })
    .eq("id", taskId);

  if (error) {
    throw new Error(`Failed to toggle task: ${error.message}`);
  }

  revalidatePath("/dashboard");
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const courseCode = formData.get("courseCode") as string;
  const courseTitle = formData.get("courseTitle") as string;
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  const dueDate = formData.get("dueDate") as string;
  const dueTime = (formData.get("dueTime") as string) || null;

  if (!courseCode || !title || !dueDate || !type) {
    throw new Error("Missing required fields");
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    course_code: courseCode,
    course_title: courseTitle,
    title,
    type,
    due_date: dueDate,
    due_time: dueTime,
    completed: false,
  });

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  revalidatePath("/dashboard");
}

export async function addCourse(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const code = formData.get("code") as string;
  const title = formData.get("title") as string;
  const colorIndex = parseInt((formData.get("colorIndex") as string) || "0", 10);

  if (!code || !title) {
    throw new Error("Missing required fields");
  }

  const { error } = await supabase.from("courses").insert({
    user_id: user.id,
    code,
    title,
    color_index: colorIndex,
  });

  if (error) {
    throw new Error(`Failed to add course: ${error.message}`);
  }

  revalidatePath("/dashboard");
}

export async function editCourse(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const id = formData.get("id") as string;
  const colorIndex = parseInt((formData.get("colorIndex") as string) || "0", 10);

  if (!id) {
    throw new Error("Missing required fields");
  }

  const { error } = await supabase
    .from("courses")
    .update({ color_index: colorIndex })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }

  revalidatePath("/dashboard");
}

export async function deleteCourse(id: string, code: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check if course has tasks
  const { count, error: countError } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("course_code", code)
    .eq("user_id", user.id);

  if (countError) {
    throw new Error(`Failed to check course tasks: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error("Cannot delete a course that still has tasks assigned to it. Please delete or reassign its tasks first.");
  }

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }

  revalidatePath("/dashboard");
}
