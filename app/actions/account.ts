"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
