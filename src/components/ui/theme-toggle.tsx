"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/src/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      className="flex size-9 items-center justify-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-hover hover:text-ink"
    >
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
