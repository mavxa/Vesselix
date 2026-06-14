import { useAppState } from "../store/appContext";
import type { Container } from "../lib/types";
import { Sparkline } from "./Sparkline";
import { MeterBar } from "./primitives";
import {
  formatBytes,
  formatMb,
  formatPercent,
  formatRate,
} from "../lib/format";
import { cpuColor, memColor } from "./status";

interface Props {
  container: Container;
}

/**
 * Low mode stats: text metrics + tiny manual sparklines.
 * No chart library, no canvas — cheapest possible.
 */
export function LowStatsPanel({ container: c }: Props) {
  const { mode } = useAppState();
  const running = c.state === "running";

  const cpuValues = c.cpuHistory;
  const cpuAvg =
    cpuValues.reduce((a, b) => a + b, 0) / Math.max(1, cpuValues.length);
  const cpuMax = Math.max(...cpuValues, 0);
  const memRatio = c.memoryLimitMb > 0 ? c.memoryUsageMb / c.memoryLimitMb : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      {mode === "low" && (
        <p className="mb-2 rounded-md border border-border bg-surface px-2 py-1 text-[10.5px] text-faint">
          Low mode — text metrics and inline sparklines only. Switch to High
          mode for time-series charts.
        </p>
      )}

      {/* CPU */}
      <Section
        title="CPU"
        accent={cpuColor(c.cpuPercent)}
        spark={
          <Sparkline
            data={cpuValues}
            color={cpuColor(c.cpuPercent)}
            width={120}
            height={28}
            fill
          />
        }
      >
        <Metric
          label="current"
          value={running ? formatPercent(c.cpuPercent) : "—"}
        />
        <Metric label="average" value={running ? formatPercent(cpuAvg) : "—"} />
        <Metric label="max" value={running ? formatPercent(cpuMax) : "—"} />
        <Metric label="pids" value={running ? String(c.pids) : "—"} />
      </Section>

      {/* Memory */}
      <Section
        title="Memory"
        accent={memColor(c.memoryUsageMb, c.memoryLimitMb)}
        spark={
          <Sparkline
            data={c.memHistory}
            color={memColor(c.memoryUsageMb, c.memoryLimitMb)}
            max={c.memoryLimitMb}
            width={120}
            height={28}
            fill
          />
        }
      >
        <Metric
          label="used"
          value={running ? formatMb(c.memoryUsageMb) : "—"}
        />
        <Metric label="limit" value={formatMb(c.memoryLimitMb)} />
        <Metric
          label="usage"
          value={running ? formatPercent(memRatio * 100, 0) : "—"}
        />
        <div className="col-span-4 mt-1">
          <MeterBar
            ratio={memRatio}
            color={memColor(c.memoryUsageMb, c.memoryLimitMb)}
            height={5}
          />
        </div>
      </Section>

      {/* Network */}
      <Section title="Network">
        <Metric
          label="rx rate"
          value={running ? formatRate(c.networkRxRate) : "—"}
        />
        <Metric
          label="tx rate"
          value={running ? formatRate(c.networkTxRate) : "—"}
        />
        <Metric label="rx total" value={formatBytes(c.networkRxBytes)} />
        <Metric label="tx total" value={formatBytes(c.networkTxBytes)} />
      </Section>

      {/* Block I/O */}
      <Section title="Block I/O">
        <Metric label="read" value={formatBytes(c.blockReadBytes)} />
        <Metric label="write" value={formatBytes(c.blockWriteBytes)} />
      </Section>
    </div>
  );
}

function Section({
  title,
  accent,
  spark,
  children,
}: {
  title: string;
  accent?: string;
  spark?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {accent && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: accent }}
            />
          )}
          {title}
        </span>
        {spark}
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 px-2.5 py-2">
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </span>
      <span className="tabular text-[13px] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
