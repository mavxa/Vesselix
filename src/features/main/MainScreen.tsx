import { useRef } from "react";
import { AppStateProvider } from "../../store/appState";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { TopStatusBar } from "../../components/TopStatusBar";
import { ContainerToolbar } from "../../components/ContainerToolbar";
import { ContainerTable } from "../../components/ContainerTable";
import { ContainerDetailPanel } from "../../components/ContainerDetailPanel";
import { SplitLayout } from "../../components/SplitLayout";
import { CommandPalette } from "../../components/CommandPalette";
import { Toaster } from "../../components/Toaster";
import { useAppState } from "../../store/appContext";

export function MainScreen() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}

function Shell() {
  const searchRef = useRef<HTMLInputElement>(null);
  const { mode } = useAppState();
  useKeyboardShortcuts(searchRef);

  // Animations are only enabled in High mode (anim class gates all transitions).
  return (
    <div className={mode === "high" ? "anim flex h-screen flex-col" : "flex h-screen flex-col"}>
      <TopStatusBar />
      <ContainerToolbar searchRef={searchRef} />
      <SplitLayout
        table={<ContainerTable />}
        detail={<ContainerDetailPanel />}
      />
      <CommandPalette />
      <Toaster />
    </div>
  );
}
