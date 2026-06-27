"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, Bell, GraduationCap } from "lucide-react";
import { updateProfile, updateReminderPreferences } from "@/app/actions";
import { useDashboardDataPromise } from "@/components/dashboard/DashboardDataProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { REMINDER_LEAD_TIME_OPTIONS } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const data = use(useDashboardDataPromise());
  const profile = data?.user ?? null;
  const prefs = data?.reminderPreferences ?? { enabled: true, leadTimes: [] };

  // Account form
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [password, setPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);

  // Reminder prefs
  const [remindersEnabled, setRemindersEnabled] = useState(prefs.enabled);
  const [leadTimes, setLeadTimes] = useState<number[]>(prefs.leadTimes);
  const [remindersSaving, setRemindersSaving] = useState(false);
  const [remindersMsg, setRemindersMsg] = useState<string | null>(null);

  async function handleAccountSubmit(formData: FormData) {
    setAccountSaving(true);
    setAccountMsg(null);
    try {
      await updateProfile(formData);
      setPassword("");
      setAccountMsg("Profile updated.");
      router.refresh();
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setAccountSaving(false);
    }
  }

  function toggleLeadTime(minutes: number) {
    setLeadTimes((prev) =>
      prev.includes(minutes)
        ? prev.filter((m) => m !== minutes)
        : [...prev, minutes].sort((a, b) => a - b),
    );
  }

  async function saveReminders() {
    setRemindersSaving(true);
    setRemindersMsg(null);
    try {
      await updateReminderPreferences(remindersEnabled, leadTimes);
      setRemindersMsg("Reminder preferences saved.");
      router.refresh();
    } catch (e) {
      setRemindersMsg(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setRemindersSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] lg:py-10">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 text-sm font-semibold text-maroon-deep shadow-[0_10px_24px_rgba(131,16,62,0.06)] transition hover:border-line"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[1.1rem] bg-maroon text-gold shadow-[0_12px_28px_rgba(131,16,62,0.18)]">
            <GraduationCap className="size-5" />
          </div>
        </div>
      </header>

      <h1 className="aksara-serif mt-8 text-[3.2rem] leading-[0.9] text-ink">
        Settings
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Manage your profile and how Aksara reminds you.
      </p>

      {/* Appearance */}
      <section className="aksara-card mt-8 flex flex-wrap items-center justify-between gap-4 p-7">
        <div>
          <h2 className="text-xl font-bold text-ink">Appearance</h2>
          <p className="text-sm text-ink-muted">Choose your theme.</p>
        </div>
        <ThemeToggle />
      </section>

      {/* Reminders */}
      <section className="aksara-card mt-6 p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-maroon/10 text-maroon">
              <Bell className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Reminders</h2>
              <p className="text-sm text-ink-muted">
                When should we nudge you before a deadline?
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={remindersEnabled}
            aria-label="Enable reminders"
            onClick={() => setRemindersEnabled((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              remindersEnabled ? "bg-maroon" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-surface shadow transition-all ${
                remindersEnabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        <div
          className={`mt-6 grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 ${
            remindersEnabled ? "" : "pointer-events-none opacity-40"
          }`}
        >
          {REMINDER_LEAD_TIME_OPTIONS.map((opt) => {
            const active = leadTimes.includes(opt.minutes);
            return (
              <button
                key={opt.minutes}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLeadTime(opt.minutes)}
                className={`rounded-[1rem] border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-maroon bg-maroon text-white shadow-[0_10px_24px_rgba(131,16,62,0.18)]"
                    : "border-line bg-surface text-ink-muted hover:border-line"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">
            {remindersMsg ?? "Delivered as push notifications once installed."}
          </p>
          <button
            type="button"
            onClick={saveReminders}
            disabled={remindersSaving}
            className="aksara-primary-button rounded-[0.85rem] px-6 py-2.5 font-semibold text-white disabled:opacity-70"
          >
            {remindersSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="aksara-card mt-6 p-7">
        <h2 className="text-xl font-bold text-ink">Account</h2>
        <p className="text-sm text-ink-muted">Update your name or password.</p>
        <form action={handleAccountSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">
              Email
            </label>
            <input
              disabled
              value={profile?.email ?? ""}
              className="w-full cursor-not-allowed rounded-[0.85rem] border border-line bg-surface-soft px-4 py-3 text-ink-soft"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-soft">
                First Name
              </label>
              <input
                required
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-[0.85rem] border border-line px-4 py-3 outline-none focus:border-maroon-bright"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-soft">
                Last Name
              </label>
              <input
                required
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-[0.85rem] border border-line px-4 py-3 outline-none focus:border-maroon-bright"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">
              New Password (optional)
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters to change"
              className="w-full rounded-[0.85rem] border border-line px-4 py-3 outline-none focus:border-maroon-bright"
            />
          </div>
          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-sm text-ink-soft">{accountMsg}</p>
            <button
              type="submit"
              disabled={accountSaving}
              className="aksara-primary-button rounded-[0.85rem] px-6 py-2.5 font-semibold text-white disabled:opacity-70"
            >
              {accountSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
