"use client";

import { useState, useEffect } from "react";
import { createTask, editTask, deleteTask } from "@/app/actions";
import type { AcademicCourse, AcademicTask } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

export function AddTaskModal({ isOpen, onClose, tasks = [], courses = [], taskToEdit = null }: { isOpen: boolean; onClose: () => void; tasks?: AcademicTask[]; courses?: AcademicCourse[]; taskToEdit?: AcademicTask | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uniqueCourses: { code: string; title: string }[] =
    courses.length > 0
      ? courses.map((c) => ({ code: c.code, title: c.title }))
      : Array.from(
          new Map(
            (tasks || [])
              .filter(
                (t) =>
                  t.courseCode &&
                  t.courseTitle &&
                  t.courseCode.toLowerCase() !== "test",
              )
              .map((t) => [t.courseCode, t.courseTitle]),
          ).entries(),
        ).map(([code, title]) => ({ code, title }));

  const defaultTypes = ["Assignment", "Group Task", "Quiz", "Midterm", "Final Exam"];
  const uniqueTypes = Array.from(
    new Set([
      ...defaultTypes,
      ...(tasks || []).map((t) => t.type).filter((t) => t && t.toLowerCase() !== "wewe"),
    ]),
  );

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      setErrorMsg(null);
      if (taskToEdit) {
        setSelectedCourse(taskToEdit.courseCode || "");
        setSelectedType(taskToEdit.type || "");
        setTitle(taskToEdit.title || "");
        setDueDate(taskToEdit.dueDateIso || "");
        setDueTime(taskToEdit.dueTime || "");
      } else {
        setSelectedCourse("");
        setSelectedType("");
        setTitle("");
        setDueDate("");
        setDueTime("");
      }
    }
  }, [isOpen, taskToEdit]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const result = taskToEdit
        ? await editTask(formData)
        : await createTask(formData);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
      onClose();
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!taskToEdit) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await deleteTask(taskToEdit.id);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
      onClose();
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={taskToEdit ? "Edit task" : "Add new task"}
        className="aksara-card w-full max-w-lg p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="aksara-serif text-3xl font-semibold mb-6 text-ink">
          {taskToEdit ? "Edit Task" : "Add New Task"}
        </h2>
        <form action={handleSubmit} className="space-y-4">
          {taskToEdit && <input type="hidden" name="id" value={taskToEdit.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-ink-soft">Course Code</label>
              <select 
                required 
                name="courseCode" 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full border border-line rounded-[0.85rem] px-4 py-3 outline-none focus:border-maroon-bright bg-surface"
              >
                <option value="" disabled>Select a code</option>
                {uniqueCourses.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-ink-soft">Course Title</label>
              <input type="hidden" name="courseTitle" value={uniqueCourses.find(c => c.code === selectedCourse)?.title || ""} />
              <div className="w-full border border-line rounded-[0.85rem] px-4 py-3 bg-surface-soft text-ink-muted truncate">
                {uniqueCourses.find((c) => c.code === selectedCourse)?.title || "Select a code first"}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-ink-soft">Task Title</label>
            <input 
              required 
              name="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Final Project Phase 1" 
              className="w-full border border-line rounded-[0.85rem] px-4 py-3 outline-none focus:border-maroon-bright" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-ink-soft">Type</label>
            <select 
              required 
              name="type" 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-line rounded-[0.85rem] px-4 py-3 outline-none focus:border-maroon-bright bg-surface"
            >
              <option value="" disabled>Select a type</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-ink-soft">Due Date</label>
              <input
                required
                type="date"
                name="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-w-0 border border-line bg-surface rounded-[0.85rem] px-4 py-3 outline-none focus:border-maroon-bright"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-ink-soft">Due Time (Optional)</label>
              <input 
                type="text" 
                name="dueTime" 
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="e.g. 11:59 PM or 23:59" 
                className="w-full border border-line rounded-[0.85rem] px-4 py-3 outline-none focus:border-maroon-bright" 
              />
            </div>
          </div>
          {errorMsg && (
            <p
              role="alert"
              className="rounded-[0.85rem] border border-maroon-bright/30 bg-maroon-bright/5 px-4 py-3 text-sm font-medium text-maroon-bright"
            >
              {errorMsg}
            </p>
          )}
          <div className="flex justify-between items-center pt-4">
            <div>
              {taskToEdit && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-maroon-bright font-semibold">Delete task?</span>
                    <button 
                      type="button" 
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-bright hover:bg-brand rounded-lg transition"
                    >
                      Yes
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink rounded-lg transition"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-xs font-semibold text-maroon-bright border border-maroon-bright/30 hover:border-maroon-bright hover:bg-maroon-bright/5 rounded-[0.85rem] transition"
                  >
                    Delete Task
                  </button>
                )
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-3 font-semibold text-ink-soft hover:text-ink transition rounded-[0.85rem]">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || !selectedCourse || !selectedType} className="aksara-primary-button px-6 py-3 font-semibold text-white rounded-[0.85rem] disabled:opacity-70">
                {isSubmitting ? "Saving..." : "Save Task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
