"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";

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
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
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

  const isPublic = isAdmin(user.email);

  const { error } = await supabase.from("courses").insert({
    user_id: user.id,
    code,
    title,
    color_index: colorIndex,
    is_public: isPublic,
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

export async function logFocusSession(
  duration: number,
  type: "focus" | "shortBreak" | "longBreak",
  taskId: string | null = null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("focus_logs").insert({
    user_id: user.id,
    task_id: taskId || null,
    duration,
    type,
  });

  if (error) {
    throw new Error(`Failed to log focus session: ${error.message}`);
  }

  revalidatePath("/dashboard");
}

export async function updateReminderPreferences(
  enabled: boolean,
  leadTimes: number[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Stored in user_metadata; Supabase shallow-merges these keys, so the user's
  // name fields set by updateProfile are preserved.
  const cleaned = [...new Set(leadTimes)].filter((n) => Number.isFinite(n) && n >= 0);

  const { error } = await supabase.auth.updateUser({
    data: {
      reminders_enabled: enabled,
      reminder_lead_times: cleaned,
    },
  });

  if (error) {
    throw new Error(`Failed to update reminder preferences: ${error.message}`);
  }

  revalidatePath("/dashboard");
}

type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Saves a browser push subscription on the user's account (one per device,
 *  deduped by endpoint). Stored in user_metadata so no extra table is needed. */
export async function savePushSubscription(sub: StoredPushSubscription) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const existing: StoredPushSubscription[] = Array.isArray(
    user.user_metadata?.push_subscriptions,
  )
    ? user.user_metadata.push_subscriptions
    : [];
  const next = [
    ...existing.filter((s) => s.endpoint !== sub.endpoint),
    { endpoint: sub.endpoint, keys: sub.keys },
  ];

  const { error } = await supabase.auth.updateUser({
    data: { push_subscriptions: next },
  });
  if (error) throw new Error(`Failed to save subscription: ${error.message}`);
}

/** Removes a push subscription (this device) from the user's account. */
export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const existing: StoredPushSubscription[] = Array.isArray(
    user.user_metadata?.push_subscriptions,
  )
    ? user.user_metadata.push_subscriptions
    : [];

  const { error } = await supabase.auth.updateUser({
    data: { push_subscriptions: existing.filter((s) => s.endpoint !== endpoint) },
  });
  if (error) throw new Error(`Failed to remove subscription: ${error.message}`);
}

/** Sends a one-off test notification to all of the current user's devices. */
export async function sendTestNotification(): Promise<{ error: string } | { success: true }> {
  const { getWebPush } = await import("@/lib/push");
  const webpush = getWebPush();
  // Returned (not thrown) so the real reason survives Next.js's production
  // redaction of thrown Server Action errors and reaches the Settings UI.
  if (!webpush) {
    return { error: "Push is not configured on the server (VAPID keys missing)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const subs: StoredPushSubscription[] = Array.isArray(
    user.user_metadata?.push_subscriptions,
  )
    ? user.user_metadata.push_subscriptions
    : [];
  if (subs.length === 0) {
    return { error: "No device is subscribed yet — tap Enable first." };
  }

  const payload = JSON.stringify({
    title: "Aksara",
    body: "Test notification — reminders are working.",
    url: "/dashboard",
  });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload),
    ),
  );

  if (results.every((r) => r.status === "rejected")) {
    const first = results.find((r) => r.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    const reason = first?.reason;
    const detail = reason instanceof Error ? reason.message : "unknown error";
    return { error: `Push send failed: ${detail}` };
  }

  return { success: true };
}

export async function signOutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const password = formData.get("password") as string;

  if (!firstName || !lastName) {
    throw new Error("First Name and Last Name are required");
  }

  const updateData: {
    data: { first_name: string; last_name: string; full_name: string };
    password?: string;
  } = {
    data: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
    },
  };

  if (password && password.trim().length >= 6) {
    updateData.password = password;
  }

  const { error } = await supabase.auth.updateUser(updateData);

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  revalidatePath("/dashboard");
}
