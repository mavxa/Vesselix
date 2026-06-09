import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Small status dot. `pulse` adds a soft animation (anim-gated by CSS). */
export function StatusDot({
  color,
  pulse,
  size = 7,
  className,
}: {
  color: string;
  pulse?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {pulse && (
        <span
          className="vx-pulse absolute inset-0 rounded-full"
          style={{ background: color, opacity: 0.5 }}
        />
      )}
      <span
        className="relative inline-block rounded-full"
        style={{ width: size, height: size, background: color }}
      />
    </span>
  );
}

export function Badge({
  children,
  color,
  soft,
  className,
}: {
  children: ReactNode;
  color: string;
  soft: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium leading-tight",
        className,
      )}
      style={{ color, background: soft }}
    >
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border-strong bg-surface px-1 font-mono text-[10px] font-medium text-muted-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Horizontal usage meter, e.g. memory used / limit. */
export function MeterBar({
  ratio,
  color,
  className,
  height = 4,
}: {
  ratio: number;
  color: string;
  className?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-surface-active", className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
