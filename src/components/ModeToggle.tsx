import { useAppState } from "../store/appContext";
import { cn } from "../lib/cn";
import { Gpu, Leaf } from "lucide-react";

/**
 * Low / High performance mode segmented toggle.
 * Low is the default and visually "calm"; High signals richer visuals.
 */
export function ModeToggle() {
  const { mode, setMode } = useAppState();

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex items-center gap-1 text-[10px] tabular text-faint"
        title="Live stats refresh interval"
      >
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            mode === "high" && "vx-pulse",
          )}
          style={{
            background:
              mode === "high" ? "var(--accent)" : "var(--muted-subtle)",
          }}
        />
        {mode === "high" ? "1s" : "4s"}
      </span>
      <div
        className="flex items-center gap-0.5 rounded-lg border border-border bg-background-elevated p-0.5"
        role="group"
        aria-label="Performance mode"
      >
        <button
          type="button"
          onClick={() => setMode("low")}
          aria-pressed={mode === "low"}
          title="Low mode — minimal effects, best for weak hardware"
          className={cn(
            "cursor-pointer flex items-center gap-1 rounded-l-md px-1.5 py-0.5 text-[11px] font-medium",
            mode === "low"
              ? "bg-surface-active text-foreground"
              : "text-muted-subtle hover:text-muted",
          )}
        >
          <Leaf
            size={14}
            strokeWidth={1}
            style={{ color: mode === "low" ? "var(--running)" : undefined }}
          />
          Low
        </button>
        <button
          type="button"
          onClick={() => setMode("high")}
          aria-pressed={mode === "high"}
          title="High mode — richer charts and smooth animations"
          className={cn(
            "cursor-pointer flex items-center gap-1 rounded-r-md px-1.5 py-0.5 text-[11px] font-medium",
            mode === "high"
              ? "bg-surface-active text-foreground"
              : "text-muted-subtle hover:text-muted",
          )}
        >
          <Gpu
            size={14}
            strokeWidth={1}
            style={{ color: mode === "high" ? "var(--accent)" : undefined }}
          />
          High
        </button>
      </div>
    </div>
  );
}
