import { useCallback, useMemo } from "react";
import { useHotkeys, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import { useAppState, type ContainerAction } from "../store/appContext";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Global keyboard-first UX. Mounted once at app root.
 */
export function useKeyboardShortcuts(
  searchRef: React.RefObject<HTMLInputElement | null>,
) {
  const s = useAppState();

  const visible = s.visibleContainers;
  const selected = s.selectedContainer;

  const moveTo = useCallback((next: number) => {
    if (visible.length === 0) return;
    const clamped = Math.max(0, Math.min(visible.length - 1, next));
    s.select(visible[clamped].id);
  }, [s, visible]);

  const selectedIndex = s.selectedId
    ? visible.findIndex((c) => c.id === s.selectedId)
    : -1;

  const runSelectedAction = useCallback((e: KeyboardEvent, action: ContainerAction) => {
    if (!selected) return;
    e.preventDefault();
    s.runAction(action, selected);
  }, [s, selected]);

  const openDetailTab = useCallback((tab: "logs" | "inspect") => {
    s.setDetailTab(tab);
    s.setDetailOpen(true);
  }, [s]);

  const hotkeys = useMemo<UseHotkeyDefinition[]>(
    () => [
      {
        hotkey: "Mod+K",
        callback: () => s.setPaletteOpen(!s.paletteOpen),
        options: { ignoreInputs: false },
      },
      {
        hotkey: "Escape",
        callback: (e) => {
          if (s.paletteOpen) {
            s.setPaletteOpen(false);
            return;
          }
          if (isTypingTarget(e.target)) (e.target as HTMLElement).blur();
        },
        options: { ignoreInputs: false, preventDefault: false },
      },
      {
        hotkey: "/",
        callback: () => {
          searchRef.current?.focus();
          searchRef.current?.select();
        },
        options: { enabled: !s.paletteOpen },
      },
      {
        hotkey: "J",
        callback: () => moveTo(selectedIndex < 0 ? 0 : selectedIndex + 1),
        options: { enabled: !s.paletteOpen },
      },
      {
        hotkey: "ArrowDown",
        callback: () => moveTo(selectedIndex < 0 ? 0 : selectedIndex + 1),
        options: { enabled: !s.paletteOpen },
      },
      {
        hotkey: "K",
        callback: () => moveTo(selectedIndex < 0 ? 0 : selectedIndex - 1),
        options: { enabled: !s.paletteOpen },
      },
      {
        hotkey: "ArrowUp",
        callback: () => moveTo(selectedIndex < 0 ? 0 : selectedIndex - 1),
        options: { enabled: !s.paletteOpen },
      },
      {
        hotkey: "G",
        callback: () => moveTo(0),
        options: { enabled: !s.paletteOpen },
      },
      {
        hotkey: "Shift+G",
        callback: () => moveTo(visible.length - 1),
        options: { enabled: !s.paletteOpen },
      },
      {
        hotkey: "Enter",
        callback: () => openDetailTab("logs"),
        options: { enabled: !s.paletteOpen && !!selected },
      },
      {
        hotkey: "L",
        callback: () => openDetailTab("logs"),
        options: { enabled: !s.paletteOpen && !!selected },
      },
      {
        hotkey: "I",
        callback: () => openDetailTab("inspect"),
        options: { enabled: !s.paletteOpen && !!selected },
      },
      {
        hotkey: "R",
        callback: (e) => {
          if (selected?.state === "running") runSelectedAction(e, "restart");
        },
        options: { enabled: !s.paletteOpen && !!selected },
      },
      {
        hotkey: "S",
        callback: (e) => {
          if (!selected) return;
          runSelectedAction(e, selected.state === "running" ? "stop" : "start");
        },
        options: { enabled: !s.paletteOpen && !!selected },
      },
    ],
    [
      s,
      searchRef,
      selected,
      selectedIndex,
      visible,
      moveTo,
      openDetailTab,
      runSelectedAction,
    ],
  );

  useHotkeys(hotkeys, {
    eventType: "keydown",
    preventDefault: true,
    stopPropagation: true,
  });
}
