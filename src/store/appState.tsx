import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Container,
  ContainerFilter,
  DetailTab,
  SortDir,
  SortKey,
  UiPerformanceMode,
} from "../lib/types";
import {
  createMockContainers,
  MOCK_HOST,
  tickContainers,
  tickHost,
} from "../lib/mockData";
import {
  AppStateContext,
  type AppState,
  type ContainerAction,
  type Toast,
  type ToastKind,
} from "./appContext";

let toastSeq = 0;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [containers, setContainers] = useState<Container[]>(() =>
    createMockContainers(),
  );
  const [host, setHost] = useState(MOCK_HOST);

  const [mode, setMode] = useState<UiPerformanceMode>("low");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => createMockContainers()[2]?.id ?? null,
  );
  const [detailTab, setDetailTab] = useState<DetailTab>("logs");
  const [detailOpen, setDetailOpen] = useState(true);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContainerFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (kind: ToastKind, text: string) => {
      const id = ++toastSeq;
      setToasts((t) => [...t, { id, kind, text }]);
      window.setTimeout(() => dismissToast(id), 3200);
    },
    [dismissToast],
  );

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === "low" ? "high" : "low";
      return next;
    });
  }, []);

  // Live stats simulation. High mode updates ~1s for a lively feel;
  // Low mode updates every ~4s to mimic cheaper polling on weak hardware.
  useEffect(() => {
    const interval = mode === "high" ? 1000 : 4000;
    const id = window.setInterval(() => {
      setContainers((prev) => tickContainers(prev));
      setHost((h) => tickHost(h));
    }, interval);
    return () => window.clearInterval(id);
  }, [mode]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setDetailOpen(true);
  }, []);

  const setSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir(key === "name" || key === "state" ? "asc" : "desc");
      return key;
    });
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const runAction = useCallback(
    (action: ContainerAction, container: Container) => {
      setContainers((prev) =>
        prev.map((c) => {
          if (c.id !== container.id) return c;
          switch (action) {
            case "start":
              return { ...c, state: "running", status: "Up 1 second", health: "starting" };
            case "stop":
            case "kill":
              return {
                ...c,
                state: "exited",
                status: action === "kill" ? "Exited (137) 1 second ago" : "Exited (0) 1 second ago",
                health: "none",
                cpuPercent: 0,
                networkRxRate: 0,
                networkTxRate: 0,
              };
            case "restart":
              return { ...c, state: "running", status: "Up 1 second", health: "starting", startedAt: Date.now() };
            case "pause":
              return { ...c, state: "paused", status: c.status + " (Paused)", cpuPercent: 0 };
            case "unpause":
              return { ...c, state: "running", status: c.status.replace(" (Paused)", "") };
            default:
              return c;
          }
        }),
      );

      if (action === "remove") {
        setContainers((prev) => prev.filter((c) => c.id !== container.id));
        setSelectedId((cur) => (cur === container.id ? null : cur));
      }

      const verb: Record<ContainerAction, string> = {
        start: "Started",
        stop: "Stopped",
        restart: "Restarted",
        kill: "Killed",
        pause: "Paused",
        unpause: "Resumed",
        remove: "Removed",
      };
      pushToast(
        action === "kill" || action === "remove" ? "warn" : "success",
        `${verb[action]} ${container.name}`,
      );
    },
    [pushToast],
  );

  const visibleContainers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = containers.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.image.toLowerCase().includes(q))
        return false;
      switch (filter) {
        case "running":
          return c.state === "running";
        case "stopped":
          return c.state === "exited" || c.state === "paused";
        case "unhealthy":
          return c.health === "unhealthy";
        default:
          return true;
      }
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const stateRank: Record<string, number> = {
      running: 0,
      restarting: 1,
      paused: 2,
      exited: 3,
    };
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "state":
          return (stateRank[a.state] - stateRank[b.state]) * dir;
        case "mem":
          return (a.memoryUsageMb - b.memoryUsageMb) * dir;
        case "cpu":
        default:
          return (a.cpuPercent - b.cpuPercent) * dir;
      }
    });
    return list;
  }, [containers, query, filter, sortKey, sortDir]);

  const selectedContainer = useMemo(
    () => containers.find((c) => c.id === selectedId) ?? null,
    [containers, selectedId],
  );

  const value = useMemo<AppState>(
    () => ({
      containers,
      host,
      mode,
      setMode,
      toggleMode,
      selectedId,
      select,
      selectedContainer,
      detailTab,
      setDetailTab,
      detailOpen,
      setDetailOpen,
      query,
      setQuery,
      filter,
      setFilter,
      sortKey,
      sortDir,
      setSort,
      visibleContainers,
      paletteOpen,
      setPaletteOpen,
      refreshTick,
      refresh,
      toasts,
      pushToast,
      dismissToast,
      runAction,
    }),
    [
      containers,
      host,
      mode,
      toggleMode,
      selectedId,
      select,
      selectedContainer,
      detailTab,
      detailOpen,
      query,
      filter,
      sortKey,
      sortDir,
      setSort,
      visibleContainers,
      paletteOpen,
      refreshTick,
      refresh,
      toasts,
      pushToast,
      dismissToast,
      runAction,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
