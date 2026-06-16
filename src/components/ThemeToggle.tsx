import { Moon, Sun } from "lucide-react";
import { useAppState } from "../store/appContext";
import { cn } from "../lib/cn";

export function ThemeToggle() {
  const { theme, setTheme } = useAppState();

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border bg-background-elevated p-0.5"
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        title="Dark theme"
        className={cn(
          "cursor-pointer flex items-center gap-1 rounded-l-md px-1.5 py-0.5 text-[11px] font-medium",
          theme === "dark"
            ? "bg-surface-active text-foreground"
            : "text-muted-subtle hover:text-muted",
        )}
      >
        <Moon
          size={14}
          strokeWidth={1}
          style={{ color: theme === "dark" ? "var(--accent)" : undefined }}
        />
        Dark
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        title="Light theme"
        className={cn(
          "cursor-pointer flex items-center gap-1 rounded-r-md px-1.5 py-0.5 text-[11px] font-medium",
          theme === "light"
            ? "bg-surface-active text-foreground"
            : "text-muted-subtle hover:text-muted",
        )}
      >
        <Sun
          size={14}
          strokeWidth={1}
          style={{ color: theme === "light" ? "var(--warning)" : undefined }}
        />
        Light
      </button>
    </div>
  );
}
