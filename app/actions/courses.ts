"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { getActiveSemesterId } from "@/lib/semesters";

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

  const isPublic = isAdmin(user.email);
  const semesterId = await getActiveSemesterId(supabase, user.id);

  const { error } = await supabase.from("courses").insert({
    user_id: user.id,
    code,
    title,
    color_index: colorIndex,
    is_public: isPublic,
    ...(semesterId ? { semester_id: semesterId } : {}),
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

  const { data: course, error: fetchError } = await supabase
    .from("courses")
    .select("user_id, is_public")
    .eq("id", id)
    .single();

  if (fetchError || !course) {
    throw new Error("Course not found");
  }

  if (course.is_public && !isAdmin(user.email)) {
    throw new Error("Only the administrator can edit shared courses.");
  }

  const { error } = await supabase
    .from("courses")
    .update({ color_index: colorIndex })
    .eq("id", id)
    .eq(isAdmin(user.email) ? "id" : "user_id", isAdmin(user.email) ? id : user.id);

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

  const { data: course, error: fetchError } = await supabase
    .from("courses")
    .select("user_id, is_public")
    .eq("id", id)
    .single();

  if (fetchError || !course) {
    throw new Error("Course not found");
  }

  if (course.is_public && !isAdmin(user.email)) {
    throw new Error("Only the administrator can delete shared courses.");
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
    .eq(isAdmin(user.email) ? "id" : "user_id", isAdmin(user.email) ? id : user.id);

  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }

  revalidatePath("/dashboard");
}
