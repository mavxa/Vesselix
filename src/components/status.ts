import type {
  Container,
  ContainerHealth,
  ContainerState,
  LogLevel,
} from "../lib/types";

export interface StatusTone {
  label: string;
  dot: string; // bg color class via inline style key
  color: string; // css var
  soft: string; // soft bg css var
}

export function stateTone(state: ContainerState): StatusTone {
  switch (state) {
    case "running":
      return {
        label: "running",
        color: "var(--running)",
        soft: "var(--running-soft)",
        dot: "running",
      };
    case "restarting":
      return {
        label: "restarting",
        color: "var(--warning)",
        soft: "var(--warning-soft)",
        dot: "warning",
      };
    case "paused":
      return {
        label: "paused",
        color: "var(--paused)",
        soft: "rgba(113,113,122,0.14)",
        dot: "paused",
      };
    case "exited":
    default:
      return {
        label: "exited",
        color: "var(--danger)",
        soft: "var(--danger-soft)",
        dot: "danger",
      };
  }
}

export function healthTone(health: ContainerHealth): StatusTone | null {
  switch (health) {
    case "healthy":
      return {
        label: "healthy",
        color: "var(--running)",
        soft: "var(--running-soft)",
        dot: "running",
      };
    case "unhealthy":
      return {
        label: "unhealthy",
        color: "var(--danger)",
        soft: "var(--danger-soft)",
        dot: "danger",
      };
    case "starting":
      return {
        label: "starting",
        color: "var(--warning)",
        soft: "var(--warning-soft)",
        dot: "warning",
      };
    case "none":
    default:
      return null;
  }
}

// CPU heat: green low, amber mid, red high.
export function cpuColor(percent: number): string {
  if (percent >= 70) return "var(--danger)";
  if (percent >= 35) return "var(--warning)";
  return "var(--running)";
}

export function memColor(usedMb: number, limitMb: number): string {
  const ratio = limitMb > 0 ? usedMb / limitMb : 0;
  if (ratio >= 0.85) return "var(--danger)";
  if (ratio >= 0.6) return "var(--warning)";
  return "var(--accent)";
}

export function logLevelColor(level: LogLevel): string {
  switch (level) {
    case "error":
      return "var(--danger)";
    case "warn":
      return "var(--warning)";
    case "debug":
      return "var(--muted-subtle)";
    case "info":
    default:
      return "var(--running)";
  }
}

export function containerCounts(containers: Container[]) {
  let running = 0;
  let stopped = 0;
  let unhealthy = 0;
  for (const c of containers) {
    if (c.state === "running") running++;
    else stopped++;
    if (c.health === "unhealthy") unhealthy++;
  }
  return { running, stopped, unhealthy, total: containers.length };
}
