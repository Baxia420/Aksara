"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { toggleTaskCompletion, signOutUser } from "@/app/actions";
import { AddTaskModal } from "@/components/AddTaskModal";
import { ManageCoursesModal } from "@/components/ManageCoursesModal";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Home,
  ListTodo,
  Pencil,
  Settings,
  Timer,
} from "lucide-react";
import { FocusTimerView } from "@/components/FocusTimerView";
import { useDashboardDataPromise } from "@/components/dashboard/DashboardDataProvider";
import { useIsDesktop } from "@/lib/useIsDesktop";
import type {
  AcademicCourse,
  AcademicTask,
  DashboardView as MobileView,
  FocusLog,
  MarkerTone,
  TaskFilter,
  UserProfile,
} from "@/lib/types";
import { coursePillClasses, courseTints } from "@/lib/courseTheme";
import {
  formatDashboardDate,
  formatDueDateTime,
  formatFullDate,
  formatMonthShort,
  formatMonthYear,
  formatRelativeLabel,
  formatWeekdayLong,
  formatWeekdayShort,
  getExactDiffMs,
  getGreeting,
  getTaskAccent,
  getTaskTone,
  markerClassNames,
  markerLabels,
  toDate,
} from "@/lib/dateUtils";

type CourseCard = {
  code: string;
  nextDueLabel: string;
  pendingTasks: number;
  pillClassName: string;
  tint: string;
  title: string;
  totalTasks: number;
};

const mobileTabs: Array<{
  icon: React.ComponentType<{ className?: string }>;
  key: MobileView;
  label: string;
}> = [
  { key: "dashboard", label: "Home", icon: Home },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "focus", label: "Focus", icon: Timer },
];

const desktopSidebar = [
  { key: "dashboard", label: "Home", title: "Dashboard", icon: Home },
  { key: "calendar", label: "Calendar", title: "Calendar", icon: CalendarDays },
  { key: "tasks", label: "Tasks", title: "Task list", icon: ListTodo },
  { key: "courses", label: "Courses", title: "Courses overview", icon: BookOpen },
  { key: "focus", label: "Focus", title: "Focus timer", icon: Timer },
] satisfies Array<{
  icon: React.ComponentType<{ className?: string }>;
  key: MobileView;
  label: string;
  title: string;
}>;

function BrandGlyph({ size = "default" }: { size?: "default" | "small" }) {
  const classes =
    size === "small"
      ? "size-11 rounded-[1.1rem]"
      : "size-14 rounded-[1.15rem]";

  return (
    <div
      className={`${classes} flex items-center justify-center bg-brand text-gold shadow-[0_12px_28px_rgba(131,16,62,0.18)]`}
    >
      <GraduationCap className={size === "small" ? "size-5" : "size-6"} />
    </div>
  );
}

function BrandLockup() {
  return (
    <Link href="/" className="flex items-center gap-4">
      <BrandGlyph />
      <div>
        <p className="aksara-serif text-[2rem] font-semibold leading-none text-maroon">
          Aksara
        </p>
        <p className="aksara-mono mt-1 text-[0.58rem] text-maroon-soft">
          Academic OS
        </p>
      </div>
    </Link>
  );
}

function CoursePill({
  course,
  className,
}: {
  course: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.04em] ${className}`}
    >
      {course}
    </span>
  );
}

function CalendarWidget({
  activeDay,
  compact = false,
  markers,
  monthDate,
  onNextMonth,
  onPreviousMonth,
  tasksByDay,
}: {
  activeDay: null | number;
  compact?: boolean;
  markers: Record<number, MarkerTone[]>;
  monthDate: Date;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  tasksByDay: Record<number, AcademicTask[]>;
}) {
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) {
      return null;
    }

    return index - firstDay + 1;
  });

  const headingClass = compact
    ? "text-[2.35rem] leading-none"
    : "text-[3.1rem] leading-none";

  return (
    <div className={compact ? "aksara-card p-5" : "aksara-card p-7"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={`aksara-serif ${headingClass} text-ink`}>
            {formatMonthYear(monthDate).split(" ")[0]}{" "}
            <span className="text-maroon-bright">{year}</span>
          </h2>
          <p className="aksara-mono mt-2 text-[0.58rem] text-ink-soft">
            Live schedule month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="aksara-icon-button size-9 rounded-full transition hover:border-line hover:bg-surface"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="aksara-icon-button size-9 rounded-full transition hover:border-line hover:bg-surface"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-y-4 text-center">
        {dayNames.map((day, dayIndex) => (
          <span
            key={`${day}-${dayIndex}`}
            className="aksara-mono text-[0.55rem] text-ink-soft"
          >
            {day}
          </span>
        ))}

        {cells.map((day, index) => {
          const dayMarkers = day ? markers[day] ?? [] : [];
          const dayTasks = day ? tasksByDay[day] ?? [] : [];
          const isActive = day === activeDay;
          const hasDayTasks = dayTasks.length > 0;
          const dateLabel = day
            ? new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                weekday: "short",
              }).format(new Date(year, month, day))
            : "";

          return (
            <div
              key={day ?? `blank-${index}`}
              className="flex min-h-12 items-center justify-center"
            >
              {day ? (
                <div className="group relative flex h-11 w-11 flex-col items-center justify-center">
                  <button
                    type="button"
                    aria-label={
                      hasDayTasks
                        ? `${dateLabel}: ${dayTasks
                            .map((task) => `${task.courseCode} ${task.title}`)
                            .join(", ")}`
                        : dateLabel
                    }
                    className={`flex h-10 w-10 items-center justify-center rounded-[1rem] text-base font-semibold ${
                      isActive
                        ? "bg-brand-bright text-white shadow-[0_10px_20px_rgba(131,16,62,0.22)]"
                        : "text-ink-body"
                    } ${
                      hasDayTasks
                        ? "cursor-pointer transition hover:bg-surface-soft hover:text-maroon-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-bright"
                        : "cursor-default"
                    }`}
                  >
                    {day}
                  </button>
                  <div className="absolute bottom-0 flex items-center gap-1">
                    {dayMarkers.map((marker, markerIndex) => (
                      <span
                        key={`${day}-${marker}-${markerIndex}`}
                        className={`size-1.5 rounded-full ${markerClassNames[marker]}`}
                      />
                    ))}
                  </div>
                  {hasDayTasks ? (
                    <div className="pointer-events-none absolute left-1/2 top-12 z-30 hidden w-64 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-[1.15rem] border border-line bg-surface p-4 text-left shadow-[0_18px_34px_rgba(131,16,62,0.14)] group-hover:block group-focus-within:block">
                      <p className="aksara-mono text-[0.52rem] text-maroon-soft">
                        {dateLabel}
                      </p>
                      <div className="mt-3 space-y-3">
                        {dayTasks.map((task) => {
                          const tone = getTaskTone(task);

                          return (
                            <div
                              key={`${task.title}-${task.dueDateIso}`}
                              className="border-l-2 border-[#ead4dc] pl-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-maroon-bright">
                                  {task.courseCode}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                                  <span
                                    className={`size-1.5 rounded-full ${markerClassNames[tone]}`}
                                  />
                                  {markerLabels[tone]}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold leading-5 text-ink">
                                {task.title}
                              </p>
                              <p className="mt-1 text-xs text-ink-soft">
                                {task.type} / {formatDueDateTime(task)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <span className="block h-11 w-11" />
              )}
            </div>
          );
        })}
      </div>

      <div className="aksara-divider mt-6" />
      <div className="mt-4 flex flex-wrap gap-5 text-sm text-ink-soft">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#a91c58]" />
          Overdue
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#d89d2c]" />
          Due soon
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#c9839d]" />
          Upcoming
        </span>
      </div>
    </div>
  );
}

function getInitials(profile: { firstName?: string; lastName?: string; name?: string; email?: string } | null) {
  if (!profile) return "•";
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  }
  if (profile.firstName) {
    return profile.firstName.substring(0, 2).toUpperCase();
  }
  if (profile.name) {
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (profile.email) {
    return profile.email.charAt(0).toUpperCase();
  }
  return "•";
}

function MobileTopBar({
  meta,
  title,
  accent,
  userProfile = null,
  onOpenSettings = () => {},
  onLogout = () => {},
}: {
  accent?: string;
  meta: string;
  title: string;
  userProfile?: { email: string; name: string; firstName?: string; lastName?: string } | null;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="aksara-mono text-[0.6rem] text-maroon-soft">{meta}</p>
          <h1 className="aksara-serif mt-2 text-[3.45rem] leading-[0.82] tracking-[-0.04em] text-ink">
            {title}
            {accent ? (
              <>
                <br />
                <span className="italic text-maroon-soft">{accent}</span>
              </>
            ) : null}
          </h1>
        </div>
        <div className="flex items-center gap-3 pt-3">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-gold text-sm font-bold text-[#7b173d] shadow-[0_10px_24px_rgba(226,162,47,0.28)] hover:brightness-105 active:scale-95 transition"
            >
              {getInitials(userProfile)}
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[rgba(155,112,122,0.2)] bg-surface p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 text-xs font-semibold text-ink-soft border-b border-line mb-1 text-left">
                  Signed in as <br />
                  <span className="text-ink break-all">{userProfile?.email}</span>
                </div>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-maroon/5 hover:text-maroon rounded-xl transition"
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileTaskCard({
  pillClassName,
  task,
  onToggle,
  onEdit,
}: {
  pillClassName: string;
  task: AcademicTask;
  onToggle?: () => void;
  onEdit?: () => void;
}) {
  return (
    <article className="aksara-card rounded-[1.8rem] px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <CoursePill course={task.courseCode} className={pillClassName} />
        <p className={`text-sm font-semibold ${getTaskAccent(task)}`}>
          {formatRelativeLabel(task)}
        </p>
      </div>
      <h3 className="mt-4 text-[1.38rem] font-semibold leading-8 text-ink">
        {task.title}
      </h3>
      <div className="mt-3 text-sm text-ink-soft">{task.courseTitle}</div>
      <div className="mt-4 flex items-center justify-between gap-4 text-sm text-ink-soft">
        <p>{formatDueDateTime(task)}</p>
        <div className="flex items-center gap-4">
          <p className="font-semibold text-maroon-soft">
            {task.completed ? "Completed" : task.type}
          </p>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit task"
              className="p-1 text-ink-soft transition-colors hover:text-maroon"
            >
              <Pencil className="size-4.5" />
            </button>
          ) : null}
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
              className={`flex size-7 items-center justify-center rounded-[0.5rem] border-[2.5px] transition-colors ${
                task.completed
                  ? "border-maroon bg-brand text-white"
                  : "border-line bg-surface hover:border-maroon"
              }`}
            >
              {task.completed && (
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  // Tabs are in-page client state (not routes) so switching is instant and only
  // the initial dashboard load shows a loading screen.
  const [view, setView] = useState<MobileView>("dashboard");

  // Data is fetched once on the server (dashboard layout) and read here via the
  // React `use` API. Navigating between tabs reuses the resolved promise, so it
  // never refetches. router.refresh() re-runs the server fetch after mutations.
  const dashboardData = use(useDashboardDataPromise());
  const userProfile: UserProfile | null = dashboardData?.user ?? null;
  const syncedAt = dashboardData?.syncedAt ?? null;
  const isAdmin = dashboardData?.isAdmin ?? false;

  // A user may edit their own tasks; shared (is_public) tasks are the admin's
  // read-only syllabus. Since the data query only ever returns a user's own
  // private tasks plus shared ones, "not public" is sufficient to mean "mine".
  const canEditTask = useCallback(
    (task: AcademicTask) => isAdmin || !task.isPublic,
    [isAdmin],
  );

  // Mount the focus timer once (it owns intervals + audio); the desktop and
  // mobile layout trees both exist in the DOM, so without this it would mount
  // twice. See useIsDesktop.
  const isDesktop = useIsDesktop();

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("pending");

  // Local mirrors of the server data so task toggles feel instant. They are
  // re-synced whenever fresh server data arrives (after router.refresh()).
  const [tasks, setTasks] = useState<AcademicTask[]>(dashboardData?.tasks ?? []);
  const [courses, setCourses] = useState<AcademicCourse[]>(dashboardData?.courses ?? []);
  const [focusLogs, setFocusLogs] = useState<FocusLog[]>(dashboardData?.focusLogs ?? []);
  useEffect(() => {
    // Re-sync local mirrors when fresh server data arrives (after router.refresh).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(dashboardData?.tasks ?? []);
    setCourses(dashboardData?.courses ?? []);
    setFocusLogs(dashboardData?.focusLogs ?? []);
  }, [dashboardData]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isManageCoursesOpen, setIsManageCoursesOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<AcademicTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => router.refresh(), [router]);
  const openSettings = useCallback(() => router.push("/dashboard/settings"), [router]);

  const handleLogout = useCallback(async () => {
    try {
      await signOutUser();
      window.location.href = "/";
    } catch (e) {
      console.error("Logout failed", e);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const [taskToConfirm, setTaskToConfirm] = useState<string | null>(null);

  const handleToggle = (taskId: string, currentStatus: boolean) => {
    if (!currentStatus) {
      setTaskToConfirm(taskId);
      return;
    }
    startTransition(async () => {
      // Optimistic update locally
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));
      await toggleTaskCompletion(taskId, currentStatus);
    });
  };

  const confirmCompletion = () => {
    if (taskToConfirm) {
      startTransition(async () => {
        setTasks(prev => prev.map(t => t.id === taskToConfirm ? { ...t, completed: true } : t));
        await toggleTaskCompletion(taskToConfirm, false);
      });
      setTaskToConfirm(null);
    }
  };

  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks],
  );

  const courseCards = useMemo(() => {
    const grouped = new Map<
      string,
      {
        code: string;
        nextDueIso: string;
        nextDueLabel: string;
        pendingTasks: number;
        title: string;
        totalTasks: number;
        colorIndex: number;
      }
    >();

    // Initialize with explicit courses
    courses.forEach((course) => {
      grouped.set(course.code, {
        code: course.code,
        nextDueIso: "9999-12-31",
        nextDueLabel: "No tasks",
        pendingTasks: 0,
        title: course.title,
        totalTasks: 0,
        colorIndex: course.colorIndex,
      });
    });

    tasks.forEach((task) => {
      const existing = grouped.get(task.courseCode);
      const nextDueLabel = formatDueDateTime(task);

      if (!existing) {
        // Fallback for unmigrated tasks
        grouped.set(task.courseCode, {
          code: task.courseCode,
          nextDueIso: task.dueDateIso,
          nextDueLabel,
          pendingTasks: task.completed ? 0 : 1,
          title: task.courseTitle,
          totalTasks: 1,
          colorIndex: 0,
        });
        return;
      }

      existing.totalTasks += 1;
      if (!task.completed) {
        existing.pendingTasks += 1;
      }

      if (existing.nextDueIso === "9999-12-31" || task.dueDateIso < existing.nextDueIso) {
        existing.nextDueIso = task.dueDateIso;
        existing.nextDueLabel = nextDueLabel;
      }
    });

    return Array.from(grouped.values())
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((course) => ({
        ...course,
        pillClassName: coursePillClasses[course.colorIndex % coursePillClasses.length],
        tint: courseTints[course.colorIndex % courseTints.length],
      })) satisfies CourseCard[];
  }, [tasks, courses]);

  const courseStyles = useMemo(() => {
    return new Map(
      courseCards.map((course) => [course.code, course.pillClassName]),
    );
  }, [courseCards]);

  const calendarData = useMemo(() => {
    const markers: Record<number, MarkerTone[]> = {};
    const tasksByDay: Record<number, AcademicTask[]> = {};
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const today = new Date();
    const activeDay =
      today.getFullYear() === year && today.getMonth() === month
        ? today.getDate()
        : null;
    const monthTasks = pendingTasks.filter((task) => {
      const taskDate = toDate(task.dueDateIso);
      return (
        taskDate.getFullYear() === year && taskDate.getMonth() === month
      );
    });

    monthTasks.forEach((task) => {
      const day = toDate(task.dueDateIso).getDate();
      const tone = getTaskTone(task);
      const existing = markers[day] ?? [];

      if (!existing.includes(tone)) {
        existing.push(tone);
      }

      markers[day] = existing;
      tasksByDay[day] = [...(tasksByDay[day] ?? []), task];
    });

    return {
      activeDay,
      markers,
      tasksByDay,
    };
  }, [monthDate, pendingTasks]);

  const timelineTasks = useMemo(() => pendingTasks.slice(0, 3), [pendingTasks]);

  const weeklyFocusStats = useMemo(() => {
    const now = new Date(currentTime);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyLogs = focusLogs.filter((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= startOfWeek && log.type === "focus";
    });

    const totalSeconds = weeklyLogs.reduce((sum, log) => sum + log.duration, 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return { hours, minutes };
  }, [focusLogs, currentTime]);

  const velocityData = useMemo(() => {
    const days = [];
    const now = new Date(currentTime);
    
    // Last 5 days (ascending order for left-to-right bar rendering)
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    const results = days.map((dayDate) => {
      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);

      const completedOnDay = tasks.filter((task) => {
        if (!task.completed) return false;
        
        // Fallback chain: completedAt -> createdAt -> dueDateIso
        const compDate = task.completedAt 
          ? new Date(task.completedAt) 
          : (task.createdAt ? new Date(task.createdAt) : toDate(task.dueDateIso));
          
        return compDate >= dayDate && compDate <= dayEnd;
      });

      const count = completedOnDay.length;
      const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });

      return {
        label: `${dayLabel}: ${count} task${count === 1 ? "" : "s"}`,
        count,
      };
    });

    const maxVal = Math.max(4, ...results.map(r => r.count));
    
    return results.map(r => ({
      ...r,
      pct: Math.max(5, Math.round((r.count / maxVal) * 100)),
    }));
  }, [tasks, currentTime]);

  const EXAM_TYPES = useMemo(() => ["quiz", "midterm", "final exam"], []);

  const summary = useMemo(() => {
    // Separate tasks and exams
    const actualTasks = tasks.filter(t => !EXAM_TYPES.includes((t.type || "").toLowerCase()));
    const actualPendingTasks = pendingTasks.filter(t => !EXAM_TYPES.includes((t.type || "").toLowerCase()));

    const actualExams = tasks.filter(t => EXAM_TYPES.includes((t.type || "").toLowerCase()));
    const actualPendingExams = pendingTasks.filter(t => EXAM_TYPES.includes((t.type || "").toLowerCase()));

    const totalTasks = actualTasks.length;
    const completedTasks = actualTasks.filter((t) => t.completed).length;

    const groupTasks = actualPendingTasks.filter((t) =>
      t.type.toLowerCase().includes("group"),
    ).length;

    const urgentTasks = actualPendingTasks.filter((t) => getExactDiffMs(t, currentTime) <= 2 * 86400000).length;
    const dueSoonTasks = actualPendingTasks.filter((t) => {
      const diffMs = getExactDiffMs(t, currentTime);
      return diffMs > 2 * 86400000 && diffMs <= 7 * 86400000;
    }).length;
    const upcomingTasks = actualPendingTasks.filter((t) => getExactDiffMs(t, currentTime) > 7 * 86400000).length;

    return {
      completed: completedTasks,
      completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      dueSoon: dueSoonTasks,
      group: groupTasks,
      pending: actualPendingTasks.length,
      total: totalTasks,
      upcoming: upcomingTasks,
      urgent: urgentTasks,
      
      // Exams stats
      pendingExams: actualPendingExams.length,
      totalExams: actualExams.length,
      completedExams: actualExams.filter((t) => t.completed).length,
    };
  }, [pendingTasks, tasks, currentTime, EXAM_TYPES]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "group") {
      return pendingTasks.filter((task) =>
        task.type.toLowerCase().includes("group"),
      );
    }

    if (taskFilter === "urgent") {
      return pendingTasks.filter((task) => getExactDiffMs(task, currentTime) <= 2 * 86400000);
    }

    if (taskFilter === "completed") {
      return tasks.filter((task) => task.completed);
    }

    return pendingTasks;
  }, [pendingTasks, taskFilter, tasks, currentTime]);

  const taskFilterButtons: Array<{
    filter: TaskFilter;
    label: string;
  }> = [
    { filter: "pending", label: `Pending: ${summary.pending}` },
    { filter: "group", label: `Group: ${summary.group}` },
    { filter: "urgent", label: `Urgent: ${summary.urgent}` },
    { filter: "completed", label: `Done: ${summary.completed}` },
  ];

  const syncLabel = useMemo(() => {
    if (!syncedAt) {
      return "Synced";
    }

    return `Synced ${new Date(syncedAt).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [syncedAt]);

  const nextTask = pendingTasks[0] ?? null;
  const todayTasks = pendingTasks.filter((task) => task.daysRemaining === 0);
  const upcomingTasks = pendingTasks.slice(0, 4);
  const dashboardDateLabel = formatDashboardDate(currentTime);
  const greetingLabel = getGreeting(currentTime);
  const showPreviousMonth = () => {
    setMonthDate(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };
  const showNextMonth = () => {
    setMonthDate(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };
  const handleDesktopNavigation = (next: MobileView) => {
    setView(next);
  };

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6 lg:py-6">
      <AddTaskModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setTaskToEdit(null); refresh(); }} tasks={tasks} courses={courses} taskToEdit={taskToEdit} />
      <ManageCoursesModal isOpen={isManageCoursesOpen} onClose={() => { setIsManageCoursesOpen(false); refresh(); }} onRefresh={refresh} courses={courses} />
      {taskToConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm"
          onClick={() => setTaskToConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Complete task"
            className="aksara-card w-full max-w-sm p-8 text-center rounded-[1.8rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="aksara-serif text-2xl font-semibold mb-3 text-ink">Complete Task?</h3>
            <p className="text-ink-soft mb-6">Are you sure you want to mark this task as completed?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setTaskToConfirm(null)} className="px-5 py-2.5 font-semibold text-ink-soft hover:text-ink transition rounded-[0.85rem]">
                Cancel
              </button>
              <button onClick={confirmCompletion} className="aksara-primary-button px-6 py-2.5 font-semibold text-white rounded-[0.85rem]">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto hidden max-w-[100rem] lg:block">
        <div className="flex gap-7">
          <aside className="flex w-[5rem] shrink-0 flex-col items-center gap-5 pt-2">
            <BrandGlyph size="small" />
            <div className="flex flex-col gap-5">
              {desktopSidebar.map((item) => {
                const Icon = item.icon;
                const active = view === item.key;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleDesktopNavigation(item.key)}
                    className={`size-16 ${
                      active
                        ? "aksara-sidebar-button aksara-sidebar-button-active"
                        : "aksara-sidebar-button"
                    }`}
                    aria-label={item.label}
                    title={item.title}
                  >
                    <Icon className="size-5" />
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="flex items-center justify-between gap-8">
              <div className="flex min-w-0 items-center gap-6">
                <BrandLockup />
                <div className="hidden h-8 w-px bg-line xl:block" />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={openSettings}
                  aria-label="Settings"
                  title="Settings"
                  className="aksara-icon-button size-14 rounded-full transition hover:border-maroon-bright hover:text-maroon-bright"
                >
                  <Settings className="size-5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={isProfileOpen}
                    className="flex size-14 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-bold text-maroon-bright shadow-[0_10px_24px_rgba(131,16,62,0.07)] hover:border-maroon-bright transition"
                  >
                    {getInitials(userProfile)}
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[rgba(155,112,122,0.2)] bg-surface p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 text-xs font-semibold text-ink-soft border-b border-line mb-1 text-left">
                        Signed in as <br />
                        <span className="text-ink break-all">{userProfile?.email}</span>
                      </div>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          openSettings();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-maroon/5 hover:text-maroon rounded-xl transition"
                      >
                        Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition"
                      >
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div
              className={`mt-7 ${
                view === "dashboard"
                  ? "grid grid-cols-[minmax(0,1.75fr)_24rem] gap-7"
                  : ""
              }`}
            >
              {view === "dashboard" ? (
                <>
              <section className="space-y-7">
                <article id="dashboard-home" className="aksara-card p-8 flex flex-col gap-6">
                  {/* Row 1: Greeting & Summary */}
                  <div>
                    <p className="aksara-mono text-[0.66rem] text-maroon-soft mb-3">
                      {dashboardDateLabel} / {syncLabel}
                    </p>
                    <h1 className="aksara-serif text-[4rem] leading-[0.98] tracking-[-0.05em] text-ink mb-4">
                      {greetingLabel},{" "}
                      <span className="italic text-maroon-bright">{userProfile?.name || "Student"}.</span>
                    </h1>
                    <p className="text-[1.38rem] leading-9 text-ink-body max-w-2xl">
                      You have{" "}
                      <span className="text-maroon-bright font-semibold">
                        {summary.pending} pending task{summary.pending === 1 ? "" : "s"}
                      </span>{" "}
                      and{" "}
                      <span className="text-maroon-bright font-semibold">
                        {summary.pendingExams} exam{summary.pendingExams === 1 ? "" : "s"}
                      </span>{" "}
                      on your schedule.{" "}
                      <span className="text-maroon-bright font-semibold">
                        {pendingTasks.filter(t => getExactDiffMs(t, currentTime) <= 2 * 86400000).length} active deadline{pendingTasks.filter(t => getExactDiffMs(t, currentTime) <= 2 * 86400000).length === 1 ? "" : "s"}
                      </span>{" "}
                      are currently tracked.
                    </p>
                  </div>

                  {/* Horizontal Divider */}
                  <div className="h-px bg-line/30 w-full" />

                  {/* Row 2: Progress Analytics */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-12 pt-2 pb-1">
                    {/* Left: Progress Wheel */}
                    <div className="flex items-center gap-7">
                      <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" fill="none" r="44" stroke="rgba(155, 112, 122, 0.15)" strokeWidth="8"></circle>
                          <circle 
                            className="transition-all duration-1000 ease-out" 
                            cx="50" 
                            cy="50" 
                            fill="none" 
                            r="44" 
                            stroke="url(#progressGradient)" 
                            strokeDasharray="276.46" 
                            strokeDashoffset={276.46 - (276.46 * summary.completionRate) / 100} 
                            strokeLinecap="round" 
                            strokeWidth="8"
                          ></circle>
                          <defs>
                            <linearGradient id="progressGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                              <stop offset="0%" stopColor="#83103e"></stop>
                              <stop offset="100%" stopColor="#e2a22f"></stop>
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-1">
                          <span className="aksara-serif text-[2.2rem] font-bold text-maroon leading-none">{summary.completionRate}%</span>
                          <span className="text-[11px] text-ink-soft font-bold uppercase tracking-wider mt-1.5">Finished</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-ink mb-1">Tasks Progress</h3>
                        <p className="text-base text-ink-soft">{summary.completed} of {summary.total} completed</p>
                      </div>
                    </div>

                    {/* Middle: Focus Time This Week */}
                    <div className="flex flex-col gap-1.5 text-center md:text-left min-w-[14rem]">
                      <span className="text-sm font-bold text-ink-soft tracking-widest uppercase">FOCUS TIME THIS WEEK</span>
                      <span className="aksara-serif text-[2.8rem] font-bold text-maroon leading-none">
                        {weeklyFocusStats.hours}h {weeklyFocusStats.minutes}m
                      </span>
                      <p className="text-xs text-ink-soft font-semibold mt-1">Accumulated from Pomodoro sessions</p>
                    </div>

                    {/* Right: Velocity Sparkline */}
                    <div className="flex-grow max-w-[16rem] w-full">
                      <div className="flex justify-between items-end h-16 gap-2">
                        {velocityData.map((bar, i) => (
                          <div
                            key={i}
                            className="w-full bg-maroon/30 hover:bg-maroon/70 rounded-t-sm transition-all duration-300 relative group"
                            style={{ height: `${bar.pct}%` }}
                            title={bar.label}
                          >
                            {/* Hover Tooltip showing task count */}
                            <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-maroon bg-surface border border-line/30 px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                              {bar.count} task{bar.count === 1 ? "" : "s"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-ink-soft font-bold uppercase tracking-wider mt-3 block text-center md:text-left">Velocity (Task completions)</span>
                    </div>
                  </div>
                </article>

                <article id="dashboard-courses" className="aksara-card px-7 py-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                        Course overview
                      </p>
                      <h2 className="mt-3 text-[2.35rem] font-semibold leading-none text-ink">
                        {courseCards.length} courses
                      </h2>
                    </div>
                    <button onClick={() => setIsManageCoursesOpen(true)} className="aksara-primary-button px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 whitespace-nowrap rounded-[1rem]">
                      Manage Courses
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-6 gap-3">
                    {courseCards.map((course) => (
                      <article
                        key={course.code}
                        className={`rounded-[1.55rem] border border-line ${course.tint} p-4 shadow-[0_10px_20px_rgba(131,16,62,0.04)]`}
                      >
                        <p className="aksara-mono text-[0.55rem] text-maroon-soft">
                          {course.code}
                        </p>
                        <h3 className="mt-4 text-[1.05rem] font-semibold leading-6 text-ink">
                          {course.title}
                        </h3>
                        <p className="mt-4 text-sm text-ink-soft">
                          {course.pendingTasks} pending / {course.totalTasks} total
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          Next due: {course.nextDueLabel}
                        </p>
                      </article>
                    ))}
                  </div>
                </article>

                <article id="dashboard-tasks" className="aksara-card px-7 py-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                        Sprint board
                      </p>
                      <h2 className="aksara-serif mt-3 text-[3.9rem] leading-[0.88] tracking-[-0.04em] text-ink">
                        Live
                        <br />
                        <span className="italic text-maroon-bright">
                          commitments
                        </span>
                      </h2>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
                      {taskFilterButtons.map((button) => (
                        <button
                          key={button.filter}
                          type="button"
                          onClick={() => setTaskFilter(button.filter)}
                          className={`aksara-chip px-5 py-2.5 text-sm font-semibold transition ${
                            taskFilter === button.filter
                              ? "aksara-chip-active"
                              : "hover:border-line hover:bg-surface"
                          }`}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="grid grid-cols-[minmax(0,2.3fr)_1.2fr_1fr_1fr_1fr_min-content] gap-6 px-2 pb-4 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink-soft">
                      <span>Title</span>
                      <span>Course</span>
                      <span>Type</span>
                      <span>Due</span>
                      <span className="text-right">Time Left</span>
                      <span className="text-right">Status</span>
                    </div>
                    <div className="aksara-divider" />
                    <div className="mt-2 space-y-1">
                      {filteredTasks.length > 0 ? (
                        filteredTasks.map((task) => (
                          <div
                            key={`${task.title}-${task.dueDateIso}`}
                            className="grid grid-cols-[minmax(0,2.3fr)_1.2fr_1fr_1fr_1fr_min-content] gap-6 rounded-[1.5rem] px-2 py-5 transition hover:bg-surface/45"
                          >
                            <div>
                              <h3 className="text-[1.45rem] font-semibold leading-8 text-ink">
                                {task.title}
                              </h3>
                              <p className="mt-1 text-base text-ink-soft">
                                {task.courseTitle}
                              </p>
                            </div>
                            <div className="pt-1">
                              <CoursePill
                                course={task.courseCode}
                                className={
                                  courseStyles.get(task.courseCode) ??
                                  coursePillClasses[0]
                                }
                              />
                            </div>
                            <p className="pt-2 text-lg text-ink-body">{task.type}</p>
                            <div className="pt-2">
                              <p className="text-lg font-semibold text-ink-body">
                                {formatFullDate(task.dueDateIso)}
                              </p>
                              {task.dueTime ? (
                                <p className="mt-1 text-sm font-semibold text-maroon-soft">
                                  {task.dueTime}
                                </p>
                              ) : null}
                            </div>
                            <div className="pt-2 text-right">
                              <span className={`text-lg font-semibold ${getTaskAccent(task, currentTime)} whitespace-nowrap`}>
                                {formatRelativeLabel(task, currentTime)}
                              </span>
                            </div>
                            <div className="pt-2 flex items-center justify-end gap-3.5">
                              {canEditTask(task) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTaskToEdit(task);
                                    setIsModalOpen(true);
                                  }}
                                  className="text-ink-soft hover:text-maroon transition-colors p-1"
                                  title="Edit Task"
                                  aria-label="Edit task"
                                >
                                  <Pencil className="size-4.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggle(task.id, task.completed)}
                                aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                                className={`flex size-[1.35rem] items-center justify-center rounded-[0.4rem] border-[2.5px] transition-colors ${
                                  task.completed 
                                    ? "border-maroon bg-brand text-white" 
                                    : "border-line bg-surface hover:border-maroon"
                                }`}
                              >
                                {task.completed && (
                                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-lg text-ink-soft">
                          No tasks match this filter.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </section>

              <aside className="space-y-7">
                <div id="dashboard-calendar">
                  <CalendarWidget
                    activeDay={calendarData.activeDay}
                    markers={calendarData.markers}
                    monthDate={monthDate}
                    onNextMonth={showNextMonth}
                    onPreviousMonth={showPreviousMonth}
                    tasksByDay={calendarData.tasksByDay}
                  />
                </div>

                <article className="aksara-card p-7">
                  <div className="flex items-center justify-between">
                    <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                      Up next
                    </p>
                    <p className="text-sm font-semibold text-maroon-bright">
                      {timelineTasks.length} item{timelineTasks.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <h2 className="aksara-serif mt-2 text-[3.25rem] leading-none text-ink">
                    Timeline
                  </h2>

                  <div className="mt-7 space-y-6">
                    {timelineTasks.length > 0 ? (
                      timelineTasks.map((task) => {
                        const taskDate = toDate(task.dueDateIso);
                        const relativeHeading =
                          task.daysRemaining === 0
                            ? "Today"
                            : task.daysRemaining === 1
                              ? "Tomorrow"
                              : formatWeekdayLong(taskDate);

                        return (
                          <div
                            key={`${task.title}-${task.dueDateIso}`}
                            className="grid grid-cols-[4.5rem_1fr] gap-4"
                          >
                            <div className="pt-2 text-center">
                              <p className="text-[2rem] font-semibold leading-none text-maroon-bright">
                                {taskDate.getDate()}
                              </p>
                              <p className="aksara-mono mt-2 text-[0.56rem] text-ink-soft">
                                {formatWeekdayShort(taskDate)}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="size-3 rounded-full bg-gold shadow-[0_0_0_5px_rgba(226,162,47,0.18)]" />
                                <h3 className="aksara-serif text-[2.2rem] leading-none text-ink">
                                  {relativeHeading}
                                </h3>
                                <span className="text-sm text-ink-soft">
                                  {formatMonthShort(taskDate)}
                                </span>
                              </div>

                              <div className="aksara-soft-card mt-4 rounded-[1.6rem] px-5 py-4">
                                <div className="flex items-center justify-between gap-3">
                                  <CoursePill
                                    course={task.courseCode}
                                    className={
                                      courseStyles.get(task.courseCode) ??
                                      coursePillClasses[0]
                                    }
                                  />
                                  <div className="text-right">
                                    <p className="text-sm font-semibold leading-5 text-ink-body">
                                      {formatFullDate(task.dueDateIso)}
                                    </p>
                                    <p className="text-sm font-semibold leading-5 text-maroon-soft">
                                      {task.dueTime || task.type}
                                    </p>
                                  </div>
                                </div>
                                <h4 className="mt-4 text-[1.32rem] font-semibold leading-7 text-ink">
                                  {task.title}
                                </h4>
                                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.8rem] gap-3 text-sm text-ink-soft">
                                  <span className="min-w-0 leading-5">
                                    {task.courseTitle}
                                  </span>
                                  <span className="text-right font-semibold leading-5 whitespace-nowrap">
                                    {formatRelativeLabel(task, currentTime)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-base text-ink-soft">
                        No upcoming tasks found.
                      </p>
                    )}
                  </div>
                </article>
              </aside>
                </>
              ) : null}

              {view === "calendar" ? (
                <section className="grid grid-cols-[minmax(0,1fr)_24rem] gap-7">
                  <div className="space-y-7">
                    <article className="aksara-card px-8 py-7">
                      <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                        Calendar
                      </p>
                      <h1 className="aksara-serif mt-3 text-[4.8rem] leading-none text-ink">
                        Live month
                      </h1>
                      <p className="mt-4 max-w-[44rem] text-xl leading-8 text-ink-muted">
                        Hover or focus any marked date to see the tasks due that day.
                      </p>
                    </article>
                    <CalendarWidget
                      activeDay={calendarData.activeDay}
                      markers={calendarData.markers}
                      monthDate={monthDate}
                      onNextMonth={showNextMonth}
                      onPreviousMonth={showPreviousMonth}
                      tasksByDay={calendarData.tasksByDay}
                    />
                  </div>

                  <aside className="aksara-card p-7">
                    <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                      This month
                    </p>
                    <h2 className="aksara-serif mt-2 text-[3.1rem] leading-none text-ink">
                      Due dates
                    </h2>
                    <div className="mt-6 space-y-4">
                      {upcomingTasks.map((task) => (
                        <article
                          key={`${task.title}-${task.dueDateIso}`}
                          className="rounded-[1.3rem] border border-line bg-surface/45 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <CoursePill
                              course={task.courseCode}
                              className={
                                courseStyles.get(task.courseCode) ??
                                coursePillClasses[0]
                              }
                            />
                            <span className={`text-sm font-semibold ${getTaskAccent(task, currentTime)}`}>
                              {formatRelativeLabel(task, currentTime)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold leading-6 text-ink">
                            {task.title}
                          </h3>
                          <p className="mt-2 text-sm text-ink-soft">
                            {formatDueDateTime(task)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </aside>
                </section>
              ) : null}

              {view === "tasks" ? (
                <article className="aksara-card px-8 py-7">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                        Task list
                      </p>
                      <h1 className="aksara-serif mt-3 text-[4.6rem] leading-none text-ink">
                        Live commitments
                      </h1>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
                      <button onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }} className="aksara-primary-button px-5 py-2.5 text-sm font-semibold text-white rounded-[1.2rem] shadow-sm">
                        + Add Task
                      </button>
                      {taskFilterButtons.map((button) => (
                        <button
                          key={button.filter}
                          type="button"
                          onClick={() => setTaskFilter(button.filter)}
                          className={`aksara-chip px-5 py-2.5 text-sm font-semibold transition ${
                            taskFilter === button.filter
                              ? "aksara-chip-active"
                              : "hover:border-line hover:bg-surface"
                          }`}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="grid grid-cols-[minmax(0,2.3fr)_1.2fr_1fr_1fr_1fr_min-content] gap-6 px-2 pb-4 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink-soft">
                      <span>Title</span>
                      <span>Course</span>
                      <span>Type</span>
                      <span>Due</span>
                      <span className="text-right">Time Left</span>
                      <span className="text-right">Status</span>
                    </div>
                    <div className="aksara-divider" />
                    <div className="mt-2 space-y-1">
                      {filteredTasks.length > 0 ? (
                        filteredTasks.map((task) => (
                          <div
                            key={`${task.title}-${task.dueDateIso}`}
                            className="grid grid-cols-[minmax(0,2.3fr)_1.2fr_1fr_1fr_1fr_min-content] gap-6 rounded-[1.5rem] px-2 py-5 transition hover:bg-surface/45"
                          >
                            <div>
                              <h3 className="text-[1.45rem] font-semibold leading-8 text-ink">
                                {task.title}
                              </h3>
                              <p className="mt-1 text-base text-ink-soft">
                                {task.courseTitle}
                              </p>
                            </div>
                            <div className="pt-1">
                              <CoursePill
                                course={task.courseCode}
                                className={
                                  courseStyles.get(task.courseCode) ??
                                  coursePillClasses[0]
                                }
                              />
                            </div>
                            <p className="pt-2 text-lg text-ink-body">{task.type}</p>
                            <div className="pt-2">
                              <p className="text-lg font-semibold text-ink-body">
                                {formatFullDate(task.dueDateIso)}
                              </p>
                              {task.dueTime ? (
                                <p className="mt-1 text-sm font-semibold text-maroon-soft">
                                  {task.dueTime}
                                </p>
                              ) : null}
                            </div>
                            <div className="pt-2 text-right">
                              <span className={`text-lg font-semibold ${getTaskAccent(task, currentTime)} whitespace-nowrap`}>
                                {formatRelativeLabel(task, currentTime)}
                              </span>
                            </div>
                            <div className="pt-2 flex items-center justify-end gap-3.5">
                              {canEditTask(task) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTaskToEdit(task);
                                    setIsModalOpen(true);
                                  }}
                                  className="text-ink-soft hover:text-maroon transition-colors p-1"
                                  title="Edit Task"
                                  aria-label="Edit task"
                                >
                                  <Pencil className="size-4.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggle(task.id, task.completed)}
                                aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                                className={`flex size-[1.35rem] items-center justify-center rounded-[0.4rem] border-[2.5px] transition-colors ${
                                  task.completed 
                                    ? "border-maroon bg-brand text-white" 
                                    : "border-line bg-surface hover:border-maroon"
                                }`}
                              >
                                {task.completed && (
                                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-lg text-ink-soft">
                          No tasks match this filter.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ) : null}

              {view === "courses" ? (
                <section className="space-y-7">
                  <article className="aksara-card px-8 py-7">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="aksara-mono text-[0.64rem] text-maroon-soft">
                          Course overview
                        </p>
                        <h1 className="aksara-serif mt-3 text-[4.6rem] leading-none text-ink">
                          {courseCards.length} courses
                        </h1>
                        <p className="mt-4 max-w-[44rem] text-xl leading-8 text-ink-muted">
                          A list of every course currently tracked.
                        </p>
                      </div>
                      <button onClick={() => setIsManageCoursesOpen(true)} className="aksara-primary-button px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 whitespace-nowrap rounded-[1rem]">
                        Manage Courses
                      </button>
                    </div>
                  </article>

                  <div className="grid grid-cols-4 gap-5">
                    {courseCards.map((course) => (
                      <article
                        key={course.code}
                        className={`rounded-[1.55rem] border border-line ${course.tint} p-5 shadow-[0_10px_20px_rgba(131,16,62,0.04)]`}
                      >
                        <p className="aksara-mono text-[0.56rem] text-maroon-soft">
                          {course.code}
                        </p>
                        <h2 className="mt-4 text-[1.35rem] font-semibold leading-7 text-ink">
                          {course.title}
                        </h2>
                        <p className="mt-4 text-base text-ink-soft">
                          {course.pendingTasks} pending / {course.totalTasks} total
                        </p>
                        <p className="mt-2 text-sm font-semibold text-maroon-soft">
                          Next due: {course.nextDueLabel}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {view === "focus" && isDesktop ? (
                <FocusTimerView tasks={tasks} courses={courses} focusLogs={focusLogs} onRefresh={refresh} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[28rem] lg:hidden">
        <div className="px-2 pb-28 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          {view === "dashboard" ? (
            <section>
              <MobileTopBar
                meta={syncLabel}
                title={greetingLabel}
                accent={`${userProfile?.name || "Student"}.`}
                userProfile={userProfile}
                onOpenSettings={openSettings}
                onLogout={handleLogout}
              />

              <article className="aksara-card mt-8 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="aksara-mono text-[0.58rem] text-maroon-soft">
                    Next deadline
                  </p>
                  <p className="aksara-mono text-[0.58rem] text-ink-soft">
                    {nextTask ? formatDueDateTime(nextTask) : "No due date"}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-[1.2rem] font-semibold leading-7 text-ink">
                    {nextTask ? nextTask.title : "No pending tasks"}
                  </p>
                  <p className="mt-2 text-base text-ink-soft">
                    {nextTask
                      ? `${nextTask.courseCode} / ${nextTask.type}`
                      : "Your workspace currently has no active schedule items."}
                  </p>
                </div>
                <div className="mt-5 h-2.5 rounded-full bg-[#f2e1d8]">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#d9a130] to-maroon-bright"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(16, summary.total === 0 ? 16 : (summary.pending / summary.total) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
                  <span>{summary.pending} pending</span>
                  <span>
                    {nextTask ? formatRelativeLabel(nextTask, currentTime) : "All clear"}
                  </span>
                </div>
              </article>

              <article className="aksara-card mt-5 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="aksara-mono text-[0.58rem] text-maroon-soft">
                    Workspace summary
                  </p>
                  <p className="text-sm text-ink-soft">{summary.total} total</p>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-[2.15rem] font-semibold text-maroon-bright">
                      {summary.urgent}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-ink-soft">
                      Urgent
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-gold">
                      {summary.dueSoon}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-ink-soft">
                      Due Soon
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-maroon-soft">
                      {summary.upcoming}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-ink-soft">
                      Upcoming
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-maroon-bright">
                      {summary.group}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-ink-soft">
                      Group
                    </p>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {view === "calendar" ? (
            <section>
              <MobileTopBar
                meta="Live schedule month"
                title="Calendar"
                userProfile={userProfile}
                onOpenSettings={openSettings}
                onLogout={handleLogout}
              />
              <div className="mt-7">
                <CalendarWidget
                  activeDay={calendarData.activeDay}
                  compact
                  markers={calendarData.markers}
                  monthDate={monthDate}
                  onNextMonth={showNextMonth}
                  onPreviousMonth={showPreviousMonth}
                  tasksByDay={calendarData.tasksByDay}
                />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="aksara-mono text-[0.58rem] text-maroon-soft">
                    Today
                  </p>
                  <h2 className="aksara-serif mt-2 text-[2.4rem] leading-none text-ink">
                    Today&apos;s deadlines
                  </h2>
                </div>
                {todayTasks.length > 0 ? (
                  todayTasks.map((task) => (
                    <MobileTaskCard
                      key={`${task.title}-${task.dueDateIso}`}
                      pillClassName={
                        courseStyles.get(task.courseCode) ?? coursePillClasses[0]
                      }
                      task={task}
                      onToggle={() => handleToggle(task.id, task.completed)}
                      onEdit={
                        canEditTask(task)
                          ? () => {
                              setTaskToEdit(task);
                              setIsModalOpen(true);
                            }
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <article className="aksara-card rounded-[1.8rem] px-5 py-5 text-ink-soft">
                    Nothing is due today.
                  </article>
                )}

                <div>
                  <p className="aksara-mono text-[0.58rem] text-maroon-soft">
                    This week
                  </p>
                  <h2 className="aksara-serif mt-2 text-[2.2rem] leading-none text-ink">
                    Upcoming deadlines
                  </h2>
                </div>
                {upcomingTasks.slice(0, 2).map((task) => (
                  <MobileTaskCard
                    key={`${task.title}-${task.dueDateIso}`}
                    pillClassName={
                      courseStyles.get(task.courseCode) ?? coursePillClasses[0]
                    }
                    task={task}
                    onToggle={() => handleToggle(task.id, task.completed)}
                    onEdit={
                      canEditTask(task)
                        ? () => {
                            setTaskToEdit(task);
                            setIsModalOpen(true);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {view === "tasks" ? (
            <section>
              <MobileTopBar
                meta="Academic OS / Tasks"
                title="All"
                accent="tasks."
                userProfile={userProfile}
                onOpenSettings={openSettings}
                onLogout={handleLogout}
              />
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="aksara-primary-button flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  <Pencil className="size-3.5" />
                  Add Task
                </button>
              </div>

              <article className="aksara-card mt-5 px-5 py-4">
                <div className="grid grid-cols-3 divide-x divide-[#edd9de] text-center">
                  <div>
                    <p className="text-[2.15rem] font-semibold text-maroon-bright">
                      {summary.pending}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-ink-soft">
                      Pending
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-gold">
                      {summary.completed}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-ink-soft">
                      Done
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-maroon-soft">
                      {summary.group}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-ink-soft">
                      Group
                    </p>
                  </div>
                </div>
              </article>

              <div className="mt-5 flex flex-wrap gap-3">
                {taskFilterButtons.map((button) => (
                  <button
                    key={button.filter}
                    type="button"
                    onClick={() => setTaskFilter(button.filter)}
                    className={`aksara-chip px-5 py-2.5 text-sm font-semibold transition ${
                      taskFilter === button.filter
                        ? "aksara-chip-active"
                        : "hover:border-line hover:bg-surface"
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-4">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <MobileTaskCard
                      key={`${task.title}-${task.dueDateIso}`}
                      pillClassName={
                        courseStyles.get(task.courseCode) ?? coursePillClasses[0]
                      }
                      task={task}
                      onToggle={() => handleToggle(task.id, task.completed)}
                      onEdit={
                        canEditTask(task)
                          ? () => {
                              setTaskToEdit(task);
                              setIsModalOpen(true);
                            }
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <article className="aksara-card rounded-[1.8rem] px-5 py-5 text-ink-soft">
                    No tasks match this filter.
                  </article>
                )}
              </div>
            </section>
          ) : null}

          {view === "courses" ? (
            <section>
              <MobileTopBar
                meta="Academic OS / Courses"
                title="Your"
                accent="courses."
                userProfile={userProfile}
                onOpenSettings={openSettings}
                onLogout={handleLogout}
              />
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageCoursesOpen(true)}
                  className="aksara-primary-button flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  <Pencil className="size-3.5" />
                  Manage
                </button>
              </div>

              <article className="aksara-card mt-5 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="aksara-mono text-[0.58rem] text-maroon-soft">
                    Enrolled
                  </p>
                  <p className="text-sm text-ink-soft">{courseCards.length} courses</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {courseCards.map((course) => (
                    <article
                      key={course.code}
                      className={`rounded-[1.4rem] border border-line ${course.tint} p-4`}
                    >
                      <p className="aksara-mono text-[0.52rem] text-maroon-soft">
                        {course.code}
                      </p>
                      <h2 className="mt-3 text-base font-semibold leading-5 text-ink line-clamp-2 break-words">
                        {course.title}
                      </h2>
                      <p className="mt-3 text-sm text-ink-soft">
                        {course.pendingTasks} pending / {course.totalTasks} total
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        Next due: {course.nextDueLabel}
                      </p>
                    </article>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          {view === "focus" ? (
            <section>
              <MobileTopBar
                meta="Focus pomodoro timer"
                title="Focus"
                accent="timer."
                userProfile={userProfile}
                onOpenSettings={openSettings}
                onLogout={handleLogout}
              />
              <div className="mt-7">
                {!isDesktop ? (
                  <FocusTimerView tasks={tasks} courses={courses} focusLogs={focusLogs} onRefresh={refresh} />
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:hidden">
          <nav className="aksara-mobile-tabbar pointer-events-auto w-full max-w-[25rem] px-3 py-3">
        <div className="grid grid-cols-5 gap-0">
              {mobileTabs.map((item) => {
                const Icon = item.icon;
                const active = view === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleDesktopNavigation(item.key)}
                    className={`flex flex-col items-center gap-1 rounded-[0.85rem] px-0.5 py-2 text-[9px] font-semibold tracking-tight ${
                      active ? "text-maroon-bright" : "text-ink-soft"
                    }`}
                  >
                    <Icon className="size-[1.1rem]" />
                    <span className="truncate w-full text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </main>
  );
}
