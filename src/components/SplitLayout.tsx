import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "../store/appContext";
import { cn } from "../lib/cn";
import { IconChevronUp } from "./icons";

interface Props {
  table: React.ReactNode;
  detail: React.ReactNode;
}

const MIN_TOP = 140;
const MIN_BOTTOM = 180;
const STORAGE_KEY = "vesselix:split";

/**
 * Vertical split: container table on top, detail panel on the bottom.
 * The table always stays visible so the user never loses context.
 * Drag the divider to resize; collapse hides the detail panel.
 */
export function SplitLayout({ table, detail }: Props) {
  const { detailOpen, setDetailOpen } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [detailHeight, setDetailHeight] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return saved && saved > MIN_BOTTOM ? saved : 360;
  });
  const draggingRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const fromBottom = rect.bottom - e.clientY;
      const max = rect.height - MIN_TOP;
      const next = Math.max(MIN_BOTTOM, Math.min(max, fromBottom));
      setDetailHeight(next);
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem(STORAGE_KEY, String(detailHeight));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [detailHeight]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {/* Table region */}
      <div className="flex min-h-0 flex-1 flex-col">{table}</div>

      {detailOpen ? (
        <>
          {/* Divider */}
          <div
            onMouseDown={onMouseDown}
            className="group relative flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-t border-border bg-background hover:bg-surface-hover"
          >
            <span className="h-0.5 w-8 rounded-full bg-border-strong group-hover:bg-border-hover" />
          </div>
          {/* Detail region */}
          <div
            className="min-h-0 shrink-0 overflow-hidden border-t border-border bg-background-elevated"
            style={{ height: detailHeight }}
          >
            {detail}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className={cn(
            "flex h-8 shrink-0 items-center justify-center gap-1.5 border-t border-border bg-background text-[11px] font-medium text-muted-subtle hover:bg-surface-hover hover:text-foreground",
          )}
        >
          <IconChevronUp width={13} height={13} />
          Show detail panel
        </button>
      )}
    </div>
  );
}
