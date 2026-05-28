"use client";

import { useState, useEffect } from "react";
import { addCourse, editCourse, deleteCourse } from "@/app/actions";

const coursePillClasses = [
  "border-[#dfb1c1] bg-[#fff7fa] text-[#9f4568]",
  "border-[#eac08a] bg-[#fffaf1] text-[#b87b26]",
  "border-[#a2c7eb] bg-[#f4fbff] text-[#467db6]",
  "border-[#b9c8ec] bg-[#f5f8ff] text-[#5d75b3]",
  "border-[#d7cfb7] bg-[#fcfbf5] text-[#7e6f3f]",
  "border-[#f1d5a2] bg-[#fff8ec] text-[#ad7d1c]",
];

export function ManageCoursesModal({ isOpen, onClose, onRefresh, courses = [] }: { isOpen: boolean; onClose: () => void; onRefresh: () => void; courses?: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newColorIndex, setNewColorIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setNewCode("");
      setNewTitle("");
      setNewColorIndex(0);
      setErrorMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleAddCourse(formData: FormData) {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await addCourse(formData);
      setNewCode("");
      setNewTitle("");
      setNewColorIndex(0);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add course");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCourse(id: string, code: string) {
    if (!window.confirm(`Are you sure you want to remove ${code}?`)) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await deleteCourse(id, code);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete course");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateColor(id: string, colorIndex: number) {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("id", id);
      formData.append("colorIndex", colorIndex.toString());
      await editCourse(formData);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update course color");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm">
      <div className="aksara-card w-full max-w-2xl p-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="aksara-serif text-3xl font-semibold text-[#26171e]">Manage Courses</h2>
          <button onClick={onClose} className="text-[#8f7881] hover:text-[#26171e] transition p-2">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-[#fff7fa] text-[#9f4568] border border-[#dfb1c1] rounded-xl text-sm">
            {errorMsg}
          </div>
        )}

        <div className="bg-[#fcfafb] border border-[#ecd9de] rounded-2xl p-5 mb-6">
          <h3 className="text-[#8f7881] font-semibold text-sm mb-3 uppercase tracking-wider">Add New Course</h3>
          <form action={handleAddCourse} className="flex gap-3 items-start">
            <div className="w-1/4">
              <input required name="code" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code (e.g. SCSE1203)" className="w-full border border-[#ecd9de] rounded-[0.85rem] px-3 py-2.5 text-sm outline-none focus:border-[#a31657]" />
            </div>
            <div className="flex-1">
              <input required name="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="w-full border border-[#ecd9de] rounded-[0.85rem] px-3 py-2.5 text-sm outline-none focus:border-[#a31657]" />
            </div>
            <div className="flex items-center gap-1 border border-[#ecd9de] rounded-[0.85rem] p-1.5 bg-white">
              {coursePillClasses.map((pillClass, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewColorIndex(i)}
                  className={`size-6 rounded-full border-2 transition-all ${newColorIndex === i ? "border-[#a31657] scale-110" : "border-transparent hover:scale-110"} ${pillClass.split(" ")[1]}`}
                />
              ))}
              <input type="hidden" name="colorIndex" value={newColorIndex} />
            </div>
            <button type="submit" disabled={isSubmitting || !newCode || !newTitle} className="aksara-primary-button px-4 py-2.5 text-sm font-semibold text-white rounded-[0.85rem] disabled:opacity-70 whitespace-nowrap">
              Add Course
            </button>
          </form>
        </div>

        <h3 className="text-[#8f7881] font-semibold text-sm mb-3 uppercase tracking-wider">Your Courses</h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {courses.length === 0 ? (
            <p className="text-[#8f7881] text-sm text-center py-4">No courses explicitly added yet.</p>
          ) : (
            courses.map(course => (
              <div key={course.id} className="flex items-center justify-between border border-[#ecd9de] bg-white rounded-[1rem] p-4 shadow-sm hover:shadow-md transition">
                <div>
                  <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${coursePillClasses[course.colorIndex] || coursePillClasses[0]}`}>
                    {course.code}
                  </div>
                  <h4 className="mt-2 text-[#26171e] font-semibold">{course.title}</h4>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1">
                    {coursePillClasses.map((pillClass, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleUpdateColor(course.id, i)}
                        disabled={isSubmitting}
                        className={`size-5 rounded-full border-2 transition-all ${course.colorIndex === i ? "border-[#a31657] scale-110" : "border-transparent hover:scale-110"} ${pillClass.split(" ")[1]}`}
                      />
                    ))}
                  </div>
                  <button onClick={() => handleDeleteCourse(course.id, course.code)} disabled={isSubmitting} className="text-[#8f7881] hover:text-[#a31657] transition p-1.5 rounded-lg hover:bg-[#fff7fa]">
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
