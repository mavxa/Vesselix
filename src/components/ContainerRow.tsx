import { memo } from "react";
import type { Container, UiPerformanceMode } from "../lib/types";
import { cn } from "../lib/cn";
import { TABLE_GRID } from "./tableLayout";
import { Sparkline } from "./Sparkline";
import { StatusDot, Badge } from "./primitives";
import { cpuColor, healthTone, memColor, stateTone } from "./status";
import {
  formatMb,
  formatPercent,
  formatRate,
  formatUptime,
  truncate,
} from "../lib/format";
import { Play, RotateCcw, CircleOff, Logs } from "lucide-react";
import type { ContainerAction } from "../store/appContext";

interface Props {
  container: Container;
  selected: boolean;
  mode: UiPerformanceMode;
  onSelect: (id: string) => void;
  onOpenLogs: (id: string) => void;
  onAction: (action: ContainerAction, c: Container) => void;
}

function RowImpl({
  container: c,
  selected,
  mode,
  onSelect,
  onOpenLogs,
  onAction,
}: Props) {
  const st = stateTone(c.state);
  const health = healthTone(c.health);
  const running = c.state === "running";
  const memRatio = c.memoryLimitMb > 0 ? c.memoryUsageMb / c.memoryLimitMb : 0;
  const showSpark = mode === "high" || running; // tiny sparkline is cheap; always ok

  return (
    <div
      role="row"
      aria-selected={selected}
      tabIndex={-1}
      onClick={() => onSelect(c.id)}
      onDoubleClick={() => onOpenLogs(c.id)}
      className={cn(
        "group relative h-9 cursor-pointer border-l-2 px-3 text-[12px]",
        TABLE_GRID,
        selected
          ? "border-l-accent bg-accent-soft"
          : "border-l-transparent hover:bg-surface-hover",
      )}
      style={!running ? { opacity: 0.72 } : undefined}
    >
      {/* Name + image hint */}
      <div className="flex min-w-0 items-center gap-2">
        <StatusDot
          color={st.color}
          pulse={running && mode === "high"}
          size={7}
        />
        <span className="truncate font-medium text-foreground">{c.name}</span>
      </div>

      {/* State */}
      <div>
        <Badge color={st.color} soft={st.soft}>
          {st.label}
        </Badge>
      </div>

      {/* Health */}
      <div>
        {health ? (
          <Badge color={health.color} soft={health.soft}>
            {c.health === "starting" && (
              <span
                className="vx-pulse inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: health.color }}
              />
            )}
            {health.label}
          </Badge>
        ) : (
          <span className="text-faint">—</span>
        )}
      </div>

      {/* CPU */}
      <div className="flex items-center justify-end gap-2 tabular">
        <span
          className="font-medium"
          style={{ color: running ? cpuColor(c.cpuPercent) : "var(--faint)" }}
        >
          {running ? formatPercent(c.cpuPercent, 1) : "—"}
        </span>
      </div>

      {/* Memory: value + meter (+ sparkline in high mode) */}
      <div className="flex min-w-0 flex-col justify-center gap-0.5">
        <div className="flex items-center justify-between gap-2 tabular leading-none">
          <span className="text-muted">
            {running ? formatMb(c.memoryUsageMb) : "—"}
          </span>
          <span className="text-[10px] text-faint">
            {formatMb(c.memoryLimitMb)}
          </span>
        </div>
        <div className="h-0.75 w-full overflow-hidden rounded-full bg-surface-active">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, memRatio * 100)}%`,
              background: running
                ? memColor(c.memoryUsageMb, c.memoryLimitMb)
                : "var(--faint)",
            }}
          />
        </div>
      </div>

      {/* Network I/O */}
      <div className="flex flex-col justify-center tabular leading-none text-[11px]">
        <span className="text-muted">
          <span className="text-faint">↓</span>{" "}
          {running ? formatRate(c.networkRxRate) : "—"}
        </span>
        <span className="text-muted-subtle">
          <span className="text-faint">↑</span>{" "}
          {running ? formatRate(c.networkTxRate) : "—"}
        </span>
      </div>

      {/* Ports */}
      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {c.ports.length === 0 ? (
          <span className="text-faint">—</span>
        ) : (
          <span className="truncate font-mono text-[11px] text-muted-subtle">
            {c.ports
              .map((p) =>
                p.publicPort
                  ? `${p.publicPort}:${p.privatePort}`
                  : `${p.privatePort}`,
              )
              .join(" ")}
          </span>
        )}
      </div>

      {/* Image + uptime + (optional) sparkline */}
      <div className="flex min-w-0 items-center gap-2">
        {showSpark && (
          <Sparkline
            data={c.cpuHistory}
            color={running ? cpuColor(c.cpuPercent) : "var(--faint)"}
            fill={mode === "high"}
            width={150}
            height={24}
          />
        )}
        <div className="flex min-w-0 flex-col leading-none">
          <span
            className="truncate font-mono text-[11px] text-muted-subtle"
            title={c.image}
          >
            {truncate(c.image, 22)}
          </span>
          <span className="text-[10px] text-faint">
            {running
              ? formatUptime(c.startedAt)
              : c.status.split("(")[0].trim()}
          </span>
        </div>
      </div>

      {/* Actions (reveal on hover/selected) */}
      <div
        className={cn(
          "flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100:",
          selected && "opacity-100",
        )}
      >
        <div className="flex gap-0.5">
          {running ? (
            <>
              <RowBtn
                title="Restart (r)"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction("restart", c);
                }}
              >
                <RotateCcw size={14} strokeWidth={2} />
              </RowBtn>
              <RowBtn
                title="Stop (s)"
                tone="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction("stop", c);
                }}
              >
                <CircleOff size={14} strokeWidth={2} />
              </RowBtn>
            </>
          ) : (
            <RowBtn
              title="Start (s)"
              tone="running"
              onClick={(e) => {
                e.stopPropagation();
                onAction("start", c);
              }}
            >
              <Play size={14} strokeWidth={2} />
            </RowBtn>
          )}
          <RowBtn
            title="Logs (l)"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLogs(c.id);
            }}
          >
            <Logs size={14} strokeWidth={2} />
          </RowBtn>
        </div>
      </div>
    </div>
  );
}

function RowBtn({
  children,
  title,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: "danger" | "running";
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded text-muted-subtle hover:bg-surface-active",
        tone === "danger"
          ? "hover:text-danger"
          : tone === "running"
            ? "hover:text-running"
            : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export const ContainerRow = memo(RowImpl, (prev, next) => {
  return (
    prev.container === next.container &&
    prev.selected === next.selected &&
    prev.mode === next.mode
  );
});
