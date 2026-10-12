"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ tone = "paper", className }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "grid size-9 place-items-center rounded-[var(--radius-field)] transition-colors",
        tone === "shell"
          ? "text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink"
          : "text-ink-3 hover:bg-surface-2 hover:text-ink",
        className,
      )}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
