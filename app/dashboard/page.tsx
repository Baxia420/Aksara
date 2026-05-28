"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { toggleTaskCompletion } from "@/app/actions";
import { AddTaskModal } from "@/components/AddTaskModal";
import { ManageCoursesModal } from "@/components/ManageCoursesModal";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  ListTodo,
  Search,
  TriangleAlert,
} from "lucide-react";

type MobileView = "dashboard" | "calendar" | "tasks" | "courses";
type MarkerTone = "overdue" | "due" | "upcoming";
type TaskFilter = "pending" | "group" | "urgent" | "completed";

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

type AcademicCourse = {
  id: string;
  code: string;
  title: string;
  colorIndex: number;
};

type DashboardApiResponse =
  | {
      sourceUrl: string;
      syncedAt: string;
      tasks: AcademicTask[];
      courses: AcademicCourse[];
    }
  | {
      message: string;
    };

type CourseCard = {
  code: string;
  nextDueLabel: string;
  pendingTasks: number;
  pillClassName: string;
  tint: string;
  title: string;
  totalTasks: number;
};

const courseTints = [
  "bg-[#fbf4f1]",
  "bg-[#fdf8f4]",
  "bg-[#eef4f7]",
  "bg-[#eff3f7]",
  "bg-[#f8f7f3]",
  "bg-[#fcf4e7]",
];

const coursePillClasses = [
  "border-[#dfb1c1] bg-[#fff7fa] text-[#9f4568]",
  "border-[#eac08a] bg-[#fffaf1] text-[#b87b26]",
  "border-[#a2c7eb] bg-[#f4fbff] text-[#467db6]",
  "border-[#b9c8ec] bg-[#f5f8ff] text-[#5d75b3]",
  "border-[#d7cfb7] bg-[#fcfbf5] text-[#7e6f3f]",
  "border-[#f1d5a2] bg-[#fff8ec] text-[#ad7d1c]",
];

const mobileTabs: Array<{
  icon: React.ComponentType<{ className?: string }>;
  key: MobileView;
  label: string;
}> = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "courses", label: "Courses", icon: BookOpen },
];

const desktopSidebar = [
  { key: "dashboard", label: "Home", title: "Dashboard", icon: Home },
  { key: "calendar", label: "Calendar", title: "Calendar", icon: CalendarDays },
  { key: "tasks", label: "Tasks", title: "Task list", icon: ListTodo },
  { key: "courses", label: "Courses", title: "Courses overview", icon: BookOpen },
] satisfies Array<{
  icon: React.ComponentType<{ className?: string }>;
  key: MobileView;
  label: string;
  title: string;
}>;

const dashboardRoutes: Record<MobileView, string> = {
  dashboard: "/dashboard",
  calendar: "/dashboard/calendar",
  tasks: "/dashboard/tasks",
  courses: "/dashboard/courses",
};

const markerLabels: Record<MarkerTone, string> = {
  overdue: "Overdue",
  due: "Due soon",
  upcoming: "Upcoming",
};

const markerClassNames: Record<MarkerTone, string> = {
  overdue: "bg-[#a91c58]",
  due: "bg-[#d89d2c]",
  upcoming: "bg-[#c9839d]",
};

function toDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatFullDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(toDate(isoDate));
}

function formatDueDateTime(task: AcademicTask) {
  return task.dueTime
    ? `${formatFullDate(task.dueDateIso)} / ${task.dueTime}`
    : formatFullDate(task.dueDateIso);
}

function formatDashboardDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    weekday: "long",
    year: "numeric",
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("weekday")} / ${getPart("day")} ${getPart(
    "month",
  )} ${getPart("year")}`.toUpperCase();
}

function getGreeting(date: Date) {
  const hour = date.getHours();

  if (hour < 5) {
    return "Good night";
  }

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getViewFromPathname(pathname: string): MobileView {
  if (pathname.endsWith("/calendar")) {
    return "calendar";
  }

  if (pathname.endsWith("/tasks")) {
    return "tasks";
  }

  if (pathname.endsWith("/courses")) {
    return "courses";
  }

  return "dashboard";
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMonthShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatWeekdayShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatWeekdayLong(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

function formatRelativeLabel(daysRemaining: number) {
  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
  }

  if (daysRemaining === 0) {
    return "Today";
  }

  if (daysRemaining === 1) {
    return "Tomorrow";
  }

  return `${daysRemaining} days left`;
}

function getTaskTone(task: AcademicTask): MarkerTone {
  if (task.daysRemaining < 0) {
    return "overdue";
  }

  if (task.daysRemaining <= 3) {
    return "due";
  }

  return "upcoming";
}

function getTaskAccent(task: AcademicTask) {
  if (task.completed) {
    return "text-[#6f5b64]";
  }

  if (task.daysRemaining < 0) {
    return "text-[#a31657]";
  }

  if (task.daysRemaining <= 3) {
    return "text-[#b87b26]";
  }

  return "text-[#7d656f]";
}

function BrandGlyph({ size = "default" }: { size?: "default" | "small" }) {
  const classes =
    size === "small"
      ? "size-11 rounded-[1.1rem]"
      : "size-14 rounded-[1.15rem]";

  return (
    <div
      className={`${classes} flex items-center justify-center bg-[#83103e] text-[#e2a22f] shadow-[0_12px_28px_rgba(131,16,62,0.18)]`}
    >
      <TriangleAlert className={size === "small" ? "size-5" : "size-6"} />
    </div>
  );
}

function BrandLockup() {
  return (
    <Link href="/" className="flex items-center gap-4">
      <BrandGlyph />
      <div>
        <p className="aksara-serif text-[2rem] font-semibold leading-none text-[#83103e]">
          Aksara
        </p>
        <p className="aksara-mono mt-1 text-[0.58rem] text-[#b07a88]">
          Academic OS
        </p>
      </div>
    </Link>
  );
}

function IconCircle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`aksara-icon-button size-12 rounded-[1rem] ${className}`}>
      {children}
    </div>
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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold tracking-[0.08em] ${className}`}
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
          <h2 className={`aksara-serif ${headingClass} text-[#2b1b22]`}>
            {formatMonthYear(monthDate).split(" ")[0]}{" "}
            <span className="text-[#9e2555]">{year}</span>
          </h2>
          <p className="aksara-mono mt-2 text-[0.58rem] text-[#9f8b93]">
            Live schedule month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="aksara-icon-button size-9 rounded-full transition hover:border-[#d8b7c0] hover:bg-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="aksara-icon-button size-9 rounded-full transition hover:border-[#d8b7c0] hover:bg-white"
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
            className="aksara-mono text-[0.55rem] text-[#9b8790]"
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
                        ? "bg-[#9e2555] text-[#fff5f7] shadow-[0_10px_20px_rgba(131,16,62,0.22)]"
                        : "text-[#46333b]"
                    } ${
                      hasDayTasks
                        ? "cursor-pointer transition hover:bg-[#fff3f7] hover:text-[#9e2555] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b22c67]"
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
                    <div className="pointer-events-none absolute left-1/2 top-12 z-30 hidden w-64 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-[1.15rem] border border-[#ecd9de] bg-[#fffaf6] p-4 text-left shadow-[0_18px_34px_rgba(131,16,62,0.14)] group-hover:block group-focus-within:block">
                      <p className="aksara-mono text-[0.52rem] text-[#b24e72]">
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
                                <span className="text-xs font-semibold text-[#9e2555]">
                                  {task.courseCode}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-[#8a747e]">
                                  <span
                                    className={`size-1.5 rounded-full ${markerClassNames[tone]}`}
                                  />
                                  {markerLabels[tone]}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold leading-5 text-[#2c1d24]">
                                {task.title}
                              </p>
                              <p className="mt-1 text-xs text-[#86717b]">
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
      <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#8a747e]">
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

function MobileTopBar({
  meta,
  title,
  accent,
}: {
  accent?: string;
  meta: string;
  title: string;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="aksara-mono text-[0.6rem] text-[#a14a6a]">{meta}</p>
          <h1 className="aksara-serif mt-2 text-[3.45rem] leading-[0.82] tracking-[-0.04em] text-[#24161d]">
            {title}
            {accent ? (
              <>
                <br />
                <span className="italic text-[#b23d6b]">{accent}</span>
              </>
            ) : null}
          </h1>
        </div>
        <div className="flex items-center gap-3 pt-3">
          <IconCircle>
            <Bell className="size-4.5" />
          </IconCircle>
          <div className="flex size-12 items-center justify-center rounded-full bg-[#e2a22f] text-sm font-bold text-[#7b173d] shadow-[0_10px_24px_rgba(226,162,47,0.28)]">
            J
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileTaskCard({
  pillClassName,
  task,
}: {
  pillClassName: string;
  task: AcademicTask;
}) {
  return (
    <article className="aksara-card rounded-[1.8rem] px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <CoursePill course={task.courseCode} className={pillClassName} />
        <p className={`text-sm font-semibold ${getTaskAccent(task)}`}>
          {formatRelativeLabel(task.daysRemaining)}
        </p>
      </div>
      <h3 className="mt-4 text-[1.38rem] font-semibold leading-8 text-[#2c1d24]">
        {task.title}
      </h3>
      <div className="mt-3 text-sm text-[#8a747e]">{task.courseTitle}</div>
      <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#826d76]">
        <p>{formatDueDateTime(task)}</p>
        <p className="font-semibold text-[#8a6574]">
          {task.completed ? "Completed" : task.type}
        </p>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const desktopView = getViewFromPathname(pathname);
  const mobileView = desktopView;
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("pending");
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [isManageCoursesOpen, setIsManageCoursesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  const loadSheetData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/academic-sheet", {
        cache: "no-store",
      });
      const data = (await response.json()) as DashboardApiResponse;

      if (!response.ok || "message" in data) {
        throw new Error(
          "message" in data ? data.message : "Unable to load data.",
        );
      }

      setTasks(data.tasks);
      setCourses(data.courses || []);
      setSyncedAt(data.syncedAt);
      setSourceUrl(data.sourceUrl);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSheetData();
  }, [loadSheetData]);

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

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const group = pendingTasks.filter((task) =>
      task.type.toLowerCase().includes("group"),
    ).length;
    const urgent = pendingTasks.filter((task) => task.daysRemaining <= 2).length;
    const dueSoon = pendingTasks.filter(
      (task) => task.daysRemaining > 2 && task.daysRemaining <= 7,
    ).length;
    const upcoming = pendingTasks.filter((task) => task.daysRemaining > 7).length;

    return {
      completed,
      completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
      dueSoon,
      group,
      pending: pendingTasks.length,
      total,
      upcoming,
      urgent,
    };
  }, [pendingTasks, tasks]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "group") {
      return pendingTasks.filter((task) =>
        task.type.toLowerCase().includes("group"),
      );
    }

    if (taskFilter === "urgent") {
      return pendingTasks.filter((task) => task.daysRemaining <= 2);
    }

    if (taskFilter === "completed") {
      return tasks.filter((task) => task.completed);
    }

    return pendingTasks;
  }, [pendingTasks, taskFilter, tasks]);

  const taskFilterButtons: Array<{
    filter: TaskFilter;
    label: string;
  }> = [
    { filter: "pending", label: `Pending: ${summary.pending}` },
    { filter: "group", label: `Group: ${summary.group}` },
    { filter: "urgent", label: `Urgent: ${summary.urgent}` },
    { filter: "completed", label: `Done: ${summary.completed}` },
  ];

  const greetingText = useMemo(() => {
    if (isLoading) {
      return "Syncing your academic tracker from Google Sheets.";
    }

    if (error) {
      return error;
    }

    if (pendingTasks.length === 0) {
      return "No active deadlines were found.";
    }

    if (pendingTasks.length === 1) {
      return "1 active deadline is currently tracked.";
    }

    return `${pendingTasks.length} active deadlines are currently tracked.`;
  }, [error, isLoading, pendingTasks.length]);

  const syncLabel = useMemo(() => {
    if (error) {
      return "Sheet sync failed";
    }

    if (isLoading || !syncedAt) {
      return "Loading tasks";
    }

    return `Synced ${new Date(syncedAt).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [error, isLoading, syncedAt]);

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
  const handleDesktopNavigation = (view: MobileView) => {
    router.push(dashboardRoutes[view]);
  };

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6 lg:py-6">
      <AddTaskModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); void loadSheetData(); }} tasks={tasks} courses={courses} />
      <ManageCoursesModal isOpen={isManageCoursesOpen} onClose={() => { setIsManageCoursesOpen(false); void loadSheetData(); }} onRefresh={() => { void loadSheetData(); }} courses={courses} />
      {taskToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm">
          <div className="aksara-card w-full max-w-sm p-8 text-center rounded-[1.8rem]">
            <h3 className="aksara-serif text-2xl font-semibold mb-3 text-[#26171e]">Complete Task?</h3>
            <p className="text-[#8f7881] mb-6">Are you sure you want to mark this task as completed?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setTaskToConfirm(null)} className="px-5 py-2.5 font-semibold text-[#8f7881] hover:text-[#26171e] transition rounded-[0.85rem]">
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
                const active = desktopView === item.key;

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
                <div className="hidden h-8 w-px bg-[#dcc9cf] xl:block" />
              </div>

              <div className="flex items-center gap-4">
                <div className="aksara-soft-card flex h-16 w-[32rem] max-w-[42vw] items-center gap-3 rounded-[1.3rem] px-5">
                  <Search className="size-4 text-[#9e8b93]" />
                  <input
                    type="text"
                    placeholder="Live sheet search coming soon..."
                    className="min-w-0 flex-1 bg-transparent text-base text-[#544149] outline-none placeholder:text-[#a4939b]"
                  />
                  <div className="rounded-lg border border-[#ecdde0] px-2 py-1 text-xs font-semibold text-[#9a8790]">
                    CSV
                  </div>
                </div>
                <IconCircle className="size-14 rounded-full">
                  <Bell className="size-4.5" />
                </IconCircle>
                <div className="flex size-14 items-center justify-center rounded-full border border-[#edd9de] bg-white text-sm font-bold text-[#a31657] shadow-[0_10px_24px_rgba(131,16,62,0.07)]">
                  J
                </div>
              </div>
            </header>

            <div
              className={`mt-7 ${
                desktopView === "dashboard"
                  ? "grid grid-cols-[minmax(0,1.75fr)_24rem] gap-7"
                  : ""
              }`}
            >
              {desktopView === "dashboard" ? (
                <>
              <section className="space-y-7">
                <article id="dashboard-home" className="aksara-card px-10 py-9">
                  <p className="aksara-mono text-[0.66rem] text-[#b24e72]">
                    {dashboardDateLabel} / {syncLabel}
                  </p>
                  <h1 className="aksara-serif mt-3 text-[4.8rem] leading-[0.94] tracking-[-0.05em] text-[#26171e]">
                    {greetingLabel},{" "}
                    <span className="italic text-[#a31657]">Jobayer.</span>
                  </h1>
                  <p className="mt-4 max-w-[44rem] text-[1.55rem] leading-10 text-[#5d4d55]">
                    <span className="font-semibold text-[#a31657]">
                      {summary.pending} pending
                    </span>{" "}
                    task{summary.pending === 1 ? "" : "s"} on your schedule.{" "}
                    {greetingText}
                  </p>
                </article>

                <article id="dashboard-courses" className="aksara-card px-7 py-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="aksara-mono text-[0.64rem] text-[#b24e72]">
                        Course overview
                      </p>
                      <h2 className="mt-3 text-[2.35rem] font-semibold leading-none text-[#291920]">
                        {courseCards.length} courses, {summary.total} tracked items
                      </h2>
                    </div>
                    <button onClick={() => setIsManageCoursesOpen(true)} className="aksara-chip px-4 py-2 text-xs font-semibold hover:border-[#d8b7c0] hover:bg-white transition whitespace-nowrap">
                      Manage Courses
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-6 gap-3">
                    {courseCards.map((course) => (
                      <article
                        key={course.code}
                        className={`rounded-[1.55rem] border border-[#ecd9de] ${course.tint} p-4 shadow-[0_10px_20px_rgba(131,16,62,0.04)]`}
                      >
                        <p className="aksara-mono text-[0.55rem] text-[#a94f6d]">
                          {course.code}
                        </p>
                        <h3 className="mt-4 text-[1.05rem] font-semibold leading-6 text-[#2f1f26]">
                          {course.title}
                        </h3>
                        <p className="mt-4 text-sm text-[#88737d]">
                          {course.pendingTasks} pending / {course.totalTasks} total
                        </p>
                        <p className="mt-1 text-sm text-[#9a858e]">
                          Next due: {course.nextDueLabel}
                        </p>
                      </article>
                    ))}
                  </div>
                </article>

                <article id="dashboard-tasks" className="aksara-card px-7 py-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="aksara-mono text-[0.64rem] text-[#b24e72]">
                        Sprint board
                      </p>
                      <h2 className="aksara-serif mt-3 text-[3.9rem] leading-[0.88] tracking-[-0.04em] text-[#26171e]">
                        Live
                        <br />
                        <span className="italic text-[#9b174b]">
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
                              : "hover:border-[#d8b7c0] hover:bg-white"
                          }`}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="grid grid-cols-[minmax(0,2.3fr)_1.2fr_1fr_1fr_1fr_min-content] gap-6 px-2 pb-4 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#9b8790]">
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
                            className="grid grid-cols-[minmax(0,2.3fr)_1fr_1fr_1fr_1fr] gap-6 rounded-[1.5rem] px-2 py-5 transition hover:bg-white/45"
                          >
                            <div>
                              <h3 className="text-[1.45rem] font-semibold leading-8 text-[#2c1d24]">
                                {task.title}
                              </h3>
                              <p className="mt-1 text-base text-[#8a747e]">
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
                            <p className="pt-2 text-lg text-[#6b5861]">{task.type}</p>
                            <div className="pt-2">
                              <p className="text-lg font-semibold text-[#7d656f]">
                                {formatFullDate(task.dueDateIso)}
                              </p>
                              {task.dueTime ? (
                                <p className="mt-1 text-sm font-semibold text-[#a14a6a]">
                                  {task.dueTime}
                                </p>
                              ) : null}
                            </div>
                            <div className="pt-2 flex justify-end">
                              <label className="cursor-pointer flex items-center gap-3">
                                <span className={`text-lg font-semibold ${getTaskAccent(task)}`}>
                                  {formatRelativeLabel(task.daysRemaining)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggle(task.id, task.completed)}
                                  className={`flex size-[1.35rem] items-center justify-center rounded-[0.4rem] border-[2.5px] transition-colors ${
                                    task.completed 
                                      ? "border-[#83103e] bg-[#83103e] text-white" 
                                      : "border-[#dcc9cf] bg-white hover:border-[#83103e]"
                                  }`}
                                >
                                  {task.completed && (
                                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              </label>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-lg text-[#7d6872]">
                            {isLoading
                              ? "Loading tasks..."
                              : "No tasks match this filter."}
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
                    <p className="aksara-mono text-[0.64rem] text-[#b24e72]">
                      Up next
                    </p>
                    <p className="text-sm font-semibold text-[#a31657]">
                      {timelineTasks.length} item{timelineTasks.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <h2 className="aksara-serif mt-2 text-[3.25rem] leading-none text-[#26171e]">
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
                              <p className="text-[2rem] font-semibold leading-none text-[#b22c67]">
                                {taskDate.getDate()}
                              </p>
                              <p className="aksara-mono mt-2 text-[0.56rem] text-[#9f8b93]">
                                {formatWeekdayShort(taskDate)}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="size-3 rounded-full bg-[#e2a22f] shadow-[0_0_0_5px_rgba(226,162,47,0.18)]" />
                                <h3 className="aksara-serif text-[2.2rem] leading-none text-[#26171e]">
                                  {relativeHeading}
                                </h3>
                                <span className="text-sm text-[#8f7881]">
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
                                    <p className="text-sm font-semibold leading-5 text-[#7d656f]">
                                      {formatFullDate(task.dueDateIso)}
                                    </p>
                                    <p className="text-sm font-semibold leading-5 text-[#a14a6a]">
                                      {task.dueTime || task.type}
                                    </p>
                                  </div>
                                </div>
                                <h4 className="mt-4 text-[1.32rem] font-semibold leading-7 text-[#2c1d24]">
                                  {task.title}
                                </h4>
                                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.8rem] gap-3 text-sm text-[#86717b]">
                                  <span className="min-w-0 leading-5">
                                    {task.courseTitle}
                                  </span>
                                  <span className="text-right font-semibold leading-5">
                                    {formatRelativeLabel(task.daysRemaining)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-base text-[#7d6872]">
                        {isLoading
                          ? "Looking up upcoming tasks..."
                          : "No upcoming tasks found."}
                      </p>
                    )}
                  </div>
                </article>
              </aside>
                </>
              ) : null}

              {desktopView === "calendar" ? (
                <section className="grid grid-cols-[minmax(0,1fr)_24rem] gap-7">
                  <div className="space-y-7">
                    <article className="aksara-card px-8 py-7">
                      <p className="aksara-mono text-[0.64rem] text-[#b24e72]">
                        Calendar
                      </p>
                      <h1 className="aksara-serif mt-3 text-[4.8rem] leading-none text-[#26171e]">
                        Live month
                      </h1>
                      <p className="mt-4 max-w-[44rem] text-xl leading-8 text-[#6f5b64]">
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
                    <p className="aksara-mono text-[0.64rem] text-[#b24e72]">
                      This month
                    </p>
                    <h2 className="aksara-serif mt-2 text-[3.1rem] leading-none text-[#26171e]">
                      Due dates
                    </h2>
                    <div className="mt-6 space-y-4">
                      {upcomingTasks.map((task) => (
                        <article
                          key={`${task.title}-${task.dueDateIso}`}
                          className="rounded-[1.3rem] border border-[#ecd9de] bg-white/45 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <CoursePill
                              course={task.courseCode}
                              className={
                                courseStyles.get(task.courseCode) ??
                                coursePillClasses[0]
                              }
                            />
                            <span className={`text-sm font-semibold ${getTaskAccent(task)}`}>
                              {formatRelativeLabel(task.daysRemaining)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold leading-6 text-[#2c1d24]">
                            {task.title}
                          </h3>
                          <p className="mt-2 text-sm text-[#86717b]">
                            {formatDueDateTime(task)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </aside>
                </section>
              ) : null}

              {desktopView === "tasks" ? (
                <article className="aksara-card px-8 py-7">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="aksara-mono text-[0.64rem] text-[#b24e72]">
                        Task list
                      </p>
                      <h1 className="aksara-serif mt-3 text-[4.6rem] leading-none text-[#26171e]">
                        Live commitments
                      </h1>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
                      <button onClick={() => setIsModalOpen(true)} className="aksara-primary-button px-5 py-2.5 text-sm font-semibold text-white rounded-[1.2rem] shadow-sm">
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
                              : "hover:border-[#d8b7c0] hover:bg-white"
                          }`}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="grid grid-cols-[minmax(0,2.3fr)_1.2fr_1fr_1fr_1fr_min-content] gap-6 px-2 pb-4 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#9b8790]">
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
                            className="grid grid-cols-[minmax(0,2.3fr)_1.2fr_1fr_1fr_1fr_min-content] gap-6 rounded-[1.5rem] px-2 py-5 transition hover:bg-white/45"
                          >
                            <div>
                              <h3 className="text-[1.45rem] font-semibold leading-8 text-[#2c1d24]">
                                {task.title}
                              </h3>
                              <p className="mt-1 text-base text-[#8a747e]">
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
                            <p className="pt-2 text-lg text-[#6b5861]">{task.type}</p>
                            <div className="pt-2">
                              <p className="text-lg font-semibold text-[#7d656f]">
                                {formatFullDate(task.dueDateIso)}
                              </p>
                              {task.dueTime ? (
                                <p className="mt-1 text-sm font-semibold text-[#a14a6a]">
                                  {task.dueTime}
                                </p>
                              ) : null}
                            </div>
                            <div className="pt-2 text-right">
                              <span className={`text-lg font-semibold ${getTaskAccent(task)} whitespace-nowrap`}>
                                {formatRelativeLabel(task.daysRemaining)}
                              </span>
                            </div>
                            <div className="pt-2 flex justify-end">
                              <label className="cursor-pointer flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggle(task.id, task.completed)}
                                  className={`flex size-[1.35rem] items-center justify-center rounded-[0.4rem] border-[2.5px] transition-colors ${
                                    task.completed 
                                      ? "border-[#83103e] bg-[#83103e] text-white" 
                                      : "border-[#dcc9cf] bg-white hover:border-[#83103e]"
                                  }`}
                                >
                                  {task.completed && (
                                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              </label>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-lg text-[#7d6872]">
                          {isLoading
                            ? "Loading tasks..."
                            : "No tasks match this filter."}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ) : null}

              {desktopView === "courses" ? (
                <section className="space-y-7">
                  <article className="aksara-card px-8 py-7">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="aksara-mono text-[0.64rem] text-[#b24e72]">
                          Course overview
                        </p>
                        <h1 className="aksara-serif mt-3 text-[4.6rem] leading-none text-[#26171e]">
                          {courseCards.length} courses
                        </h1>
                        <p className="mt-4 max-w-[44rem] text-xl leading-8 text-[#6f5b64]">
                          A list of every course currently tracked.
                        </p>
                      </div>
                      <button onClick={() => setIsManageCoursesOpen(true)} className="aksara-chip px-5 py-2.5 text-sm font-semibold hover:border-[#d8b7c0] hover:bg-white transition whitespace-nowrap">
                        Manage Courses
                      </button>
                    </div>
                  </article>

                  <div className="grid grid-cols-4 gap-5">
                    {courseCards.map((course) => (
                      <article
                        key={course.code}
                        className={`rounded-[1.55rem] border border-[#ecd9de] ${course.tint} p-5 shadow-[0_10px_20px_rgba(131,16,62,0.04)]`}
                      >
                        <p className="aksara-mono text-[0.56rem] text-[#a94f6d]">
                          {course.code}
                        </p>
                        <h2 className="mt-4 text-[1.35rem] font-semibold leading-7 text-[#2f1f26]">
                          {course.title}
                        </h2>
                        <p className="mt-4 text-base text-[#88737d]">
                          {course.pendingTasks} pending / {course.totalTasks} total
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#9a5570]">
                          Next due: {course.nextDueLabel}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[28rem] lg:hidden">
        <div className="px-2 pb-28 pt-6">
          {mobileView === "dashboard" ? (
            <section>
              <MobileTopBar
                meta={syncLabel}
                title={`${greetingLabel},`}
                accent="Jobayer."
              />

              <article className="aksara-card mt-8 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="aksara-mono text-[0.58rem] text-[#b24e72]">
                    Next deadline
                  </p>
                  <p className="aksara-mono text-[0.58rem] text-[#9f8b93]">
                    {nextTask ? formatDueDateTime(nextTask) : "No due date"}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-[1.2rem] font-semibold leading-7 text-[#2c1d24]">
                    {nextTask ? nextTask.title : "No pending tasks"}
                  </p>
                  <p className="mt-2 text-base text-[#7d6872]">
                    {nextTask
                      ? `${nextTask.courseCode} / ${nextTask.type}`
                      : "Your sheet currently has no active schedule items."}
                  </p>
                </div>
                <div className="mt-5 h-2.5 rounded-full bg-[#f2e1d8]">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#d9a130] to-[#9e2555]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(16, summary.total === 0 ? 16 : (summary.pending / summary.total) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-[#917b84]">
                  <span>{summary.pending} pending</span>
                  <span>
                    {nextTask ? formatRelativeLabel(nextTask.daysRemaining) : "All clear"}
                  </span>
                </div>
              </article>

              <article className="aksara-card mt-5 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="aksara-mono text-[0.58rem] text-[#b24e72]">
                    Sheet summary
                  </p>
                  <p className="text-sm text-[#8d7880]">{summary.total} total</p>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-[2.15rem] font-semibold text-[#a31657]">
                      {summary.urgent}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-[#99848d]">
                      Urgent
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-[#d29f31]">
                      {summary.dueSoon}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-[#99848d]">
                      Due Soon
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-[#b85d7f]">
                      {summary.upcoming}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-[#99848d]">
                      Upcoming
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-[#7a2347]">
                      {summary.group}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-[#99848d]">
                      Group
                    </p>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {mobileView === "calendar" ? (
            <section>
              <MobileTopBar meta="Live schedule month" title="Calendar" />
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
                  <p className="aksara-mono text-[0.58rem] text-[#b24e72]">
                    Today
                  </p>
                  <h2 className="aksara-serif mt-2 text-[2.4rem] leading-none text-[#26171e]">
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
                    />
                  ))
                ) : (
                  <article className="aksara-card rounded-[1.8rem] px-5 py-5 text-[#7d6872]">
                    Nothing is due today.
                  </article>
                )}

                <div>
                  <p className="aksara-mono text-[0.58rem] text-[#b24e72]">
                    This week
                  </p>
                  <h2 className="aksara-serif mt-2 text-[2.2rem] leading-none text-[#26171e]">
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
                  />
                ))}
              </div>
            </section>
          ) : null}

          {mobileView === "tasks" ? (
            <section>
              <MobileTopBar meta="Google Sheet tasks" title="All" accent="tasks." />

              <article className="aksara-card mt-7 px-5 py-4">
                <div className="grid grid-cols-3 divide-x divide-[#edd9de] text-center">
                  <div>
                    <p className="text-[2.15rem] font-semibold text-[#a31657]">
                      {summary.pending}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-[#99848d]">
                      Pending
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-[#d29f31]">
                      {summary.completed}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-[#99848d]">
                      Done
                    </p>
                  </div>
                  <div>
                    <p className="text-[2.15rem] font-semibold text-[#b85d7f]">
                      {summary.group}
                    </p>
                    <p className="aksara-mono mt-1 text-[0.5rem] text-[#99848d]">
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
                        : "hover:border-[#d8b7c0] hover:bg-white"
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
                    />
                  ))
                ) : (
                  <article className="aksara-card rounded-[1.8rem] px-5 py-5 text-[#7d6872]">
                    {isLoading
                      ? "Loading tasks from the linked Google Sheet..."
                      : "No tasks match this filter."}
                  </article>
                )}
              </div>
            </section>
          ) : null}

          {mobileView === "courses" ? (
            <section>
              <MobileTopBar meta="Google Sheet courses" title="Your" accent="courses." />

              <article className="aksara-card mt-7 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="aksara-mono text-[0.58rem] text-[#b24e72]">
                    Enrolled
                  </p>
                  <p className="text-sm text-[#8d7880]">{courseCards.length} courses</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {courseCards.map((course) => (
                    <article
                      key={course.code}
                      className={`rounded-[1.4rem] border border-[#ecd9de] ${course.tint} p-4`}
                    >
                      <p className="aksara-mono text-[0.52rem] text-[#a94f6d]">
                        {course.code}
                      </p>
                      <h2 className="mt-3 text-lg font-semibold leading-6 text-[#2d1d24]">
                        {course.title}
                      </h2>
                      <p className="mt-3 text-sm text-[#8a747e]">
                        {course.pendingTasks} pending / {course.totalTasks} total
                      </p>
                      <p className="mt-1 text-sm text-[#9a858e]">
                        Next due: {course.nextDueLabel}
                      </p>
                    </article>
                  ))}
                </div>
              </article>
            </section>
          ) : null}
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:hidden">
          <nav className="aksara-mobile-tabbar pointer-events-auto w-full max-w-[25rem] px-3 py-3">
            <div className="grid grid-cols-4 gap-2">
              {mobileTabs.map((item) => {
                const Icon = item.icon;
                const active = mobileView === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleDesktopNavigation(item.key)}
                    className={`flex flex-col items-center gap-1 rounded-[1rem] px-3 py-2 text-xs font-medium ${
                      active ? "text-[#a31657]" : "text-[#96838c]"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
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
