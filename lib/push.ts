import "server-only";
import webpush from "web-push";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const CONTACT = process.env.ADMIN_EMAIL || "admin@example.com";

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

let configured = false;

/**
 * Returns the configured web-push client, or null when VAPID keys are not set
 * (so the app degrades gracefully instead of crashing when push is unconfigured).
 */
export function getWebPush() {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return null;
  if (!configured) {
    webpush.setVapidDetails(`mailto:${CONTACT}`, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
  return webpush;
}

export const isPushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY);
