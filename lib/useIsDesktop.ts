"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is at the Tailwind `lg` breakpoint (>=1024px) or wider.
 * Starts false on the server / first client render to keep hydration stable, then
 * resolves after mount. Used to mount heavy, breakpoint-specific views (e.g. the
 * focus timer) exactly once instead of in both the desktop and mobile trees.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
