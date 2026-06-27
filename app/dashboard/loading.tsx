import { GraduationCap } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="aksara-card flex w-full max-w-md flex-col items-center rounded-[2.5rem] p-10 text-center">
        <div className="relative mb-8 flex size-28 items-center justify-center">
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-gold opacity-60"
            style={{ animationDuration: "12s" }}
          />
          <div className="absolute inset-2 rounded-full border border-maroon/20" />
          <div
            className="flex size-16 animate-pulse items-center justify-center rounded-[1.25rem] bg-brand text-gold shadow-[0_12px_28px_rgba(131,16,62,0.22)]"
            style={{ animationDuration: "2s" }}
          >
            <GraduationCap className="size-7" />
          </div>
        </div>

        <h2 className="aksara-serif mb-2 text-3xl font-semibold text-maroon">
          Aksara
        </h2>
        <p className="mb-6 max-w-xs text-sm text-ink-muted">
          Preparing your workspace…
        </p>
        <div className="mb-6 h-0.5 w-12 rounded-full bg-gold/30" />
        <p className="aksara-mono text-[0.62rem] font-medium uppercase tracking-[0.25em] text-maroon-soft">
          Syncing your schedule
        </p>
      </div>
    </div>
  );
}
