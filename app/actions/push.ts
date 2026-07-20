"use server";

import { createClient } from "@/lib/supabase/server";
import type { StoredPushSubscription } from "@/lib/push";

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
