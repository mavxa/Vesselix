import { useEffect, useRef } from "react";
import { useAppState } from "../store/appContext";
import type { SortKey } from "../lib/types";
import { cn } from "../lib/cn";
import { TABLE_GRID } from "./tableLayout";
import { ContainerRow } from "./ContainerRow";
import {
  ChevronDown as IconChevronDown,
  ChevronUp as IconChevronUp,
} from "lucide-react";

interface HeaderCell {
  label: string;
  align?: "left" | "right";
  sort?: SortKey;
}

// HEADER_CELLS must match TABLE_GRID column order used by ContainerRow:
// Name, State, Health, CPU, Memory, Net I/O, Ports, Image·Uptime, Actions
const HEADER_CELLS: HeaderCell[] = [
  { label: "Name", sort: "name" },
  { label: "State", sort: "state" },
  { label: "Health" },
  { label: "CPU", align: "right", sort: "cpu" },
  { label: "Memory", sort: "mem" },
  { label: "Net I/O" },
  { label: "Ports" },
  { label: "Image · Uptime" },
  { label: "" },
];

export function ContainerTable() {
  const s = useAppState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep selected row in view when navigating via keyboard.
  useEffect(() => {
    if (!s.selectedId) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-row-id="${s.selectedId}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [s.selectedId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div
        className={cn(
          "h-7 shrink-0 border-b border-border bg-background px-3 text-[10px] font-medium uppercase tracking-wide text-faint",
          TABLE_GRID,
        )}
      >
        {HEADER_CELLS.map((h, i) => {
          const active = h.sort && s.sortKey === h.sort;
          const content = (
            <span
              className={cn(
                "inline-flex items-center gap-0.5",
                active && "text-muted",
              )}
            >
              {h.label}
              {active &&
                (s.sortDir === "asc" ? (
                  <IconChevronUp width={10} height={10} />
                ) : (
                  <IconChevronDown width={10} height={10} />
                ))}
            </span>
          );
          return (
            <div
              key={i}
              className={cn(
                "flex items-center",
                h.align === "right" && "justify-end",
              )}
            >
              {h.sort ? (
                <button
                  type="button"
                  onClick={() => s.setSort(h.sort!)}
                  className="hover:text-muted"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>

      {/* Rows */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {s.visibleContainers.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-faint">
            No containers match the current filter.
          </div>
        ) : (
          s.visibleContainers.map((c) => (
            <div key={c.id} data-row-id={c.id}>
              <ContainerRow
                container={c}
                selected={c.id === s.selectedId}
                mode={s.mode}
                onSelect={s.select}
                onOpenLogs={(id) => {
                  s.select(id);
                  s.setDetailTab("logs");
                  s.setDetailOpen(true);
                }}
                onAction={s.runAction}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
