"use client";

import { Pencil } from "lucide-react";
import type { AcademicTask } from "@/lib/types";
import { CoursePill } from "@/components/dashboard/CoursePill";
import {
  formatDueDateTime,
  formatRelativeLabel,
  getTaskAccent,
} from "@/lib/dateUtils";

export function MobileTaskCard({
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
