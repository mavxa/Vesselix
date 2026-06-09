import { useMemo } from "react";
import { useAppState } from "../store/appContext";
import { containerCounts } from "./status";
import { formatMb, formatPercent } from "../lib/format";
import { StatusDot } from "./primitives";
import { ModeToggle } from "./ModeToggle";
import { cpuColor, memColor } from "./status";
import { IconPlug } from "./icons";

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
        <Logo />
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
          <IconPlug width={11} height={11} />
          v{host.engineVersion}
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

function Logo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3 9h18l-2 9a2 2 0 0 1-2 1.6H7A2 2 0 0 1 5 18z"
        fill="var(--accent)"
        opacity="0.18"
      />
      <path
        d="M3 9h18l-2 9a2 2 0 0 1-2 1.6H7A2 2 0 0 1 5 18z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 9V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V9"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <path d="M12 12v4" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
