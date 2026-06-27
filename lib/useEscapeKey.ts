"use client";

import { useEffect } from "react";

/** Calls `onEscape` whenever the Escape key is pressed while `active` is true. */
export function useEscapeKey(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape, active]);
}
