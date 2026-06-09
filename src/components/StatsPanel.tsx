import { lazy, Suspense } from "react";
import type { Container } from "../lib/types";
import { useAppState } from "../store/appContext";
import { LowStatsPanel } from "./LowStatsPanel";

// Lazy: the rich canvas chart module is only fetched in High mode.
const RichStatsPanel = lazy(() => import("./RichStatsPanel"));

interface Props {
  container: Container;
}

export function StatsPanel({ container }: Props) {
  const { mode } = useAppState();

  if (mode === "high") {
    return (
      <Suspense fallback={<ChartLoading />}>
        <RichStatsPanel container={container} />
      </Suspense>
    );
  }

  return <LowStatsPanel container={container} />;
}

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[12px] text-faint">
      <span className="h-3 w-3 animate-spin rounded-full border border-border border-t-accent" />
      Loading charts…
    </div>
  );
}
