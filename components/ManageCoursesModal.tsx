"use client";

import { useState, useEffect } from "react";
import { addCourse, editCourse, deleteCourse } from "@/app/actions";
import { coursePillClasses } from "@/lib/courseTheme";
import type { AcademicCourse } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

export function ManageCoursesModal({ isOpen, onClose, onRefresh, courses = [] }: { isOpen: boolean; onClose: () => void; onRefresh: () => void; courses?: AcademicCourse[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newColorIndex, setNewColorIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [courseToDelete, setCourseToDelete] = useState<{
    id: string;
    code: string;
  } | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setNewCode("");
      setNewTitle("");
      setNewColorIndex(0);
      setErrorMsg("");
      setCourseToDelete(null);
    }
  }, [isOpen]);

  useEscapeKey(() => {
    if (courseToDelete) {
      setCourseToDelete(null);
    } else {
      onClose();
    }
  }, isOpen);

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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add course");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDeleteCourse() {
    if (!courseToDelete) return;
    const { id, code } = courseToDelete;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await deleteCourse(id, code);
      setCourseToDelete(null);
      onRefresh();
    } catch (err) {
      setCourseToDelete(null);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to delete course",
      );
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
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update course color",
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
        aria-label="Manage courses"
        className="aksara-card w-full max-w-2xl p-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="aksara-serif text-3xl font-semibold text-ink">Manage Courses</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink transition p-2">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-surface-soft text-maroon-soft border border-[#dfb1c1] rounded-xl text-sm">
            {errorMsg}
          </div>
        )}

        <div className="bg-surface-soft border border-line rounded-2xl p-5 mb-6">
          <h3 className="text-ink-soft font-semibold text-sm mb-3 uppercase tracking-wider">Add New Course</h3>
          <form action={handleAddCourse} className="flex gap-3 items-start">
            <div className="w-1/4">
              <input required name="code" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code (e.g. SCSE1203)" className="w-full border border-line rounded-[0.85rem] px-3 py-2.5 text-sm outline-none focus:border-maroon-bright" />
            </div>
            <div className="flex-1">
              <input required name="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="w-full border border-line rounded-[0.85rem] px-3 py-2.5 text-sm outline-none focus:border-maroon-bright" />
            </div>
            <div className="flex items-center gap-1 border border-line rounded-[0.85rem] p-1.5 bg-surface">
              {coursePillClasses.map((pillClass, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewColorIndex(i)}
                  className={`size-6 rounded-full border-2 transition-all ${newColorIndex === i ? "border-maroon-bright scale-110" : "border-transparent hover:scale-110"} ${pillClass.split(" ")[1]}`}
                />
              ))}
              <input type="hidden" name="colorIndex" value={newColorIndex} />
            </div>
            <button type="submit" disabled={isSubmitting || !newCode || !newTitle} className="aksara-primary-button px-4 py-2.5 text-sm font-semibold text-white rounded-[0.85rem] disabled:opacity-70 whitespace-nowrap">
              Add Course
            </button>
          </form>
        </div>

        <h3 className="text-ink-soft font-semibold text-sm mb-3 uppercase tracking-wider">Your Courses</h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 aksara-scrollbar">
          {courses.length === 0 ? (
            <p className="text-ink-soft text-sm text-center py-4">No courses explicitly added yet.</p>
          ) : (
            courses.map(course => (
              <div key={course.id} className="flex items-center justify-between border border-line bg-surface rounded-[1rem] p-4 shadow-sm hover:shadow-md transition">
                <div>
                  <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${coursePillClasses[course.colorIndex] || coursePillClasses[0]}`}>
                    {course.code}
                  </div>
                  <h4 className="mt-2 text-ink font-semibold">{course.title}</h4>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1">
                    {coursePillClasses.map((pillClass, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleUpdateColor(course.id, i)}
                        disabled={isSubmitting}
                        className={`size-5 rounded-full border-2 transition-all ${course.colorIndex === i ? "border-maroon-bright scale-110" : "border-transparent hover:scale-110"} ${pillClass.split(" ")[1]}`}
                      />
                    ))}
                  </div>
                  <button onClick={() => setCourseToDelete({ id: course.id, code: course.code })} disabled={isSubmitting} aria-label={`Remove ${course.code}`} className="text-ink-soft hover:text-maroon-bright transition p-1.5 rounded-lg hover:bg-surface-soft">
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

      {courseToDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setCourseToDelete(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm remove course"
            className="aksara-card w-full max-w-sm rounded-[1.8rem] p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="aksara-serif mb-3 text-2xl font-semibold text-ink">
              Remove course?
            </h3>
            <p className="mb-6 text-ink-soft">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-maroon-bright">
                {courseToDelete.code}
              </span>
              ?
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={isSubmitting}
                className="rounded-[0.85rem] px-5 py-2.5 font-semibold text-ink-soft transition hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCourse}
                disabled={isSubmitting}
                className="aksara-primary-button rounded-[0.85rem] px-6 py-2.5 font-semibold text-white disabled:opacity-70"
              >
                {isSubmitting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
