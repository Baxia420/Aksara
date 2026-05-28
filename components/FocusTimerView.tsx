"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  RotateCcw, 
  Play, 
  Pause, 
  SkipForward, 
  BookOpen, 
  ChevronDown, 
  TrendingUp, 
  Quote 
} from "lucide-react";
import { logFocusSession } from "@/app/actions";

type AcademicTask = {
  id: string;
  completed: boolean;
  courseCode: string;
  courseDisplay: string;
  courseTitle: string;
  daysRemaining: number;
  dueDateIso: string;
  dueTime: string;
  title: string;
  type: string;
};

type FocusLog = {
  id: string;
  userId: string;
  taskId: string | null;
  duration: number;
  type: "focus" | "shortBreak" | "longBreak";
  createdAt: string;
};

type FocusTimerViewProps = {
  tasks: AcademicTask[];
  focusLogs: FocusLog[];
  onRefresh: () => void;
};

type TimerMode = "focus" | "shortBreak" | "longBreak";

const MODE_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,       // 25 minutes
  shortBreak: 5 * 60,   // 5 minutes
  longBreak: 15 * 60,   // 15 minutes
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus Session",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

export function FocusTimerView({ tasks, focusLogs, onRefresh }: FocusTimerViewProps) {
  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.focus);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Filter tasks to only show active ones
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => !t.completed);
  }, [tasks]);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Set default task if available
  useEffect(() => {
    if (activeTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(activeTasks[0].id);
    }
  }, [activeTasks, selectedTaskId]);

  // Handle timer countdown
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

  // Log session when timer completes naturally
  const handleTimerComplete = async () => {
    try {
      setTimerActive(false);
      playChime();
      
      // Save focus log to database via Server Action
      await logFocusSession(MODE_DURATIONS[timerMode], timerMode, selectedTaskId);
      
      // Refresh local page state (refetch logs)
      onRefresh();

      // Reset timer for current mode
      setTimeLeft(MODE_DURATIONS[timerMode]);
    } catch (e) {
      console.error("Failed to save focus session:", e);
    }
  };

  // Helper to play chime without external file dependencies
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      
      // Warm dual tone chime
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // A4
      
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

  // Switch modes
  const handleModeChange = (mode: TimerMode) => {
    setTimerActive(false);
    setTimerMode(mode);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  // Skip/Reset
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

  // Formatting helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDuration = MODE_DURATIONS[timerMode];
  const circumference = 276.46;
  const strokeDashoffset = circumference - (circumference * timeLeft) / totalDuration;

  // --- DYNAMIC DATABASE CALCULATIONS ---

  // Today's logs (local timezone boundary)
  const todayLogs = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return focusLogs.filter((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= startOfToday;
    });
  }, [focusLogs]);

  // Today's Completed Focus Sessions Count
  const completedFocus = useMemo(() => {
    return todayLogs.filter((log) => log.type === "focus").length;
  }, [todayLogs]);

  // Today's Completed Break Sessions Count (short or long break)
  const completedBreaks = useMemo(() => {
    return todayLogs.filter((log) => log.type === "shortBreak" || log.type === "longBreak").length;
  }, [todayLogs]);

  // Today's Total Focus Time in Minutes
  const todayTotalFocusMinutes = useMemo(() => {
    const totalSeconds = todayLogs
      .filter((log) => log.type === "focus")
      .reduce((sum, log) => sum + log.duration, 0);
    return Math.floor(totalSeconds / 60);
  }, [todayLogs]);

  const todayFocusHours = Math.floor(todayTotalFocusMinutes / 60);
  const todayFocusMinutes = todayTotalFocusMinutes % 60;

  // Daily target: 4 hours (240 minutes)
  const dailyGoalMinutes = 4 * 60;
  const progressPercent = Math.min(100, Math.round((todayTotalFocusMinutes / dailyGoalMinutes) * 100));

  // Weekly trend calculations (Monday through Sunday)
  const weeklyTrendData = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Find Monday of the current week
    const monday = new Date(now);
    const diff = now.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const days = ["M", "T", "W", "T", "F", "S", "S"];
    
    const results = days.map((dayLabel, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      // Filter focus logs for this particular day
      const dayLogs = focusLogs.filter((log) => {
        const logDate = new Date(log.createdAt);
        return logDate >= targetDate && logDate <= targetDateEnd && log.type === "focus";
      });

      const totalSeconds = dayLogs.reduce((sum, log) => sum + log.duration, 0);
      const totalHours = parseFloat((totalSeconds / 3600).toFixed(1));
      const isToday = targetDate.toDateString() === now.toDateString();

      return {
        day: dayLabel,
        val: totalHours,
        isToday,
      };
    });

    const maxVal = Math.max(4, ...results.map((r) => r.val));
    return results.map((r) => ({
      ...r,
      pct: Math.max(5, Math.round((r.val / maxVal) * 100)), // minimum 5% height for visual bars
    }));
  }, [focusLogs]);

  return (
    <div className="max-w-[100rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-7">
      {/* Left/Center Column (Main Timer Card) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <article className="aksara-card rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center min-h-[580px] relative overflow-hidden">
          {/* Decorative blurred element behind the timer */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#83103e]/4 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          {/* Timer Mode Selectors */}
          <div className="flex gap-2 bg-[#f4ede7]/60 p-1.5 rounded-full backdrop-blur-md border border-[#ddbfc4]/30 z-10 mb-10">
            {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                  timerMode === mode
                    ? "bg-white text-[#83103e] shadow-[0_4px_12px_rgba(131,16,62,0.06)]"
                    : "text-[#6f5b64] hover:bg-white/40"
                }`}
              >
                {mode === "focus" && "Focus (25m)"}
                {mode === "shortBreak" && "Short Break (5m)"}
                {mode === "longBreak" && "Long Break (15m)"}
              </button>
            ))}
          </div>

          {/* SVG Progress Ring */}
          <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center z-10 mb-10">
            <svg className="w-full h-full absolute top-0 left-0" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                className="text-[#ddbfc4]/25"
                cx="50"
                cy="50"
                fill="none"
                r="44"
                stroke="currentColor"
                strokeWidth="2.5"
              ></circle>
              {/* Active Progress */}
              <circle
                className="text-[#83103e] progress-ring__circle"
                cx="50"
                cy="50"
                fill="none"
                r="44"
                stroke="currentColor"
                strokeDasharray="276.46"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="4"
              ></circle>
            </svg>
            <div className="flex flex-col items-center justify-center">
              <span className="text-[0.68rem] font-bold text-[#b24e72] tracking-[0.22em] uppercase mb-2">
                {MODE_LABELS[timerMode]}
              </span>
              <span className="aksara-serif text-[#2c1d24] text-[4.4rem] font-bold leading-none tracking-tight">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-6 z-10 mb-10">
            <button
              onClick={handleReset}
              className="w-12 h-12 rounded-full border border-[#ddbfc4]/40 text-[#6f5b64] flex items-center justify-center hover:bg-[#fffaf6]/70 transition-all active:scale-95 shadow-sm"
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
              className="w-12 h-12 rounded-full border border-[#ddbfc4]/40 text-[#6f5b64] flex items-center justify-center hover:bg-[#fffaf6]/70 transition-all active:scale-95 shadow-sm"
              title="Skip Session"
            >
              <SkipForward className="size-4.5" />
            </button>
          </div>

          {/* Active Task Selector */}
          <div className="w-full max-w-md z-10">
            <label className="block text-[0.68rem] font-bold text-[#9e8b93] tracking-[0.15em] uppercase mb-2.5 text-center">
              What are you focusing on?
            </label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-[#ddbfc4]/40 bg-[#fffaf6]/90 hover:border-[#83103e]/40 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 truncate">
                  <BookOpen className="size-4.5 text-[#83103e] shrink-0" />
                  <span className="text-base text-[#2c1d24] truncate">
                    {selectedTask ? `${selectedTask.courseCode} - ${selectedTask.title}` : "Select a task..."}
                  </span>
                </div>
                <ChevronDown className="size-4.5 text-[#9e8b93] group-hover:text-[#83103e] transition-colors shrink-0" />
              </button>

              {isDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 max-h-52 overflow-y-auto bg-white border border-[#ddbfc4]/40 rounded-xl shadow-[0_12px_32px_rgba(131,16,62,0.1)] z-30 aksara-scrollbar">
                  {activeTasks.length === 0 ? (
                    <div className="p-4 text-[#8a747e] text-center text-sm">No pending tasks found.</div>
                  ) : (
                    activeTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTaskId(t.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 text-sm hover:bg-[#83103e]/5 transition-colors border-b border-[#ddbfc4]/10 last:border-none flex items-center justify-between ${
                          selectedTaskId === t.id ? "text-[#83103e] font-semibold bg-[#83103e]/3" : "text-[#5d4d55]"
                        }`}
                      >
                        <span className="truncate">{t.courseCode} - {t.title}</span>
                        <span className="text-xs uppercase tracking-wider font-semibold text-[#b34973] ml-2 shrink-0">{t.type}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      {/* Right Sidebar Column */}
      <div className="lg:col-span-4 flex flex-col gap-7">
        {/* Today's Focus Card */}
        <article className="aksara-card rounded-[2rem] p-7 flex flex-col gap-6">
          <div>
            <h3 className="text-xl font-bold text-[#2c1d24] mb-1">Today's Focus</h3>
            <p className="text-sm text-[#8a747e]">Stay on track with your goals.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[0.64rem] font-semibold text-[#9e8b93] tracking-widest uppercase">Total Time</span>
                <span className="aksara-serif text-[1.6rem] font-bold text-[#83103e] leading-none">
                  {todayFocusHours > 0 ? `${todayFocusHours}h ` : ""}{todayFocusMinutes}m
                </span>
              </div>
              <div className="w-full h-1 bg-[#ddbfc4]/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#83103e] to-[#e2a22f] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-1 text-[10px] text-[#9e8b93] font-semibold">
                <span>Goal: 4h</span>
                <span>{progressPercent}%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#ddbfc4]/20">
              <span className="text-[0.64rem] font-semibold text-[#9e8b93] tracking-widest uppercase block mb-3">Completed Cycles</span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Render filled Maroon dots for completed focus sessions */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <div 
                    key={`focus-dot-${i}`} 
                    className={`w-3.5 h-3.5 rounded-full transition-colors ${
                      i < completedFocus 
                        ? "bg-[#83103e] shadow-[0_0_8px_rgba(131,16,62,0.4)]" 
                        : "bg-[#ddbfc4]/30 border border-[#ddbfc4]/60"
                    }`}
                  />
                ))}
                {/* Render filled Gold dots for completed break sessions */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <div 
                    key={`break-dot-${i}`} 
                    className={`w-3.5 h-3.5 rounded-full transition-colors ${
                      i < completedBreaks 
                        ? "bg-[#e2a22f] shadow-[0_0_8px_rgba(226,162,47,0.4)]" 
                        : "bg-[#ddbfc4]/30 border border-[#ddbfc4]/60"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#8a747e] mt-3 font-semibold">
                {completedFocus} focus sessions, {completedBreaks} breaks
              </p>
            </div>
          </div>
        </article>

        {/* Weekly Analytics Card */}
        <article className="aksara-card rounded-[2rem] p-7 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-[#2c1d24]">Weekly Trend</span>
            <TrendingUp className="size-4.5 text-[#8a747e]" />
          </div>
          
          <div className="h-24 flex items-end gap-2.5 mt-2">
            {/* Dynamic weekly trend columns */}
            {weeklyTrendData.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                {/* Tooltip value */}
                <span className="absolute bottom-full mb-1 text-[10px] font-bold text-[#83103e] opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-[#ddbfc4]/30 px-1.5 py-0.5 rounded shadow-sm z-10 whitespace-nowrap">
                  {bar.val}h
                </span>
                {/* The Bar */}
                <div 
                  className={`w-full rounded-t-[4px] transition-all duration-300 ${
                    bar.isToday 
                      ? "bg-[#83103e] shadow-[0_0_12px_rgba(131,16,62,0.2)]" 
                      : "bg-[#ddbfc4]/40 hover:bg-[#83103e]/40"
                  }`}
                  style={{ height: `${bar.pct}%` }}
                ></div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between text-[10px] font-bold text-[#9e8b93] uppercase tracking-wider mt-1 px-1">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
        </article>

        {/* Motivation Card */}
        <article className="aksara-card rounded-[2rem] p-7 relative overflow-hidden bg-gradient-to-br from-[#fffaf6] to-[#ddbfc4]/20 border-none flex items-center min-h-[120px]">
          <Quote className="absolute -top-3 -left-3 size-20 text-[#e2a22f]/8 rotate-180 pointer-events-none" />
          <p className="aksara-serif text-lg italic text-[#57102b] leading-relaxed relative z-10 pl-2">
            "Focus is a muscle, and you are building it. Keep going."
          </p>
        </article>
      </div>
    </div>
  );
}
