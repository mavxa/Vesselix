import { useAppState } from "../store/appContext";
import type { DetailTab } from "../lib/types";
import { cn } from "../lib/cn";
import { stateTone, healthTone } from "./status";
import { StatusDot, Badge, Kbd } from "./primitives";
import { shortId } from "../lib/format";
import { LogsPanel } from "./LogsPanel";
import { StatsPanel } from "./StatsPanel";
import { InspectPanel } from "./InspectPanel";
import { ActionsPanel } from "./ActionsPanel";
import {
  IconBolt,
  IconChevronDown,
  IconInspect,
  IconLogs,
  IconStats,
} from "./icons";

const TABS: { key: DetailTab; label: string; icon: React.ReactNode; hint?: string }[] = [
  { key: "logs", label: "Logs", icon: <IconLogs width={13} height={13} />, hint: "l" },
  { key: "stats", label: "Stats", icon: <IconStats width={13} height={13} /> },
  { key: "inspect", label: "Inspect", icon: <IconInspect width={13} height={13} />, hint: "i" },
  { key: "actions", label: "Actions", icon: <IconBolt width={13} height={13} /> },
];

export function ContainerDetailPanel() {
  const s = useAppState();
  const c = s.selectedContainer;

  if (!c) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-subtle">
        <IconInspect width={22} height={22} className="text-faint" />
        <p className="text-[12px]">No container selected</p>
        <p className="text-[11px] text-faint">
          Select a row, or use <Kbd>j</Kbd> <Kbd>k</Kbd> to navigate
        </p>
      </div>
    );
  }

  const st = stateTone(c.state);
  const health = healthTone(c.health);
  const running = c.state === "running";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Detail header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-background-elevated px-3">
        <StatusDot color={st.color} pulse={running} />
        <span className="font-semibold text-foreground">{c.name}</span>
        <Badge color={st.color} soft={st.soft}>
          {st.label}
        </Badge>
        {health && (
          <Badge color={health.color} soft={health.soft}>
            {health.label}
          </Badge>
        )}
        <span className="font-mono text-[11px] text-faint">{shortId(c.id)}</span>

        <button
          type="button"
          onClick={() => s.setDetailOpen(false)}
          className="ml-auto flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-muted-subtle hover:bg-surface-active hover:text-foreground"
          title="Collapse panel"
        >
          <IconChevronDown width={13} height={13} />
          Hide
        </button>
      </div>

      {/* Tabs */}
      <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border bg-background px-2">
        {TABS.map((t) => {
          const active = s.detailTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => s.setDetailTab(t.key)}
              className={cn(
                "relative flex h-full items-center gap-1.5 px-2.5 text-[12px] font-medium",
                active ? "text-foreground" : "text-muted-subtle hover:text-muted",
              )}
            >
              {t.icon}
              {t.label}
              {t.hint && (
                <Kbd className="ml-0.5 opacity-60">{t.hint}</Kbd>
              )}
              {active && (
                <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="min-h-0 flex-1">
        {s.detailTab === "logs" && <LogsPanel container={c} mode={s.mode} />}
        {s.detailTab === "stats" && <StatsPanel container={c} />}
        {s.detailTab === "inspect" && <InspectPanel container={c} />}
        {s.detailTab === "actions" && <ActionsPanel container={c} />}
      </div>
    </div>
  );
}
