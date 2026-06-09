import { useMemo, useRef, useState } from "react";
import { useAppState } from "../store/appContext";
import { cn } from "../lib/cn";
import { Kbd } from "./primitives";
import { stateTone } from "./status";
import { StatusDot } from "./primitives";
import {
  IconBolt,
  IconInspect,
  IconLeaf,
  IconLogs,
  IconPlay,
  IconRefresh,
  IconRestart,
  IconSearch,
  IconStats,
  IconStop,
} from "./icons";

interface Command {
  id: string;
  title: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
  hint?: string;
  disabled?: boolean;
  run: () => void;
}

export function CommandPalette() {
  const { paletteOpen } = useAppState();
  // Mount the inner palette only while open so it always starts with
  // fresh state — no reset-in-effect needed.
  if (!paletteOpen) return null;
  return <PaletteInner />;
}

function PaletteInner() {
  const s = useAppState();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sel = s.selectedContainer;
  const hasSel = !!sel;

  const commands = useMemo<Command[]>(() => {
    const close = (fn: () => void) => () => {
      fn();
      s.setPaletteOpen(false);
    };
    const selName = sel ? ` "${sel.name}"` : "";

    return [
      {
        id: "restart",
        title: `Restart container${selName}`,
        group: "Container",
        icon: <IconRestart width={14} height={14} />,
        hint: "r",
        disabled: !hasSel || sel?.state !== "running",
        run: close(() => sel && s.runAction("restart", sel)),
      },
      {
        id: "stop",
        title: `Stop container${selName}`,
        group: "Container",
        icon: <IconStop width={12} height={12} />,
        hint: "s",
        disabled: !hasSel || sel?.state !== "running",
        run: close(() => sel && s.runAction("stop", sel)),
      },
      {
        id: "start",
        title: `Start container${selName}`,
        group: "Container",
        icon: <IconPlay width={12} height={12} />,
        disabled: !hasSel || sel?.state === "running",
        run: close(() => sel && s.runAction("start", sel)),
      },
      {
        id: "logs",
        title: "Open logs",
        group: "View",
        icon: <IconLogs width={14} height={14} />,
        hint: "l",
        disabled: !hasSel,
        run: close(() => {
          s.setDetailTab("logs");
          s.setDetailOpen(true);
        }),
      },
      {
        id: "stats",
        title: "Open stats",
        group: "View",
        icon: <IconStats width={14} height={14} />,
        disabled: !hasSel,
        run: close(() => {
          s.setDetailTab("stats");
          s.setDetailOpen(true);
        }),
      },
      {
        id: "inspect",
        title: "Inspect container",
        group: "View",
        icon: <IconInspect width={14} height={14} />,
        hint: "i",
        disabled: !hasSel,
        run: close(() => {
          s.setDetailTab("inspect");
          s.setDetailOpen(true);
        }),
      },
      {
        id: "filter-running",
        title: "Filter: Running",
        group: "Filter",
        icon: <FilterDot color="var(--running)" />,
        keywords: "show running",
        run: close(() => s.setFilter("running")),
      },
      {
        id: "filter-stopped",
        title: "Filter: Stopped",
        group: "Filter",
        icon: <FilterDot color="var(--danger)" />,
        keywords: "show stopped exited",
        run: close(() => s.setFilter("stopped")),
      },
      {
        id: "filter-unhealthy",
        title: "Filter: Unhealthy",
        group: "Filter",
        icon: <FilterDot color="var(--warning)" />,
        keywords: "show unhealthy",
        run: close(() => s.setFilter("unhealthy")),
      },
      {
        id: "filter-all",
        title: "Filter: All",
        group: "Filter",
        icon: <FilterDot color="var(--muted-subtle)" />,
        run: close(() => s.setFilter("all")),
      },
      {
        id: "mode-low",
        title: "Toggle Low mode",
        group: "Mode",
        icon: <IconLeaf width={14} height={14} />,
        keywords: "performance lightweight",
        run: close(() => s.setMode("low")),
      },
      {
        id: "mode-high",
        title: "Toggle High mode",
        group: "Mode",
        icon: <IconBolt width={14} height={14} />,
        keywords: "performance charts rich",
        run: close(() => s.setMode("high")),
      },
      {
        id: "refresh",
        title: "Refresh containers",
        group: "App",
        icon: <IconRefresh width={14} height={14} />,
        run: close(() => s.refresh()),
      },
    ];
  }, [s, sel, hasSel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      (c.title + " " + c.group + " " + (c.keywords ?? "")).toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Clamp the active index during render — no effect needed.
  const activeIdx = Math.min(active, Math.max(0, filtered.length - 1));

  const moveActive = (delta: number) => {
    setActive((a) => {
      const cur = Math.min(a, Math.max(0, filtered.length - 1));
      const n = filtered.length;
      if (n === 0) return 0;
      let next = cur;
      // skip disabled entries
      for (let i = 0; i < n; i++) {
        next = (next + delta + n) % n;
        if (!filtered[next].disabled) break;
      }
      // scroll into view
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector(`[data-cmd-idx="${next}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIdx];
      if (cmd && !cmd.disabled) cmd.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      s.setPaletteOpen(false);
    }
  };

  return (
    <div
      className="vx-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={() => s.setPaletteOpen(false)}
    >
      <div
        className="vx-pop-in w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-background-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 border-b border-border px-3">
          <IconSearch width={15} height={15} className="text-faint" />
          <input
            ref={inputRef}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command…"
            spellCheck={false}
            className="h-11 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-faint outline-none"
          />
          {sel && (
            <span className="flex items-center gap-1 text-[11px] text-faint">
              <StatusDot color={stateTone(sel.state).color} size={6} />
              {sel.name}
            </span>
          )}
          <Kbd>Esc</Kbd>
        </div>

        {/* List */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-faint">
              No matching commands
            </div>
          ) : (
            renderGrouped(filtered, activeIdx, setActive)
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border bg-background px-3 py-1.5 text-[10.5px] text-faint">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> run
          </span>
          <span className="ml-auto">{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}

function renderGrouped(
  cmds: Command[],
  active: number,
  setActive: (i: number) => void,
) {
  const out: React.ReactNode[] = [];
  let lastGroup = "";
  cmds.forEach((cmd, idx) => {
    if (cmd.group !== lastGroup) {
      lastGroup = cmd.group;
      out.push(
        <div
          key={`g-${cmd.group}`}
          className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-faint"
        >
          {cmd.group}
        </div>,
      );
    }
    const isActive = idx === active;
    out.push(
      <button
        key={cmd.id}
        type="button"
        data-cmd-idx={idx}
        disabled={cmd.disabled}
        onMouseEnter={() => !cmd.disabled && setActive(idx)}
        onClick={() => !cmd.disabled && cmd.run()}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] disabled:opacity-35",
          isActive && !cmd.disabled ? "bg-accent-soft" : "hover:bg-surface-hover",
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded",
            isActive ? "text-accent" : "text-muted-subtle",
          )}
          style={{ background: "var(--surface-active)" }}
        >
          {cmd.icon}
        </span>
        <span className="flex-1 text-foreground">{cmd.title}</span>
        {cmd.hint && <Kbd>{cmd.hint}</Kbd>}
      </button>,
    );
  });
  return out;
}

function FilterDot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}
