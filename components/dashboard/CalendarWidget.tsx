"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AcademicTask, MarkerTone } from "@/lib/types";
import {
  formatDueDateTime,
  formatMonthYear,
  getTaskTone,
  markerClassNames,
  markerLabels,
} from "@/lib/dateUtils";

export function CalendarWidget({
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
