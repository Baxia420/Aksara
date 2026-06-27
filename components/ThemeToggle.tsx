"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("aksara-theme", theme);
  } catch {
    /* ignore */
  }
}

/** Segmented Light/Dark control. Reads the current theme from the <html> class
 *  (set before paint by the inline script in the root layout). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setMounted(true);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
  ];

  return (
    <div className="inline-flex rounded-[1rem] border border-line bg-surface-soft p-1">
      {options.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={active}
            className={`flex items-center gap-2 rounded-[0.7rem] px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-brand text-white shadow-[0_8px_18px_rgba(131,16,62,0.18)]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
