import { memo, useId } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Fill area under the line with a faint gradient. */
  fill?: boolean;
  /** Optional fixed max for stable scaling (e.g. memory limit). */
  max?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * Tiny inline sparkline built with a single SVG polyline.
 * Cheap enough to render per table row in both Low and High modes.
 */
function SparklineImpl({
  data,
  width = 56,
  height = 18,
  color = "var(--running)",
  fill = false,
  max,
  className,
  strokeWidth = 1.25,
}: SparklineProps) {
  const gid = useId();

  if (data.length === 0) {
    return <svg width={width} height={height} className={className} />;
  }

  const lo = 0;
  const hi = max ?? Math.max(...data, 0.0001);
  const range = hi - lo || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const pad = strokeWidth;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const norm = (v - lo) / range;
    const y = height - pad - norm * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#spark-${gid})`} stroke="none" />
        </>
      )}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const Sparkline = memo(SparklineImpl);
