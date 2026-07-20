import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWebPush, type StoredPushSubscription } from "@/lib/push";
import { REMINDER_LEAD_TIME_OPTIONS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Due times are stored as local wall-clock; convert to a UTC instant using this
// offset (minutes). Defaults to UTC+8 (Malaysia). Override with env if needed.
const TZ_OFFSET_MIN = Number(process.env.REMINDER_TZ_OFFSET_MINUTES ?? 480);

function dueInstant(dueDate: string, dueTime: string | null): number {
  const [y, m, d] = dueDate.split("-").map(Number);
  let h = 23;
  let min = 59;
  if (dueTime) {
    const [hh, mm] = dueTime.split(":").map(Number);
    if (Number.isFinite(hh)) h = hh;
    if (Number.isFinite(mm)) min = mm;
  }
  return Date.UTC(y, m - 1, d, h, min) - TZ_OFFSET_MIN * 60_000;
}

function leadLabel(minutes: number): string {
  return (
    REMINDER_LEAD_TIME_OPTIONS.find((o) => o.minutes === minutes)?.label ??
    `${minutes}m before`
  );
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const qs = req.nextUrl.searchParams.get("secret");
  return header === `Bearer ${secret}` || qs === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const webpush = getWebPush();
  if (!webpush) {
    return NextResponse.json({ error: "push not configured" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 });
  }

  const now = Date.now();
  let sent = 0;
  let usersNotified = 0;

  // Active semester per user. Errors (e.g. migration not run yet) simply mean
  // no scoping — every task is considered, as before.
  const { data: semesterRows } = await admin
    .from("semesters")
    .select("id, user_id, is_active");
  const activeSemesterByUser = new Map<string, string>();
  for (const s of semesterRows ?? []) {
    if (s.is_active) activeSemesterByUser.set(s.user_id, s.id);
  }

  for (const user of usersData.users) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.reminders_enabled === false) continue;

    const leadTimes: number[] = Array.isArray(meta.reminder_lead_times)
      ? (meta.reminder_lead_times as number[])
      : [1440, 180];
    const subs: StoredPushSubscription[] = Array.isArray(meta.push_subscriptions)
      ? (meta.push_subscriptions as StoredPushSubscription[])
      : [];
    if (subs.length === 0 || leadTimes.length === 0) continue;

    const [{ data: allTasks }, { data: comps }] = await Promise.all([
      admin.from("tasks").select("*").or(`user_id.eq.${user.id},is_public.eq.true`),
      admin.from("user_task_completions").select("task_id").eq("user_id", user.id),
    ]);
    const completed = new Set((comps ?? []).map((c) => c.task_id));

    // Only remind about the user's active semester (unscoped rows always count).
    const activeSemester = activeSemesterByUser.get(user.id);
    const tasks = (allTasks ?? []).filter(
      (t) =>
        !activeSemester || !t.semester_id || t.semester_id === activeSemester,
    );

    const sentLog: Record<string, number> =
      meta.reminder_sent && typeof meta.reminder_sent === "object"
        ? { ...(meta.reminder_sent as Record<string, number>) }
        : {};
    const deadEndpoints = new Set<string>();
    let userSent = false;

    for (const t of tasks ?? []) {
      const isCompleted =
        completed.has(t.id) || (t.completed && t.user_id === user.id);
      if (isCompleted) continue;

      const due = dueInstant(t.due_date, t.due_time);
      if (due <= now) continue; // already due/overdue — don't nag

      for (const L of leadTimes) {
        const notifyAt = due - L * 60_000;
        const key = `${t.id}:${L}`;
        if (now < notifyAt || sentLog[key]) continue;

        const payload = JSON.stringify({
          title: `Due ${leadLabel(L).toLowerCase()}: ${t.course_code}`,
          body: t.title,
          url: "/dashboard",
        });
        for (const s of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: s.keys },
              payload,
            );
            sent++;
            userSent = true;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) deadEndpoints.add(s.endpoint);
          }
        }
        sentLog[key] = now;
      }
    }

    // Prune sent-log keys for tasks that are no longer pending.
    const pendingKeys = new Set<string>();
    for (const t of tasks ?? []) {
      for (const L of leadTimes) pendingKeys.add(`${t.id}:${L}`);
    }
    for (const k of Object.keys(sentLog)) {
      if (!pendingKeys.has(k)) delete sentLog[k];
    }

    const subsChanged = deadEndpoints.size > 0;
    const logChanged =
      JSON.stringify(sentLog) !==
      JSON.stringify(meta.reminder_sent ?? {});
    if (subsChanged || logChanged) {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...meta,
          push_subscriptions: subs.filter((s) => !deadEndpoints.has(s.endpoint)),
          reminder_sent: sentLog,
        },
      });
    }
    if (userSent) usersNotified++;
  }

  return NextResponse.json({ ok: true, sent, usersNotified });
}
