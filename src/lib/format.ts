// Pure formatting helpers. No allocations in hot paths beyond strings.

export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  const digits = i === 0 ? 0 : fractionDigits;
  return `${value.toFixed(digits)} ${units[i]}`;
}

export function formatRate(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec, 1)}/s`;
}

// Memory is stored already in MB.
export function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatUptime(startedAt: number, now = Date.now()): string {
  let s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatAge(createdAt: number, now = Date.now()): string {
  return formatUptime(createdAt, now);
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatTimestampMs(ts: number): string {
  const ms = (ts % 1000).toString().padStart(3, "0");
  return `${formatTimestamp(ts)}.${ms}`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export function shortId(id: string): string {
  return id.slice(0, 12);
}
