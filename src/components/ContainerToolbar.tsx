import { useAppState } from "../store/appContext";
import type { ContainerFilter, SortKey } from "../lib/types";
import { cn } from "../lib/cn";
import { Kbd } from "./primitives";
import {
  ChevronDown as IconChevronDown,
  ChevronUp as IconChevronUp,
  Command as IconCommand,
  RefreshCw as IconRefresh,
  Search as IconSearch,
} from "lucide-react";

const FILTERS: { key: ContainerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "running", label: "Running" },
  { key: "stopped", label: "Stopped" },
  { key: "unhealthy", label: "Unhealthy" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "cpu", label: "CPU" },
  { key: "mem", label: "RAM" },
  { key: "name", label: "Name" },
  { key: "state", label: "State" },
];

interface Props {
  searchRef: React.Ref<HTMLInputElement>;
}

export function ContainerToolbar({ searchRef }: Props) {
  const s = useAppState();

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      {/* Search */}
      <div className="relative flex w-64 items-center">
        <IconSearch
          width={13}
          height={13}
          className="pointer-events-none absolute left-2 text-faint"
        />
        <input
          ref={searchRef}
          value={s.query}
          onChange={(e) => s.setQuery(e.target.value)}
          placeholder="Search containers…"
          spellCheck={false}
          className="h-7 w-full rounded-lg border border-border bg-surface pl-7 pr-12 text-[12px] text-foreground placeholder:text-faint outline-none focus:border-border-hover focus:ring-1 focus:ring-accent/30"
        />
        <span className="pointer-events-none absolute right-2">
          <Kbd>/</Kbd>
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background-elevated p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => s.setFilter(f.key)}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium",
              s.filter === f.key
                ? "bg-surface-active text-foreground"
                : "text-muted-subtle hover:text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1">
        {/*<span className="text-[11px] text-faint">Sort</span>*/}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background-elevated p-1">
          {SORTS.map((sort) => {
            const active = s.sortKey === sort.key;
            return (
              <button
                key={sort.key}
                type="button"
                onClick={() => s.setSort(sort.key)}
                className={cn(
                  "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium",
                  active
                    ? "bg-surface-active text-foreground"
                    : "text-muted-subtle hover:text-muted",
                )}
              >
                {sort.label}
                {active &&
                  (s.sortDir === "asc" ? (
                    <IconChevronUp width={11} height={11} />
                  ) : (
                    <IconChevronDown width={11} height={11} />
                  ))}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-[11px] tabular text-faint">
          {s.visibleContainers.length} / {s.containers.length}
        </span>

        <button
          type="button"
          onClick={s.refresh}
          title="Refresh"
          className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-[11px] font-medium text-muted hover:border-border-hover hover:text-foreground"
        >
          <IconRefresh width={12} height={12} />
          Refresh
        </button>

        <button
          type="button"
          onClick={() => s.setPaletteOpen(true)}
          className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-[11px] font-medium text-muted hover:border-border-hover hover:text-foreground"
        >
          <IconCommand width={12} height={12} />
          <span>Commands</span>
          <span className="flex items-center gap-0.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>
    </div>
  );
}
