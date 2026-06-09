import { useEffect, useRef } from "react";
import type { Container } from "../lib/types";
import {
  formatBytes,
  formatMb,
  formatPercent,
  formatRate,
} from "../lib/format";
import { cpuColor, memColor } from "./status";

interface Props {
  container: Container;
}

/**
 * High-mode rich stats. Lazy-loaded so the canvas chart code is NOT
 * shipped to Low-mode users. Uses a manual canvas time-series renderer
 * (uPlot-style) instead of a heavy chart library.
 *
 * This is the default export specifically so it can be React.lazy()'d.
 */
export default function RichStatsPanel({ container: c }: Props) {
  const running = c.state === "running";
  const cpuAvg =
    c.cpuHistory.reduce((a, b) => a + b, 0) / Math.max(1, c.cpuHistory.length);
  const cpuMax = Math.max(...c.cpuHistory, 0);
  const memRatio = c.memoryLimitMb > 0 ? c.memoryUsageMb / c.memoryLimitMb : 0;

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <p className="rounded border border-accent/30 bg-accent-soft px-2 py-1 text-[10.5px] text-accent">
        High mode — rich canvas time-series for the selected container only.
      </p>

      <ChartCard
        title="CPU usage"
        unit="%"
        color={cpuColor(c.cpuPercent)}
        data={c.cpuHistory}
        current={running ? formatPercent(c.cpuPercent) : "—"}
        stats={[
          ["avg", formatPercent(cpuAvg)],
          ["max", formatPercent(cpuMax)],
          ["pids", String(c.pids)],
        ]}
      />

      <ChartCard
        title="Memory"
        unit="MB"
        color={memColor(c.memoryUsageMb, c.memoryLimitMb)}
        data={c.memHistory}
        max={c.memoryLimitMb}
        current={running ? formatMb(c.memoryUsageMb) : "—"}
        stats={[
          ["limit", formatMb(c.memoryLimitMb)],
          ["usage", formatPercent(memRatio * 100, 0)],
        ]}
      />

      <div className="grid grid-cols-2 gap-2">
        <MiniCard
          title="Network RX"
          color="var(--accent)"
          data={syntheticRates(c.networkRxRate, c.id, 1)}
          current={running ? formatRate(c.networkRxRate) : "—"}
          sub={`${formatBytes(c.networkRxBytes)} total`}
        />
        <MiniCard
          title="Network TX"
          color="#a78bfa"
          data={syntheticRates(c.networkTxRate, c.id, 7)}
          current={running ? formatRate(c.networkTxRate) : "—"}
          sub={`${formatBytes(c.networkTxBytes)} total`}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  unit,
  color,
  data,
  max,
  current,
  stats,
}: {
  title: string;
  unit: string;
  color: string;
  data: number[];
  max?: number;
  current: string;
  stats: [string, string][];
}) {
  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {title}
        </span>
        <div className="flex items-center gap-3 text-[11px] tabular">
          <span className="font-medium" style={{ color }}>
            {current}
          </span>
          {stats.map(([k, v]) => (
            <span key={k} className="text-faint">
              {k} <span className="text-muted">{v}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="px-1 pb-1 pt-2">
        <CanvasChart data={data} color={color} max={max} unit={unit} height={96} />
      </div>
    </div>
  );
}

function MiniCard({
  title,
  color,
  data,
  current,
  sub,
}: {
  title: string;
  color: string;
  data: number[];
  current: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between px-2.5 pt-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
          {title}
        </span>
        <span className="text-[11px] tabular font-medium" style={{ color }}>
          {current}
        </span>
      </div>
      <div className="px-1 pt-1">
        <CanvasChart data={data} color={color} height={48} />
      </div>
      <div className="px-2.5 pb-1.5 text-[10px] tabular text-faint">{sub}</div>
    </div>
  );
}

/**
 * Manual canvas time-series chart with hover tooltip.
 * No external chart dependency. Devicepixel-aware.
 */
function CanvasChart({
  data,
  color,
  max,
  unit = "",
  height,
}: {
  data: number[];
  color: string;
  max?: number;
  unit?: string;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<{ x: number; show: boolean }>({ x: 0, show: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const rgb = resolveRgb(color);
      const lineColor = rgba(rgb, 1);

      const padTop = 6;
      const padBottom = 6;
      const lo = 0;
      const hi = max ?? Math.max(...data, 0.0001) * 1.1;
      const range = hi - lo || 1;
      const stepX = data.length > 1 ? w / (data.length - 1) : w;
      const yAt = (v: number) =>
        h - padBottom - ((v - lo) / range) * (h - padTop - padBottom);

      // gridlines
      ctx.strokeStyle = "rgba(127,127,127,0.12)";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 3; g++) {
        const y = padTop + ((h - padTop - padBottom) / 3) * g;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // area fill
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, rgba(rgb, 0.26));
      grad.addColorStop(1, rgba(rgb, 0));
      ctx.beginPath();
      ctx.moveTo(0, h);
      data.forEach((v, i) => ctx.lineTo(i * stepX, yAt(v)));
      ctx.lineTo((data.length - 1) * stepX, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // line
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * stepX;
        const y = yAt(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.stroke();

      // hover crosshair + point
      const hover = hoverRef.current;
      if (hover.show) {
        const idx = Math.max(
          0,
          Math.min(data.length - 1, Math.round(hover.x / stepX)),
        );
        const x = idx * stepX;
        const y = yAt(data[idx]);
        ctx.strokeStyle = "rgba(127,127,127,0.4)";
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, h - padBottom);
        ctx.stroke();
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(127,127,127,0.4)";

        // tooltip label
        const label = `${data[idx].toFixed(1)}${unit}`;
        ctx.font = "11px ui-monospace, monospace";
        const tw = ctx.measureText(label).width + 10;
        let tx = x + 8;
        if (tx + tw > w) tx = x - 8 - tw;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(tx, Math.max(2, y - 20), tw, 16);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, tx + 5, Math.max(13, y - 8));
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      hoverRef.current = { x: e.clientX - rect.left, show: true };
      draw();
    };
    const onLeave = () => {
      hoverRef.current = { x: 0, show: false };
      draw();
    };

    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    draw();

    return () => {
      ro.disconnect();
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [data, color, max, unit, height]);

  return (
    <div ref={wrapRef} style={{ height }} className="w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

// Build a believable rate history from a current rate value.
function syntheticRates(rate: number, seed: string, salt: number): number[] {
  let s = (salt + seed.length) >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const out: number[] = [];
  let v = rate;
  for (let i = 0; i < 32; i++) {
    v = Math.max(0, v + (rand() - 0.5) * rate * 0.6);
    out.push(Math.round(v));
  }
  return out;
}

// Canvas can't parse CSS vars or color-mix(); resolve to concrete [r,g,b]
// by letting the browser compute it on a throwaway element.
const rgbCache = new Map<string, [number, number, number]>();

function resolveRgb(color: string): [number, number, number] {
  const cached = rgbCache.get(color);
  if (cached) return cached;

  let rgb: [number, number, number] = [127, 127, 127];
  if (typeof document !== "undefined") {
    const probe = document.createElement("span");
    probe.style.color = color;
    probe.style.display = "none";
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color; // → "rgb(r, g, b)"
    document.body.removeChild(probe);
    const m = computed.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3) {
      rgb = [Number(m[0]), Number(m[1]), Number(m[2])];
    }
  }
  rgbCache.set(color, rgb);
  return rgb;
}

function rgba([r, g, b]: [number, number, number], alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
