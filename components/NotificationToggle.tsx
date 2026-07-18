"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Settings } from "lucide-react";
import {
  savePushSubscription,
  removePushSubscription,
  sendTestNotification,
} from "@/app/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resolveState() {
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setState(isIOS && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  useEffect(() => {
    resolveState();
  }, []);

  async function requestPermissionAndSubscribe() {
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }
      if (permission !== "granted") {
        setMsg("Permission not granted. Please try again.");
        return;
      }
      await subscribe();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function subscribe() {
    const reg = await navigator.serviceWorker.ready;
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
      setMsg("Push is not configured.");
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    const json = sub.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
    await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
    setState("on");
    setMsg("Notifications enabled on this device.");
  }

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      // Permission already granted (e.g. after cache clear) — just re-subscribe.
      if (Notification.permission === "granted") {
        await subscribe();
      } else {
        await requestPermissionAndSubscribe();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Notifications disabled on this device.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const result = await sendTestNotification();
      if ("error" in result) {
        setMsg(result.error);
        return;
      }
      setMsg("Test sent — check your notifications.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not send test.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Push notifications</p>
          <p className="text-xs text-ink-soft">
            Get reminders on this device even when Aksara is closed.
          </p>
        </div>

        {state === "loading" ? (
          <span className="text-sm text-ink-soft">Checking…</span>
        ) : state === "unsupported" ? (
          <span className="text-sm text-ink-soft">Not supported on this browser.</span>
        ) : state === "ios-install" ? (
          <span className="max-w-[16rem] text-right text-xs text-ink-soft">
            On iPhone, add Aksara to your Home Screen first, then enable here.
          </span>
        ) : state === "denied" ? (
          <div className="flex items-center gap-2">
            <Settings className="size-4 shrink-0 text-ink-muted" />
            <span className="text-right text-xs text-ink-muted">
              Blocked in browser settings.
            </span>
          </div>
        ) : state === "on" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={test}
              disabled={busy}
              className="aksara-chip px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Send test
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-[0.85rem] border border-line px-4 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink disabled:opacity-60"
            >
              <BellOff className="size-4" />
              Disable
            </button>
          </div>
        ) : (
          // state === "off": permission is "default" or "granted" but no subscription
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="aksara-primary-button inline-flex items-center gap-2 rounded-[0.85rem] px-5 py-2.5 font-semibold text-white disabled:opacity-70"
          >
            <Bell className="size-4" />
            {busy ? "Enabling…" : "Enable"}
          </button>
        )}
      </div>

      {state === "denied" && (
        <div className="mt-3 flex items-start gap-3 rounded-[0.85rem] border border-line bg-surface-soft p-4">
          <BellRing className="mt-0.5 size-4 shrink-0 text-maroon" />
          <div className="text-xs text-ink-muted">
            <p className="font-semibold text-ink">Notifications are blocked</p>
            <p className="mt-1">
              To re-enable, go to your device&apos;s{" "}
              <strong>Settings → Apps → Safari → Notifications</strong> (iOS) or open{" "}
              <strong>Safari → Settings for this website</strong> and set Notifications to{" "}
              <em>Allow</em>, then come back and tap Enable.
            </p>
            <button
              type="button"
              onClick={() => resolveState()}
              className="mt-2 font-semibold text-maroon underline-offset-2 hover:underline"
            >
              I&apos;ve updated my settings — check again
            </button>
          </div>
        </div>
      )}

      {msg && state !== "denied" ? (
        <p className="mt-3 text-sm text-maroon-soft">{msg}</p>
      ) : null}
    </div>
  );
}
