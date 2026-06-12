import { useMemo } from "react";
import { useAppState } from "../store/appContext";
import { containerCounts } from "./status";
import { formatMb, formatPercent } from "../lib/format";
import { StatusDot } from "./primitives";
import { ModeToggle } from "./ModeToggle";
import { cpuColor, memColor } from "./status";
import { Plug as IconPlug } from "lucide-react";

function Sep() {
  return <span className="h-3.5 w-px bg-border" aria-hidden />;
}

export function TopStatusBar() {
  const { host, containers } = useAppState();
  const counts = useMemo(() => containerCounts(containers), [containers]);

  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-background-elevated px-3 text-[12px]">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-1">
        <img
          src="/favicon.svg"
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0"
          aria-hidden
        />
        <span className="font-semibold tracking-tight text-foreground">
          Vesselix
        </span>
      </div>

      <Sep />

      {/* Host */}
      <span className="text-muted-subtle">
        <span className="text-muted">{host.hostname}</span>
        <span className="ml-1 text-faint">
          {host.os.split(" ")[0]} · {host.arch}
        </span>
      </span>

      <Sep />

      {/* Docker connection */}
      <span className="flex items-center gap-1.5">
        <StatusDot
          color={host.dockerConnected ? "var(--running)" : "var(--danger)"}
          pulse={host.dockerConnected}
        />
        <span className="text-muted">
          {host.dockerConnected ? "Docker connected" : "Disconnected"}
        </span>
        <span className="flex items-center gap-1 text-faint">
          <IconPlug width={11} height={11} />v{host.engineVersion}
        </span>
      </span>

      <Sep />

      {/* Container counts */}
      <span className="flex items-center gap-2 tabular">
        <span className="flex items-center gap-1">
          <StatusDot color="var(--running)" size={6} />
          <span className="text-muted">{counts.running}</span>
          <span className="text-faint">running</span>
        </span>
        <span className="flex items-center gap-1">
          <StatusDot color="var(--danger)" size={6} />
          <span className="text-muted">{counts.stopped}</span>
          <span className="text-faint">stopped</span>
        </span>
        {counts.unhealthy > 0 && (
          <span className="flex items-center gap-1">
            <StatusDot color="var(--warning)" size={6} pulse />
            <span className="text-muted">{counts.unhealthy}</span>
            <span className="text-faint">unhealthy</span>
          </span>
        )}
      </span>

      {/* Right cluster: host metrics + mode */}
      <div className="ml-auto flex items-center gap-3">
        <HostMetric
          label="CPU"
          value={formatPercent(host.cpuPercent, 0)}
          color={cpuColor(host.cpuPercent)}
          sub={`${host.cpuCores} cores`}
        />
        <Sep />
        <HostMetric
          label="RAM"
          value={`${formatMb(host.memUsedMb)} / ${formatMb(host.memTotalMb)}`}
          color={memColor(host.memUsedMb, host.memTotalMb)}
        />
        <Sep />
        <ModeToggle />
      </div>
    </header>
  );
}

function HostMetric({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <span className="flex items-center gap-1.5 tabular">
      <span className="text-faint">{label}</span>
      <span className="font-medium" style={{ color }}>
        {value}
      </span>
      {sub && <span className="text-faint">{sub}</span>}
    </span>
  );
}
