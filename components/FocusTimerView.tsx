"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Quote,
  Clock,
  BarChart2,
} from "lucide-react";
import { logFocusSession } from "@/app/actions";
import { coursePillClasses, courseBarColors } from "@/lib/courseTheme";
import type { AcademicCourse, AcademicTask, FocusLog } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type FocusTimerViewProps = {
  tasks: AcademicTask[];
  courses: AcademicCourse[];
  focusLogs: FocusLog[];
  onRefresh: () => void;
};

type TimerMode = "focus" | "shortBreak" | "longBreak";

// ─── Constants ───────────────────────────────────────────────────────────────

const MODE_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus Session",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

// Day labels — unambiguous two-char abbreviations
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Course color palettes (single source of truth in lib/courseTheme).
const COURSE_PILL_CLASSES = coursePillClasses;
const COURSE_BAR_COLORS = courseBarColors;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the Monday of a given week offset (0 = current week, -1 = last week, …) */
function getMondayOfWeek(weekOffset: number): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const yearSuffix =
    sunday.getFullYear() !== new Date().getFullYear()
      ? ` ${sunday.getFullYear()}`
      : "";

  return `${fmt(monday)} – ${fmt(sunday)}${yearSuffix}`;
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 1) return "< 1m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FocusTimerView({
  tasks,
  courses,
  focusLogs,
  onRefresh,
}: FocusTimerViewProps) {
  // Timer state
  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.focus);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Week navigation state (0 = current week, -1 = prev, …)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Active tasks only (for the task selector)
  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId],
  );

  // Build a map of courseCode → colorIndex for quick lookups
  const courseColorMap = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach((c) => map.set(c.code, c.colorIndex));
    return map;
  }, [courses]);

  // Default task selection
  useEffect(() => {
    if (activeTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(activeTasks[0].id);
    }
  }, [activeTasks, selectedTaskId]);

  // ── Timer countdown ──
  useEffect(() => {
    let interval: number | null = null;
    if (timerActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      void handleTimerComplete();
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const handleTimerComplete = async () => {
    try {
      setTimerActive(false);
      playChime();
      await logFocusSession(MODE_DURATIONS[timerMode], timerMode, selectedTaskId);
      onRefresh();
      setTimeLeft(MODE_DURATIONS[timerMode]);
    } catch (e) {
      console.error("Failed to save focus session:", e);
    }
  };

  const playChime = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.error("Audio Context playback failed", e);
    }
  };

  const handleModeChange = (mode: TimerMode) => {
    setTimerActive(false);
    setTimerMode(mode);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  const handleReset = () => {
    setTimerActive(false);
    setTimeLeft(MODE_DURATIONS[timerMode]);
  };

  const handleSkip = () => {
    setTimerActive(false);
    if (timerMode === "focus") {
      handleModeChange("shortBreak");
    } else {
      handleModeChange("focus");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = MODE_DURATIONS[timerMode];
  const circumference = 2 * Math.PI * 44; // r=44 → ≈ 276.46
  const strokeDashoffset = circumference - (circumference * timeLeft) / totalDuration;

  // ── Today stats (always current day, not affected by weekOffset) ──

  const todayLogs = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return focusLogs.filter((log) => new Date(log.createdAt) >= startOfToday);
  }, [focusLogs]);

  const completedFocus = useMemo(
    () => todayLogs.filter((log) => log.type === "focus").length,
    [todayLogs],
  );

  const completedBreaks = useMemo(
    () =>
      todayLogs.filter(
        (log) => log.type === "shortBreak" || log.type === "longBreak",
      ).length,
    [todayLogs],
  );

  const todayTotalFocusMinutes = useMemo(() => {
    const totalSeconds = todayLogs
      .filter((log) => log.type === "focus")
      .reduce((sum, log) => sum + log.duration, 0);
    return Math.floor(totalSeconds / 60);
  }, [todayLogs]);

  const todayFocusHours = Math.floor(todayTotalFocusMinutes / 60);
  const todayFocusMinutes = todayTotalFocusMinutes % 60;
  const dailyGoalMinutes = 4 * 60;
  const progressPercent = Math.min(
    100,
    Math.round((todayTotalFocusMinutes / dailyGoalMinutes) * 100),
  );

  // ── Week helpers ──

  const weekMonday = useMemo(() => getMondayOfWeek(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekRange(weekMonday), [weekMonday]);
  const isCurrentWeek = weekOffset === 0;

  // ── Weekly trend bar chart data ──

  const weeklyTrendData = useMemo(() => {
    const now = new Date();

    const results = DAY_LABELS.map((dayLabel, index) => {
      const targetDate = new Date(weekMonday);
      targetDate.setDate(weekMonday.getDate() + index);

      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      const dayLogs = focusLogs.filter((log) => {
        const logDate = new Date(log.createdAt);
        return (
          logDate >= targetDate &&
          logDate <= targetDateEnd &&
          log.type === "focus"
        );
      });

      const totalSeconds = dayLogs.reduce((sum, log) => sum + log.duration, 0);
      const totalHours = parseFloat((totalSeconds / 3600).toFixed(1));
      const isToday = targetDate.toDateString() === now.toDateString();
      const isFuture = targetDate > now;

      return { day: dayLabel, val: totalHours, isToday, isFuture };
    });

    const maxVal = Math.max(4, ...results.map((r) => r.val));
    return results.map((r) => ({
      ...r,
      pct: Math.max(5, Math.round((r.val / maxVal) * 100)),
    }));
  }, [focusLogs, weekMonday]);

  // ── Per-task & per-course time breakdown for selected week ──

  const taskTimeBreakdown = useMemo(() => {
    const weekEnd = new Date(weekMonday);
    weekEnd.setDate(weekMonday.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Only focus-type logs within the selected week
    const weekFocusLogs = focusLogs.filter((log) => {
      if (log.type !== "focus") return false;
      const d = new Date(log.createdAt);
      return d >= weekMonday && d <= weekEnd;
    });

    // Build a task lookup map
    const taskMap = new Map<string, AcademicTask>(tasks.map((t) => [t.id, t]));

    // Accumulate seconds per taskId
    const taskSeconds = new Map<string | "untracked", number>();
    weekFocusLogs.forEach((log) => {
      const key = log.taskId || "untracked";
      taskSeconds.set(key, (taskSeconds.get(key) || 0) + log.duration);
    });

    if (taskSeconds.size === 0) return [];

    // Group tasks by course
    const courseGroups = new Map<
      string,
      {
        courseCode: string;
        courseTitle: string;
        colorIndex: number;
        totalSeconds: number;
        tasks: { taskId: string; taskTitle: string; taskType: string; seconds: number }[];
      }
    >();

    taskSeconds.forEach((seconds, key) => {
      if (key === "untracked") {
        const existing = courseGroups.get("__untracked__");
        if (existing) {
          existing.totalSeconds += seconds;
          existing.tasks.push({
            taskId: "untracked",
            taskTitle: "No task selected",
            taskType: "",
            seconds,
          });
        } else {
          courseGroups.set("__untracked__", {
            courseCode: "—",
            courseTitle: "Untracked",
            colorIndex: 5,
            totalSeconds: seconds,
            tasks: [{ taskId: "untracked", taskTitle: "No task selected", taskType: "", seconds }],
          });
        }
        return;
      }

      const task = taskMap.get(key);
      if (!task) return;

      const colorIndex = courseColorMap.get(task.courseCode) ?? 0;
      const existing = courseGroups.get(task.courseCode);

      if (existing) {
        existing.totalSeconds += seconds;
        existing.tasks.push({
          taskId: key,
          taskTitle: task.title,
          taskType: task.type,
          seconds,
        });
      } else {
        courseGroups.set(task.courseCode, {
          courseCode: task.courseCode,
          courseTitle: task.courseTitle,
          colorIndex,
          totalSeconds: seconds,
          tasks: [{ taskId: key, taskTitle: task.title, taskType: task.type, seconds }],
        });
      }
    });

    // Sort courses by total time descending, sort tasks within each course descending
    return Array.from(courseGroups.values())
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .map((group) => ({
        ...group,
        tasks: [...group.tasks].sort((a, b) => b.seconds - a.seconds),
      }));
  }, [focusLogs, tasks, courseColorMap, weekMonday]);

  // Total focus time for the selected week (for the breakdown card header)
  const weekTotalMinutes = useMemo(() => {
    const totalSecs = taskTimeBreakdown.reduce((s, g) => s + g.totalSeconds, 0);
    return Math.floor(totalSecs / 60);
  }, [taskTimeBreakdown]);

  // Max course seconds (for relative bar widths in breakdown)
  const maxCourseSeconds = useMemo(
    () => Math.max(1, ...taskTimeBreakdown.map((g) => g.totalSeconds)),
    [taskTimeBreakdown],
  );

  // ── Render ──

  return (
    <div className="max-w-[100rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-7">
      {/* ── Left / Center Column (Timer) ── */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <article className="aksara-card rounded-[2rem] p-5 pt-7 md:p-12 flex flex-col items-center justify-center relative">
          {/* Decorative blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-maroon/4 rounded-full blur-3xl z-0 pointer-events-none" />

          {/* Mode selectors */}
          <div className="flex flex-wrap justify-center gap-2 bg-surface-soft/60 p-1.5 rounded-2xl backdrop-blur-md border border-line/30 z-10 mb-8 w-full max-w-sm">
            {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex-1 min-w-[6rem] px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  timerMode === mode
                    ? "bg-surface text-maroon shadow-[0_4px_12px_rgba(131,16,62,0.06)]"
                    : "text-ink-muted hover:bg-surface/40"
                }`}
              >
                {mode === "focus" && "Focus (25m)"}
                {mode === "shortBreak" && "Short Break (5m)"}
                {mode === "longBreak" && "Long Break (15m)"}
              </button>
            ))}
          </div>

          {/* SVG Progress Ring */}
          <div className="relative w-52 h-52 md:w-72 md:h-72 flex items-center justify-center z-10 mb-8">
            <svg
              className="w-full h-full absolute top-0 left-0"
              viewBox="0 0 100 100"
            >
              <circle
                className="text-[#ddbfc4]/25"
                cx="50"
                cy="50"
                fill="none"
                r="44"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <circle
                className="text-maroon progress-ring__circle"
                cx="50"
                cy="50"
                fill="none"
                r="44"
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="4"
              />
            </svg>
            <div className="flex flex-col items-center justify-center">
              <span className="text-[0.68rem] font-bold text-maroon-soft tracking-[0.22em] uppercase mb-2">
                {MODE_LABELS[timerMode]}
              </span>
              <span className="aksara-serif text-ink text-[4.4rem] font-bold leading-none tracking-tight">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-5 z-10 mb-8">
            <button
              onClick={handleReset}
              className="w-12 h-12 rounded-full border border-line/40 text-ink-muted flex items-center justify-center hover:bg-surface/70 transition-all active:scale-95 shadow-sm"
              title="Reset Timer"
            >
              <RotateCcw className="size-4.5" />
            </button>

            <button
              onClick={() => setTimerActive(!timerActive)}
              className="w-20 h-20 rounded-full aksara-primary-button text-white flex items-center justify-center shadow-lg transition-all active:scale-95 relative group hover:opacity-95"
              title={timerActive ? "Pause" : "Start"}
            >
              {timerActive ? (
                <Pause className="size-8" />
              ) : (
                <Play className="size-8 ml-1" />
              )}
            </button>

            <button
              onClick={handleSkip}
              className="w-12 h-12 rounded-full border border-line/40 text-ink-muted flex items-center justify-center hover:bg-surface/70 transition-all active:scale-95 shadow-sm"
              title="Skip Session"
            >
              <SkipForward className="size-4.5" />
            </button>
          </div>

          {/* Task selector */}
          <div className="w-full max-w-md z-10">
            <label className="block text-[0.68rem] font-bold text-ink-soft tracking-[0.15em] uppercase mb-2.5 text-center">
              What are you focusing on?
            </label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-line/40 bg-surface/90 hover:border-maroon/40 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 truncate">
                  <BookOpen className="size-4.5 text-maroon shrink-0" />
                  <span className="text-base text-ink truncate">
                    {selectedTask
                      ? `${selectedTask.courseCode} — ${selectedTask.title}`
                      : "Select a task..."}
                  </span>
                </div>
                <ChevronDown className="size-4.5 text-ink-soft group-hover:text-maroon transition-colors shrink-0" />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 max-h-52 overflow-y-auto bg-surface border border-line/40 rounded-xl shadow-[0_12px_32px_rgba(131,16,62,0.1)] z-30 aksara-scrollbar">
                  {activeTasks.length === 0 ? (
                    <div className="p-4 text-ink-soft text-center text-sm">
                      No pending tasks found.
                    </div>
                  ) : (
                    activeTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTaskId(t.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 text-sm hover:bg-maroon/5 transition-colors border-b border-line/10 last:border-none flex items-center justify-between ${
                          selectedTaskId === t.id
                            ? "text-maroon font-semibold bg-maroon/3"
                            : "text-ink-body"
                        }`}
                      >
                        <span className="truncate">
                          {t.courseCode} — {t.title}
                        </span>
                        <span className="text-xs uppercase tracking-wider font-semibold text-maroon-soft ml-2 shrink-0">
                          {t.type}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      {/* ── Right Sidebar ── */}
      <div className="lg:col-span-4 flex flex-col gap-7">

        {/* Today's Focus Card */}
        <article className="aksara-card rounded-[2rem] p-7 flex flex-col gap-6">
          <div>
            <h3 className="text-xl font-bold text-ink mb-1">
              Today&apos;s Focus
            </h3>
            <p className="text-sm text-ink-soft">Stay on track with your goals.</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Total time progress */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[0.64rem] font-semibold text-ink-soft tracking-widest uppercase">
                  Total Focus Time
                </span>
                <span className="aksara-serif text-[1.6rem] font-bold text-maroon leading-none">
                  {todayFocusHours > 0 ? `${todayFocusHours}h ` : ""}
                  {todayFocusMinutes}m
                </span>
              </div>
              <div className="w-full h-1 bg-line/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-maroon to-gold rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1 text-[10px] text-ink-soft font-semibold">
                <span>Goal: 4h</span>
                <span>{progressPercent}%</span>
              </div>
            </div>

            {/* Completed cycles */}
            <div className="pt-4 border-t border-line/20">
              <span className="text-[0.64rem] font-semibold text-ink-soft tracking-widest uppercase block mb-3">
                Completed Cycles
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`focus-dot-${i}`}
                    className={`w-3.5 h-3.5 rounded-full transition-colors ${
                      i < completedFocus
                        ? "bg-brand shadow-[0_0_8px_rgba(131,16,62,0.4)]"
                        : "bg-line/30 border border-line/60"
                    }`}
                  />
                ))}
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`break-dot-${i}`}
                    className={`w-3.5 h-3.5 rounded-full transition-colors ${
                      i < completedBreaks
                        ? "bg-gold shadow-[0_0_8px_rgba(226,162,47,0.4)]"
                        : "bg-line/30 border border-line/60"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-ink-soft mt-3 font-semibold">
                {completedFocus} focus sessions, {completedBreaks} breaks
              </p>
            </div>
          </div>
        </article>

        {/* Weekly Trend Card (with week navigation) */}
        <article className="aksara-card rounded-[2rem] p-7 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-ink-soft" />
              <span className="text-base font-bold text-ink">Weekly Trend</span>
            </div>
          </div>

          {/* Week navigation */}
          <div className="flex items-center justify-between bg-surface-soft/60 rounded-xl px-3 py-2 border border-line/25">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface/70 hover:text-maroon transition-all"
              title="Previous week"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="text-[0.65rem] font-bold text-ink-soft tracking-wider uppercase text-center">
              {isCurrentWeek ? "This Week" : weekLabel}
            </span>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              disabled={isCurrentWeek}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface/70 hover:text-maroon transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-muted"
              title="Next week"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* Bar chart */}
          <div className="h-24 flex items-end gap-1.5 mt-1">
            {weeklyTrendData.map((bar, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center h-full justify-end relative group"
              >
                {/* Tooltip */}
                <span className="absolute bottom-full mb-1 text-[10px] font-bold text-maroon opacity-0 group-hover:opacity-100 transition-opacity bg-surface/90 border border-line/30 px-1.5 py-0.5 rounded shadow-sm z-10 whitespace-nowrap">
                  {bar.val}h
                </span>
                {/* Bar */}
                <div
                  className={`w-full rounded-t-[4px] transition-all duration-300 ${
                    bar.isToday
                      ? "bg-brand shadow-[0_0_12px_rgba(131,16,62,0.2)]"
                      : bar.isFuture && isCurrentWeek
                      ? "bg-line/20 border border-dashed border-line/40"
                      : "bg-line/40 hover:bg-maroon/40"
                  }`}
                  style={{ height: `${bar.pct}%` }}
                />
              </div>
            ))}
          </div>

          {/* Day labels */}
          <div className="flex justify-between text-[9px] font-bold text-ink-soft uppercase tracking-wider px-0.5">
            {DAY_LABELS.map((d, i) => (
              <span
                key={i}
                className={
                  weeklyTrendData[i]?.isToday ? "text-maroon" : undefined
                }
              >
                {d}
              </span>
            ))}
          </div>
        </article>

        {/* Time by Topic Card */}
        <article className="aksara-card rounded-[2rem] p-7 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="size-4 text-ink-soft" />
                <span className="text-base font-bold text-ink">Time by Topic</span>
              </div>
              <p className="text-[0.65rem] text-ink-soft font-semibold tracking-wide uppercase">
                {isCurrentWeek ? "This week" : weekLabel}
              </p>
            </div>
            {weekTotalMinutes > 0 && (
              <div className="text-right shrink-0">
                <span className="aksara-serif text-[1.35rem] font-bold text-maroon leading-none">
                  {formatMinutes(weekTotalMinutes)}
                </span>
                <p className="text-[0.6rem] text-ink-soft font-semibold uppercase tracking-wide mt-0.5">
                  total
                </p>
              </div>
            )}
          </div>

          {/* Content */}
          {taskTimeBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-soft flex items-center justify-center">
                <Clock className="size-5 text-ink-soft" />
              </div>
              <p className="text-sm text-ink-soft font-semibold text-center leading-relaxed">
                No focus sessions logged
                <br />
                <span className="font-normal text-xs">
                  {isCurrentWeek ? "Start a session to see your stats" : "for this week"}
                </span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {taskTimeBreakdown.map((group) => {
                const colorIndex = group.colorIndex % COURSE_PILL_CLASSES.length;
                const pillClass = COURSE_PILL_CLASSES[colorIndex];
                const barClass = COURSE_BAR_COLORS[colorIndex];
                const courseWidthPct = Math.round(
                  (group.totalSeconds / maxCourseSeconds) * 100,
                );
                const courseMins = Math.floor(group.totalSeconds / 60);

                return (
                  <div key={group.courseCode} className="flex flex-col gap-2.5">
                    {/* Course header row */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold tracking-[0.04em] shrink-0 ${pillClass}`}
                      >
                        {group.courseCode}
                      </span>
                      <div className="flex items-baseline gap-1.5 shrink-0">
                        <span className="text-sm font-bold text-ink">
                          {formatMinutes(courseMins)}
                        </span>
                        <span className="text-[0.6rem] text-ink-soft font-semibold">
                          {Math.round((group.totalSeconds / (taskTimeBreakdown.reduce((s, g) => s + g.totalSeconds, 0))) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Course title */}
                    <p className="text-[0.7rem] text-ink-soft font-medium -mt-1.5 pl-0.5 truncate">
                      {group.courseTitle}
                    </p>

                    {/* Course total bar */}
                    <div className="w-full h-1.5 bg-line/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                        style={{ width: `${courseWidthPct}%` }}
                      />
                    </div>

                    {/* Individual task rows */}
                    <div className="flex flex-col gap-1.5 pl-1 mt-0.5">
                      {group.tasks.map((task) => {
                        const taskMins = Math.floor(task.seconds / 60);
                        const taskWidthPct = Math.round(
                          (task.seconds / group.totalSeconds) * 100,
                        );

                        return (
                          <div key={task.taskId} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-ink-body font-medium truncate flex-1 leading-tight">
                                {task.taskTitle}
                              </span>
                              <span className="text-xs font-semibold text-ink-soft shrink-0">
                                {formatMinutes(taskMins)}
                              </span>
                            </div>
                            {/* Task sub-bar (relative to course total) */}
                            <div className="w-full h-1 bg-line/15 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full opacity-50 transition-all duration-500 ${barClass}`}
                                style={{ width: `${taskWidthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* Motivation Card */}
        <article className="aksara-card rounded-[2rem] p-7 relative overflow-hidden bg-gradient-to-br from-[#fffaf6] to-[#ddbfc4]/20 border-none flex items-center min-h-[120px]">
          <Quote className="absolute -top-3 -left-3 size-20 text-gold/8 rotate-180 pointer-events-none" />
          <p className="aksara-serif text-lg italic text-maroon-deep leading-relaxed relative z-10 pl-2">
            &ldquo;Focus is a muscle, and you are building it. Keep going.&rdquo;
          </p>
        </article>
      </div>
    </div>
  );
}
