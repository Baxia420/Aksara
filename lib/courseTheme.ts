// Single source of truth for the per-course color palettes. Index into these
// arrays with a course's colorIndex (wrap with `% length` to stay in range).

export const coursePillClasses = [
  "border-[#dfb1c1] bg-[#fff7fa] text-[#9f4568]",
  "border-[#eac08a] bg-[#fffaf1] text-[#b87b26]",
  "border-[#a2c7eb] bg-[#f4fbff] text-[#467db6]",
  "border-[#b9c8ec] bg-[#f5f8ff] text-[#5d75b3]",
  "border-[#d7cfb7] bg-[#fcfbf5] text-[#7e6f3f]",
  "border-[#f1d5a2] bg-[#fff8ec] text-[#ad7d1c]",
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
