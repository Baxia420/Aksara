// Single source of truth for the per-course color palettes. Index into these
// arrays with a course's colorIndex (wrap with `% length` to stay in range).

// Tonal pills: a soft wash of the course hue + readable hue text. Both the wash
// and the text are theme-aware (see --pill-N-* in globals.css), so they sit
// naturally on light and dark cards alike.
export const coursePillClasses = [
  "bg-[var(--pill-0-bg)] text-[var(--pill-0-fg)]",
  "bg-[var(--pill-1-bg)] text-[var(--pill-1-fg)]",
  "bg-[var(--pill-2-bg)] text-[var(--pill-2-fg)]",
  "bg-[var(--pill-3-bg)] text-[var(--pill-3-fg)]",
  "bg-[var(--pill-4-bg)] text-[var(--pill-4-fg)]",
  "bg-[var(--pill-5-bg)] text-[var(--pill-5-fg)]",
];

export const courseTints = [
  "bg-course-0",
  "bg-course-1",
  "bg-course-2",
  "bg-course-3",
  "bg-course-4",
  "bg-course-5",
];

export const courseBarColors = [
  "bg-[#c4607e]",
  "bg-[#d89c45]",
  "bg-[#4e8db5]",
  "bg-[#6279b8]",
  "bg-[#8c7d46]",
  "bg-[#c08f2a]",
];

export function pillClassForIndex(colorIndex: number): string {
  return coursePillClasses[colorIndex % coursePillClasses.length];
}

export function tintForIndex(colorIndex: number): string {
  return courseTints[colorIndex % courseTints.length];
}

export function barColorForIndex(colorIndex: number): string {
  return courseBarColors[colorIndex % courseBarColors.length];
}
