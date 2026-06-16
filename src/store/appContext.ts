import { createContext, useContext } from "react";
import type {
  Container,
  ContainerFilter,
  DetailTab,
  SortDir,
  SortKey,
  HostInfo,
  UiPerformanceMode,
  UiTheme,
} from "../lib/types";

export type ToastKind = "info" | "success" | "warn" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

export type ContainerAction =
  | "start"
  | "stop"
  | "restart"
  | "kill"
  | "pause"
  | "unpause"
  | "remove";

export interface AppState {
  // data
  containers: Container[];
  host: HostInfo;

  // ui mode
  mode: UiPerformanceMode;
  setMode: (m: UiPerformanceMode) => void;
  toggleMode: () => void;

  // color theme
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  toggleTheme: () => void;

  // selection
  selectedId: string | null;
  select: (id: string | null) => void;
  selectedContainer: Container | null;

  // detail
  detailTab: DetailTab;
  setDetailTab: (t: DetailTab) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;

  // filtering & sorting
  query: string;
  setQuery: (q: string) => void;
  filter: ContainerFilter;
  setFilter: (f: ContainerFilter) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  setSort: (key: SortKey) => void;
  visibleContainers: Container[];

  // command palette
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  // refresh
  refreshTick: number;
  refresh: () => void;

  // toasts
  toasts: Toast[];
  pushToast: (kind: ToastKind, text: string) => void;
  dismissToast: (id: number) => void;

  // container actions (mock runtime or real backend runtime)
  runAction: (action: ContainerAction, container: Container) => void;
}

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
