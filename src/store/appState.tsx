import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Container,
  ContainerFilter,
  DetailTab,
  HostInfo,
  SortDir,
  SortKey,
  UiPerformanceMode,
  UiTheme,
} from "../lib/types";
import { applyTheme, persistTheme, readStoredTheme } from "../lib/theme";
import { getRuntimeClient } from "../runtime";
import {
  AppStateContext,
  type AppState,
  type ContainerAction,
  type Toast,
  type ToastKind,
} from "./appContext";

let toastSeq = 0;

const EMPTY_HOST: HostInfo = {
  hostname: "connecting",
  dockerConnected: false,
  engineVersion: "unknown",
  apiVersion: "unknown",
  os: "unknown",
  arch: "unknown",
  cpuPercent: 0,
  cpuCores: 0,
  memUsedMb: 0,
  memTotalMb: 0,
};

const EMPTY_CONTAINERS: Container[] = [];

const actionVerb: Record<ContainerAction, string> = {
  start: "Started",
  stop: "Stopped",
  restart: "Restarted",
  kill: "Killed",
  pause: "Paused",
  unpause: "Resumed",
  remove: "Removed",
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const runtime = useMemo(() => getRuntimeClient(), []);

  const [mode, setMode] = useState<UiPerformanceMode>("low");
  const [theme, setTheme] = useState<UiTheme>(() => readStoredTheme());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("logs");
  const [detailOpen, setDetailOpen] = useState(true);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContainerFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refetchInterval = mode === "high" ? 1000 : 4000;

  const containersQuery = useQuery({
    queryKey: ["runtime", runtime.mode, "containers"],
    queryFn: runtime.listContainers,
    refetchInterval,
  });

  const hostQuery = useQuery({
    queryKey: ["runtime", runtime.mode, "host"],
    queryFn: runtime.getHost,
    refetchInterval,
  });

  const containers = containersQuery.data ?? EMPTY_CONTAINERS;
  const host = hostQuery.data ?? EMPTY_HOST;

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

  const actionMutation = useMutation({
    mutationFn: ({ action, container }: { action: ContainerAction; container: Container }) =>
      runtime.runAction(action, container),
    onSuccess: (_data, { action, container }) => {
      void queryClient.invalidateQueries({ queryKey: ["runtime", runtime.mode, "containers"] });
      void queryClient.invalidateQueries({ queryKey: ["runtime", runtime.mode, "host"] });
      if (action === "remove") {
        setSelectedId((cur) => (cur === container.id ? null : cur));
      }
      pushToast(
        action === "kill" || action === "remove" ? "warn" : "success",
        `${actionVerb[action]} ${container.name}`,
      );
    },
    onError: (error, { action, container }) => {
      pushToast("error", `Failed to ${action} ${container.name}: ${String(error)}`);
    },
  });

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "low" ? "high" : "low"));
  }, []);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

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
    void queryClient.invalidateQueries({ queryKey: ["runtime", runtime.mode] });
  }, [queryClient, runtime.mode]);

  const runAction = useCallback(
    (action: ContainerAction, container: Container) => {
      actionMutation.mutate({ action, container });
    },
    [actionMutation],
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
    () => containers.find((c) => c.id === selectedId) ?? containers[0] ?? null,
    [containers, selectedId],
  );
  const effectiveSelectedId = selectedContainer?.id ?? null;

  const value = useMemo<AppState>(
    () => ({
      containers,
      host,
      mode,
      setMode,
      toggleMode,
      theme,
      setTheme,
      toggleTheme,
      selectedId: effectiveSelectedId,
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
      theme,
      toggleTheme,
      effectiveSelectedId,
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
