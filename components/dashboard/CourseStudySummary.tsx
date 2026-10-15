import { Play } from "lucide-react";
import { formatStudyTime } from "@/lib/study";

export function CourseStudySummary({
  seconds,
  onStudy,
  disabled = false,
}: {
  seconds: number;
  onStudy: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-[11px] text-ink-muted">Studied this week</p>
      <p className="aksara-serif mt-1 text-[1.8rem] font-semibold leading-none tabular-nums text-maroon">
        {formatStudyTime(seconds)}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onStudy}
        className="aksara-chip mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold transition hover:border-maroon disabled:opacity-50"
      >
        <Play className="size-3 shrink-0" aria-hidden="true" />
        Study
      </button>
    </div>
  );
}
