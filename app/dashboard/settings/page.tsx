"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, Bell, CalendarRange, GraduationCap } from "lucide-react";
import {
  createSemester,
  deleteSemester,
  switchSemester,
  updateProfile,
  updateReminderPreferences,
} from "@/app/actions";
import { useDashboardDataPromise } from "@/components/dashboard/DashboardDataProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationToggle } from "@/components/NotificationToggle";
import { REMINDER_LEAD_TIME_OPTIONS } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const data = use(useDashboardDataPromise());
  const profile = data?.user ?? null;
  const prefs = data?.reminderPreferences ?? { enabled: true, leadTimes: [] };
  const semesters = data?.semesters ?? [];

  // Semesters
  const [newSemesterName, setNewSemesterName] = useState("");
  const [semesterBusy, setSemesterBusy] = useState(false);
  const [semesterMsg, setSemesterMsg] = useState<string | null>(null);
  const [semesterToDelete, setSemesterToDelete] = useState<string | null>(null);

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

  async function handleCreateSemester() {
    setSemesterBusy(true);
    setSemesterMsg(null);
    try {
      const result = await createSemester(newSemesterName);
      if ("error" in result) {
        setSemesterMsg(result.error);
        return;
      }
      setNewSemesterName("");
      setSemesterMsg("Semester created and set as active.");
      router.refresh();
    } finally {
      setSemesterBusy(false);
    }
  }

  async function handleSwitchSemester(id: string) {
    setSemesterBusy(true);
    setSemesterMsg(null);
    try {
      const result = await switchSemester(id);
      if ("error" in result) {
        setSemesterMsg(result.error);
        return;
      }
      setSemesterMsg("Switched semester — your dashboard now shows this term.");
      router.refresh();
    } finally {
      setSemesterBusy(false);
    }
  }

  async function handleDeleteSemester(id: string) {
    setSemesterBusy(true);
    setSemesterMsg(null);
    try {
      const result = await deleteSemester(id);
      if ("error" in result) {
        setSemesterMsg(result.error);
        return;
      }
      setSemesterToDelete(null);
      setSemesterMsg("Semester deleted.");
      router.refresh();
    } finally {
      setSemesterBusy(false);
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
          <div className="flex size-11 items-center justify-center rounded-[1.1rem] bg-brand text-gold shadow-[0_12px_28px_rgba(131,16,62,0.18)]">
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
              remindersEnabled ? "bg-brand" : "bg-line"
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
                    ? "border-maroon bg-brand text-white shadow-[0_10px_24px_rgba(131,16,62,0.18)]"
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

        <NotificationToggle />
      </section>

      {/* Semesters */}
      <section className="aksara-card mt-6 p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-maroon/10 text-maroon">
            <CalendarRange className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Semesters</h2>
            <p className="text-sm text-ink-muted">
              Each term keeps its own courses and tasks. Switch back any time to
              revisit a finished semester.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {semesters.length === 0 ? (
            <p className="rounded-[0.85rem] border border-line bg-surface-soft px-4 py-3 text-sm text-ink-muted">
              No semesters yet — create your first one below.
            </p>
          ) : (
            semesters.map((sem) => (
              <div
                key={sem.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-line bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{sem.name}</p>
                  <p className="text-xs text-ink-soft">
                    Created{" "}
                    {new Date(sem.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {sem.isActive ? (
                    <span className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={semesterBusy}
                      onClick={() => handleSwitchSemester(sem.id)}
                      className="aksara-chip px-4 py-1.5 text-xs font-semibold disabled:opacity-60"
                    >
                      Switch to
                    </button>
                  )}
                  {semesterToDelete === sem.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-maroon-bright">
                        Delete its tasks &amp; courses?
                      </span>
                      <button
                        type="button"
                        disabled={semesterBusy}
                        onClick={() => handleDeleteSemester(sem.id)}
                        className="rounded-lg bg-brand-bright px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand disabled:opacity-60"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        disabled={semesterBusy}
                        onClick={() => setSemesterToDelete(null)}
                        className="px-2 py-1.5 text-xs font-semibold text-ink-soft transition hover:text-ink"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={semesterBusy}
                      onClick={() => setSemesterToDelete(sem.id)}
                      className="rounded-lg border border-maroon-bright/30 px-3 py-1.5 text-xs font-semibold text-maroon-bright transition hover:border-maroon-bright hover:bg-maroon-bright/5 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <input
            value={newSemesterName}
            onChange={(e) => setNewSemesterName(e.target.value)}
            placeholder="e.g. Semester 1, 2026/27"
            className="w-full min-w-0 rounded-[0.85rem] border border-line px-4 py-3 outline-none focus:border-maroon-bright"
          />
          <button
            type="button"
            disabled={semesterBusy || !newSemesterName.trim()}
            onClick={handleCreateSemester}
            className="aksara-primary-button shrink-0 rounded-[0.85rem] px-5 py-2.5 font-semibold text-white disabled:opacity-70"
          >
            {semesterBusy ? "Working…" : "Create"}
          </button>
        </div>

        {semesterMsg ? (
          <p className="mt-3 text-sm text-maroon-soft">{semesterMsg}</p>
        ) : null}
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
