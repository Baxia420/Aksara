"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "aksara-install-dismissed";

/**
 * iOS Safari has no install API, so we show a one-time hint telling the user to
 * use Share → "Add to Home Screen". Hidden once installed (standalone) or dismissed.
 */
export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS =
      /ipad|iphone|ipod/i.test(navigator.userAgent) &&
      !("MSStream" in window);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (isIOS && !isStandalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:hidden">
      <div className="aksara-card pointer-events-auto flex w-full max-w-[25rem] items-start gap-3 rounded-[1.4rem] px-4 py-3.5">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-maroon text-gold">
          <Share className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Install Aksara</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            Tap <span className="font-semibold">Share</span> then{" "}
            <span className="font-semibold">Add to Home Screen</span> for the
            full-screen app with reminders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setShow(false);
          }}
          aria-label="Dismiss install prompt"
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-soft transition hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
