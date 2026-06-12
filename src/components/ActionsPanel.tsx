import { useState } from "react";
import type { Container } from "../lib/types";
import { useAppState, type ContainerAction } from "../store/appContext";
import { cn } from "../lib/cn";
import {
  X,
  Pause,
  Play,
  RotateCcw,
  CircleOff,
  Trash,
  FileExclamationPoint,
} from "lucide-react";

interface Props {
  container: Container;
}

interface ActionDef {
  action: ContainerAction;
  label: string;
  desc: string;
  icon: React.ReactNode;
  tone: "neutral" | "warn" | "danger";
  destructive?: boolean;
  enabled: (c: Container) => boolean;
}

const ACTIONS: ActionDef[] = [
  {
    action: "start",
    label: "Start",
    desc: "Start a stopped container",
    icon: <Play width={14} height={14} />,
    tone: "neutral",
    enabled: (c) => c.state !== "running",
  },
  {
    action: "stop",
    label: "Stop",
    desc: "Gracefully stop (SIGTERM)",
    icon: <CircleOff size={14} strokeWidth={1} />,
    tone: "neutral",
    enabled: (c) => c.state === "running" || c.state === "paused",
  },
  {
    action: "restart",
    label: "Restart",
    desc: "Stop then start the container",
    icon: <RotateCcw size={14} strokeWidth={1} />,
    tone: "neutral",
    enabled: (c) => c.state === "running",
  },
  {
    action: "pause",
    label: "Pause",
    desc: "Freeze processes (SIGSTOP)",
    icon: <Pause size={14} strokeWidth={1} />,
    tone: "neutral",
    enabled: (c) => c.state === "running",
  },
  {
    action: "unpause",
    label: "Resume",
    desc: "Unfreeze a paused container",
    icon: <Play size={14} strokeWidth={1} />,
    tone: "neutral",
    enabled: (c) => c.state === "paused",
  },
  {
    action: "kill",
    label: "Kill",
    desc: "Force kill immediately (SIGKILL)",
    icon: <X size={14} strokeWidth={1} />,
    tone: "warn",
    destructive: true,
    enabled: (c) => c.state === "running" || c.state === "paused",
  },
  {
    action: "remove",
    label: "Remove",
    desc: "Delete the container permanently",
    icon: <Trash size={14} strokeWidth={1} />,
    tone: "danger",
    destructive: true,
    enabled: () => true,
  },
];

export function ActionsPanel({ container: c }: Props) {
  const { runAction } = useAppState();
  const [confirm, setConfirm] = useState<ActionDef | null>(null);

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => {
          const enabled = a.enabled(c);
          return (
            <button
              key={a.action}
              type="button"
              disabled={!enabled}
              onClick={() => {
                if (a.destructive) setConfirm(a);
                else runAction(a.action, c);
              }}
              className={cn(
                "flex items-start gap-2.5 rounded-md border bg-surface p-2.5 text-left disabled:cursor-not-allowed disabled:opacity-35",
                a.tone === "danger"
                  ? "border-border hover:border-danger/50"
                  : a.tone === "warn"
                    ? "border-border hover:border-warning/50"
                    : "border-border hover:border-border-hover",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded",
                  a.tone === "danger"
                    ? "text-danger"
                    : a.tone === "warn"
                      ? "text-warning"
                      : "text-muted",
                )}
                style={{
                  background:
                    a.tone === "danger"
                      ? "var(--danger-soft)"
                      : a.tone === "warn"
                        ? "var(--warning-soft)"
                        : "var(--surface-active)",
                }}
              >
                {a.icon}
              </span>
              <span className="flex flex-col">
                <span className="text-[12px] font-medium text-foreground">
                  {a.label}
                </span>
                <span className="text-[11px] text-muted-subtle">{a.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {confirm && (
        <ConfirmDialog
          action={confirm}
          container={c}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            runAction(confirm.action, c);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  action,
  container,
  onCancel,
  onConfirm,
}: {
  action: ActionDef;
  container: Container;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const danger = action.tone === "danger";
  return (
    <div
      className="vx-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="vx-pop-in w-full max-w-sm rounded-lg border border-border-strong bg-background-elevated p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: danger ? "var(--danger-soft)" : "var(--warning-soft)",
              color: danger ? "var(--danger)" : "var(--warning)",
            }}
          >
            <FileExclamationPoint size={14} strokeWidth={1} />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-[14px] font-semibold text-foreground">
              {action.label} {container.name}?
            </h3>
            <p className="text-[12px] text-muted">
              {action.action === "remove"
                ? "This permanently deletes the container. This action cannot be undone."
                : "This force-kills the container immediately. In-flight work may be lost."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-7 rounded-md border border-border bg-surface px-3 text-[12px] font-medium text-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="h-7 rounded-md px-3 text-[12px] font-semibold text-white"
            style={{ background: danger ? "var(--danger)" : "var(--warning)" }}
          >
            {action.label}
          </button>
        </div>
      </div>
    </div>
  );
}
