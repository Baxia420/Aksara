"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="aksara-card flex w-full max-w-md flex-col items-center rounded-[2.5rem] p-10 text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-[1.25rem] bg-maroon-bright text-white">
          <TriangleAlert className="size-7" />
        </div>
        <h2 className="aksara-serif mb-2 text-3xl font-semibold text-ink">
          Something went wrong
        </h2>
        <p className="mb-6 max-w-xs text-sm text-ink-muted">
          We couldn&apos;t load your workspace. This is usually temporary — try
          again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="aksara-primary-button rounded-[0.85rem] px-6 py-3 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
