export function CoursePill({
  course,
  className,
}: {
  course: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.04em] ${className}`}
    >
      {course}
    </span>
  );
}
