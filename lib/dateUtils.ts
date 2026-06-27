import type { AcademicTask, MarkerTone } from "@/lib/types";

export const markerLabels: Record<MarkerTone, string> = {
  overdue: "Overdue",
  due: "Due soon",
  upcoming: "Upcoming",
};

export const markerClassNames: Record<MarkerTone, string> = {
  overdue: "bg-[#a91c58]",
  due: "bg-[#d89d2c]",
  upcoming: "bg-[#c9839d]",
};

const THREE_DAYS_MS = 259_200_000;

export function toDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatFullDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(toDate(isoDate));
}

export function formatDueDateTime(task: AcademicTask) {
  return task.dueTime
    ? `${formatFullDate(task.dueDateIso)} / ${task.dueTime}`
    : formatFullDate(task.dueDateIso);
}

export function formatDashboardDate(date: Date) {
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

export function getGreeting(date: Date) {
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

export function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatMonthShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

export function formatWeekdayShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

export function formatWeekdayLong(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

export function getExactDiffMs(task: AcademicTask, now: Date) {
  const [year, month, day] = task.dueDateIso.split("-").map(Number);
  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (task.dueTime) {
    const match = task.dueTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const period = match[3];

      if (period) {
        if (period.toUpperCase() === "PM" && h < 12) h += 12;
        if (period.toUpperCase() === "AM" && h === 12) h = 0;
      }
      hours = h;
      minutes = m;
      seconds = 0;
    }
  }

  const target = new Date(year, month - 1, day, hours, minutes, seconds);
  return target.getTime() - now.getTime();
}

export function formatRelativeLabel(task: AcademicTask, now: Date = new Date()) {
  const diffMs = getExactDiffMs(task, now);
  const isOverdue = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const totalMinutes = Math.floor(absMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const remMinutes = totalMinutes % 60;

  if (isOverdue) {
    if (days > 0) {
      return `${days}d overdue`;
    }
    if (totalHours > 0) {
      return `${totalHours}h overdue`;
    }
    return `${totalMinutes}m overdue`;
  }

  if (days > 0) {
    return `${days}d ${remHours}h left`;
  }
  if (totalHours > 0) {
    return `${totalHours}h ${remMinutes}m left`;
  }
  return `${totalMinutes}m left`;
}

export function getTaskTone(task: AcademicTask, now: Date = new Date()): MarkerTone {
  const diffMs = getExactDiffMs(task, now);

  if (diffMs < 0) {
    return "overdue";
  }
  if (diffMs <= THREE_DAYS_MS) {
    return "due";
  }
  return "upcoming";
}

export function getTaskAccent(task: AcademicTask, now: Date = new Date()) {
  if (task.completed) {
    return "text-[#6f5b64]";
  }

  const diffMs = getExactDiffMs(task, now);

  if (diffMs < 0) {
    return "text-[#a31657]";
  }
  if (diffMs <= THREE_DAYS_MS) {
    return "text-[#b87b26]";
  }
  return "text-[#7d656f]";
}
