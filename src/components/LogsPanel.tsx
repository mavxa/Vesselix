import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Container, LogLine, UiPerformanceMode } from "../lib/types";
import { generateLogBacklog, generateLogLine } from "../lib/mockLogs";
import { formatTimestampMs } from "../lib/format";
import { logLevelColor } from "./status";
import { cn } from "../lib/cn";
import { Kbd } from "./primitives";
import {
  IconClose,
  IconCopy,
  IconPause,
  IconPlay,
  IconSearch,
  IconTrash,
} from "./icons";

const LINE_HEIGHT = 19;
const TAIL_LIMITS = [100, 500, 1000] as const;
type TailLimit = (typeof TAIL_LIMITS)[number];

interface Props {
  container: Container;
  mode: UiPerformanceMode;
}

export function LogsPanel({ container, mode }: Props) {
  const [limit, setLimit] = useState<TailLimit>(500);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const [follow, setFollow] = useState(true);
  const [search, setSearch] = useState("");
  const [wrap, setWrap] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const seqRef = useRef(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const running = container.state === "running";

  // Seed backlog whenever the container changes.
  useEffect(() => {
    const backlog = generateLogBacklog(container.name, limit);
    seqRef.current = backlog.length;
    setLines(backlog);
    setPaused(false);
    setFollow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container.id]);

  // Trim when limit shrinks.
  useEffect(() => {
    setLines((prev) => (prev.length > limit ? prev.slice(prev.length - limit) : prev));
  }, [limit]);

  // Live tail. Interval depends on mode (slower in Low).
  useEffect(() => {
    if (paused || !running) return;
    const interval = mode === "low" ? 1400 : 700;
    const id = window.setInterval(() => {
      setLines((prev) => {
        const burst = 1 + Math.floor(Math.random() * (mode === "low" ? 2 : 3));
        const next = prev.slice();
        for (let i = 0; i < burst; i++) {
          next.push(generateLogLine(container.name, seqRef.current++));
        }
        if (next.length > limit) next.splice(0, next.length - limit);
        return next;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [paused, running, mode, limit, container.name]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => l.text.toLowerCase().includes(q));
  }, [lines, deferredSearch]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LINE_HEIGHT,
    overscan: 18,
  });

  // Auto-follow: keep pinned to bottom unless the user scrolled up.
  useEffect(() => {
    if (!follow) return;
    rowVirtualizer.scrollToIndex(filtered.length - 1, { align: "end" });
  }, [filtered.length, follow, rowVirtualizer]);

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setFollow(atBottom);
  }, []);

  const copyAll = useCallback(() => {
    const text = filtered
      .map((l) => `${formatTimestampMs(l.ts)} ${l.text}`)
      .join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
  }, [filtered]);

  const clearView = useCallback(() => {
    setLines([]);
    seqRef.current = 0;
  }, []);

  const items = rowVirtualizer.getVirtualItems();
  const highlight = mode === "high" && !!deferredSearch.trim();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Logs toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-background px-2.5">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          disabled={!running}
          className={cn(
            "flex h-6 items-center gap-1 rounded border px-1.5 text-[11px] font-medium disabled:opacity-40",
            paused
              ? "border-warning/40 text-warning"
              : "border-border bg-surface text-muted hover:text-foreground",
          )}
          title={paused ? "Resume tail" : "Pause tail"}
        >
          {paused ? <IconPlay width={11} height={11} /> : <IconPause width={11} height={11} />}
          {paused ? "Paused" : "Live"}
        </button>

        <button
          type="button"
          onClick={() => {
            setFollow(true);
            rowVirtualizer.scrollToIndex(filtered.length - 1, { align: "end" });
          }}
          className={cn(
            "flex h-6 items-center rounded border px-1.5 text-[11px] font-medium",
            follow
              ? "border-accent/40 text-accent"
              : "border-border bg-surface text-muted hover:text-foreground",
          )}
          title="Follow bottom"
        >
          Follow
        </button>

        {/* Search inside logs */}
        <div className="relative flex w-48 items-center">
          <IconSearch width={12} height={12} className="pointer-events-none absolute left-2 text-faint" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs…"
            spellCheck={false}
            className="h-6 w-full rounded border border-border bg-surface pl-7 pr-6 text-[11px] text-foreground placeholder:text-faint outline-none focus:border-border-hover"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-1.5 text-faint hover:text-muted"
            >
              <IconClose width={11} height={11} />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Tail limit */}
          <div className="flex items-center gap-0.5 rounded border border-border bg-background-elevated p-0.5">
            {TAIL_LIMITS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] tabular font-medium",
                  limit === n
                    ? "bg-surface-active text-foreground"
                    : "text-muted-subtle hover:text-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setWrap((w) => !w)}
            className={cn(
              "h-6 rounded border px-1.5 text-[11px] font-medium",
              wrap
                ? "border-accent/40 text-accent"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
            title="Toggle line wrap"
          >
            Wrap
          </button>

          <button
            type="button"
            onClick={copyAll}
            className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-muted hover:text-foreground"
            title="Copy visible lines"
          >
            <IconCopy width={12} height={12} />
          </button>
          <button
            type="button"
            onClick={clearView}
            className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-muted hover:text-danger"
            title="Clear view"
          >
            <IconTrash width={12} height={12} />
          </button>
        </div>
      </div>

      {/* Virtualized log viewport */}
      <div
        ref={parentRef}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 overflow-auto bg-background-elevated font-mono text-[11.5px] leading-[19px]"
      >
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-faint">
            {lines.length === 0 ? "No log output." : "No lines match the filter."}
          </div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {items.map((vi) => {
              const line = filtered[vi.index];
              return (
                <LogRow
                  key={line.id}
                  line={line}
                  top={vi.start}
                  wrap={wrap}
                  highlight={highlight ? deferredSearch.trim() : null}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Logs status footer */}
      <div className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-background px-2.5 text-[10px] text-faint">
        <span className="tabular">{filtered.length} lines</span>
        {search && <span className="tabular">filtered from {lines.length}</span>}
        <span className="ml-auto flex items-center gap-1">
          press <Kbd>/</Kbd> in table to search containers
        </span>
      </div>
    </div>
  );
}

function LogRow({
  line,
  top,
  wrap,
  highlight,
}: {
  line: LogLine;
  top: number;
  wrap: boolean;
  highlight: string | null;
}) {
  const levelColor = logLevelColor(line.level);
  const isProblem = line.level === "error" || line.level === "warn";

  return (
    <div
      className={cn(
        "absolute left-0 right-0 flex gap-2 px-2.5",
        wrap ? "items-start" : "items-center whitespace-nowrap",
      )}
      style={{
        top,
        minHeight: LINE_HEIGHT,
        background: isProblem ? `color-mix(in srgb, ${levelColor} 7%, transparent)` : undefined,
      }}
    >
      <span className="shrink-0 select-none text-faint tabular">
        {formatTimestampMs(line.ts)}
      </span>
      <span
        className="w-9 shrink-0 select-none text-[10px] font-medium uppercase"
        style={{ color: levelColor }}
      >
        {line.level}
      </span>
      <span
        className={cn(
          "text-muted",
          wrap ? "whitespace-pre-wrap break-all" : "truncate",
        )}
        style={isProblem ? { color: levelColor } : undefined}
      >
        {highlight ? <Highlighted text={line.text} term={highlight} /> : line.text}
      </span>
    </div>
  );
}

function Highlighted({ text, term }: { text: string; term: string }) {
  const lower = text.toLowerCase();
  const t = term.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(t, i);
    if (idx < 0) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark
        key={key++}
        className="rounded-sm"
        style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
      >
        {text.slice(idx, idx + term.length)}
      </mark>,
    );
    i = idx + term.length;
  }
  return <>{out}</>;
}
