"use client";

import { Pencil } from "lucide-react";
import type { AcademicTask } from "@/lib/types";
import { CoursePill } from "@/components/dashboard/CoursePill";
import { coursePillClasses } from "@/lib/courseTheme";
import {
  formatFullDate,
  formatRelativeLabel,
  getTaskAccent,
} from "@/lib/dateUtils";

/** The desktop task table (header row + task rows), shared by the Home
 *  sprint-board card and the Tasks view. */
export function TaskTable({
  tasks,
  courseStyles,
  currentTime,
  canEditTask,
  onEditTask,
  onToggleTask,
}: {
  tasks: AcademicTask[];
  courseStyles: Map<string, string>;
  currentTime: Date;
  canEditTask: (task: AcademicTask) => boolean;
  onEditTask: (task: AcademicTask) => void;
  onToggleTask: (task: AcademicTask) => void;
}) {
  return (
    <>
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
        {tasks.length > 0 ? (
          tasks.map((task) => (
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
                    courseStyles.get(task.courseCode) ?? coursePillClasses[0]
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
                    onClick={() => onEditTask(task)}
                    className="text-ink-soft hover:text-maroon transition-colors p-1"
                    title="Edit Task"
                    aria-label="Edit task"
                  >
                    <Pencil className="size-4.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleTask(task)}
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
    </>
  );
}
