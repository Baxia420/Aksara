"use client";

import { useState, useEffect } from "react";
import { createTask, editTask, deleteTask } from "@/app/actions";

export function AddTaskModal({ isOpen, onClose, tasks = [], courses = [], taskToEdit = null }: { isOpen: boolean; onClose: () => void; tasks?: any[]; courses?: any[]; taskToEdit?: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  let uniqueCourses = courses.length > 0 
    ? courses 
    : Array.from(
        new Map(
          (tasks || [])
            .filter((t) => t.courseCode && t.courseTitle && t.courseCode.toLowerCase() !== "test")
            .map((t) => [t.courseCode, t.courseTitle])
        ).entries()
      ).map(([code, title]) => ({ code, title }));

  const defaultTypes = ["Assignment", "Group Task", "Midterm", "Final Exam"];
  const uniqueTypes = Array.from(
    new Set([
      ...defaultTypes,
      ...(tasks || []).map((t) => t.type).filter(t => t && t.toLowerCase() !== "wewe")
    ])
  );

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
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

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      if (taskToEdit) {
        await editTask(formData);
      } else {
        await createTask(formData);
      }
      onClose();
    } catch {
      alert(taskToEdit ? "Failed to edit task" : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!taskToEdit) return;
    setIsSubmitting(true);
    try {
      await deleteTask(taskToEdit.id);
      onClose();
    } catch {
      alert("Failed to delete task");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm">
      <div className="aksara-card w-full max-w-lg p-8">
        <h2 className="aksara-serif text-3xl font-semibold mb-6 text-[#26171e]">
          {taskToEdit ? "Edit Task" : "Add New Task"}
        </h2>
        <form action={handleSubmit} className="space-y-4">
          {taskToEdit && <input type="hidden" name="id" value={taskToEdit.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Course Code</label>
              <select 
                required 
                name="courseCode" 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657] bg-white"
              >
                <option value="" disabled>Select a code</option>
                {uniqueCourses.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Course Title</label>
              <input type="hidden" name="courseTitle" value={uniqueCourses.find(c => c.code === selectedCourse)?.title || ""} />
              <select 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657] bg-white"
              >
                <option value="" disabled>Select a title</option>
                {uniqueCourses.map(c => (
                  <option key={c.title} value={c.code}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Task Title</label>
            <input 
              required 
              name="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Final Project Phase 1" 
              className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Type</label>
            <select 
              required 
              name="type" 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657] bg-white"
            >
              <option value="" disabled>Select a type</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Due Date</label>
              <input 
                required 
                type="date" 
                name="dueDate" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Due Time (Optional)</label>
              <input 
                type="text" 
                name="dueTime" 
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="e.g. 11:59 PM or 23:59" 
                className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]" 
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-4">
            <div>
              {taskToEdit && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#a31657] font-semibold">Delete task?</span>
                    <button 
                      type="button" 
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#a31657] hover:bg-[#83103e] rounded-lg transition"
                    >
                      Yes
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#8f7881] hover:text-[#26171e] rounded-lg transition"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-xs font-semibold text-[#a31657] border border-[#a31657]/30 hover:border-[#a31657] hover:bg-[#a31657]/5 rounded-[0.85rem] transition"
                  >
                    Delete Task
                  </button>
                )
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-3 font-semibold text-[#8f7881] hover:text-[#26171e] transition rounded-[0.85rem]">
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
