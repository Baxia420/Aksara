"use client";

import { useState, useEffect } from "react";
import { createTask } from "@/app/actions";

export function AddTaskModal({ isOpen, onClose, tasks = [], courses = [] }: { isOpen: boolean; onClose: () => void; tasks?: any[]; courses?: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedType, setSelectedType] = useState("");

  let uniqueCourses = courses.length > 0 
    ? courses 
    : Array.from(
        new Map(
          (tasks || [])
            .filter((t) => t.courseCode && t.courseTitle && t.courseCode.toLowerCase() !== "test")
            .map((t) => [t.courseCode, t.courseTitle])
        ).entries()
      ).map(([code, title]) => ({ code, title }));

  const uniqueTypes = Array.from(
    new Set((tasks || []).map((t) => t.type).filter(t => t && t.toLowerCase() !== "wewe"))
  );

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedCourse("");
      setSelectedType("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await createTask(formData);
      onClose();
    } catch {
      alert("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm">
      <div className="aksara-card w-full max-w-lg p-8">
        <h2 className="aksara-serif text-3xl font-semibold mb-6 text-[#26171e]">Add New Task</h2>
        <form action={handleSubmit} className="space-y-4">
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
            <input required name="title" placeholder="Final Project Phase 1" className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]" />
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
              <input required type="date" name="dueDate" className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Due Time (Optional)</label>
              <input type="text" name="dueTime" placeholder="e.g. 11:59 PM or 23:59" className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-3 font-semibold text-[#8f7881] hover:text-[#26171e] transition rounded-[0.85rem]">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !selectedCourse || !selectedType} className="aksara-primary-button px-6 py-3 font-semibold text-white rounded-[0.85rem] disabled:opacity-70">
              {isSubmitting ? "Saving..." : "Save Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
