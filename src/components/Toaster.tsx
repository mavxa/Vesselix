import { useAppState } from "../store/appContext";
import { cn } from "../lib/cn";
import { IconClose } from "./icons";

const toneColor = {
  info: "var(--accent)",
  success: "var(--running)",
  warn: "var(--warning)",
  error: "var(--danger)",
} as const;

export function Toaster() {
  const { toasts, dismissToast } = useAppState();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-50 flex flex-col gap-1.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="vx-pop-in pointer-events-auto flex items-center gap-2 rounded-md border border-border-strong bg-background-elevated py-1.5 pl-2.5 pr-1.5 text-[12px] shadow-lg"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: toneColor[t.kind] }}
          />
          <span className="text-foreground">{t.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded text-faint hover:text-muted",
            )}
          >
            <IconClose width={11} height={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
