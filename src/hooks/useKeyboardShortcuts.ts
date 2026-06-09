import { useEffect } from "react";
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
export function useKeyboardShortcuts(searchRef: React.RefObject<HTMLInputElement | null>) {
  const s = useAppState();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/Cmd+K → command palette (always available).
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setPaletteOpen(!s.paletteOpen);
        return;
      }

      if (e.key === "Escape") {
        if (s.paletteOpen) {
          s.setPaletteOpen(false);
          return;
        }
      }

      // When the palette is open, let it handle its own keys.
      if (s.paletteOpen) return;

      // "/" focuses search, even helps from anywhere non-typing.
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (isTypingTarget(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }

      const list = s.visibleContainers;
      const idx = s.selectedId
        ? list.findIndex((c) => c.id === s.selectedId)
        : -1;

      const moveTo = (next: number) => {
        if (list.length === 0) return;
        const clamped = Math.max(0, Math.min(list.length - 1, next));
        s.select(list[clamped].id);
      };

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          moveTo(idx < 0 ? 0 : idx + 1);
          return;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          moveTo(idx < 0 ? 0 : idx - 1);
          return;
        case "g":
          e.preventDefault();
          moveTo(0);
          return;
        case "G":
          e.preventDefault();
          moveTo(list.length - 1);
          return;
      }

      const sel = s.selectedContainer;
      if (!sel) return;

      const act = (a: ContainerAction) => {
        e.preventDefault();
        s.runAction(a, sel);
      };

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          s.setDetailOpen(true);
          s.setDetailTab("logs");
          return;
        case "l":
          e.preventDefault();
          s.setDetailTab("logs");
          s.setDetailOpen(true);
          return;
        case "i":
          e.preventDefault();
          s.setDetailTab("inspect");
          s.setDetailOpen(true);
          return;
        case "r":
          if (sel.state === "running") act("restart");
          return;
        case "s":
          if (sel.state === "running") act("stop");
          else act("start");
          return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, searchRef]);
}
