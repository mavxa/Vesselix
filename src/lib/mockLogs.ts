import type { LogLevel, LogLine } from "./types";

interface LogTemplate {
  level: LogLevel;
  stream: "stdout" | "stderr";
  weight: number;
  lines: string[];
}

const GENERIC: LogTemplate[] = [
  {
    level: "info",
    stream: "stdout",
    weight: 70,
    lines: [
      "request completed method=GET path=/health status=200 duration=1.2ms",
      "request completed method=POST path=/api/v1/jobs status=201 duration=18.4ms",
      "request completed method=GET path=/api/v1/users status=200 duration=7.9ms",
      "cache hit key=session:8f3a2c ttl=540s",
      "scheduled task queued name=cleanup interval=3600s",
      "connection established peer=10.0.0.14:54122",
      "healthcheck passed checks=3/3",
      "config reloaded sources=2 changes=0",
      "worker picked up job id=4821 queue=default",
      "flushed metrics points=128 sink=prometheus",
    ],
  },
  {
    level: "debug",
    stream: "stdout",
    weight: 18,
    lines: [
      "db query SELECT * FROM jobs WHERE state = $1 LIMIT 50 rows=12 took=2.1ms",
      "pool stats active=3 idle=7 waiting=0",
      "gc pause=0.8ms heap=42MB",
      "trace span=handler.request id=a1b2c3 duration=4.0ms",
      "evaluating feature flag new_pipeline=false",
    ],
  },
  {
    level: "warn",
    stream: "stderr",
    weight: 9,
    lines: [
      "slow query detected duration=812ms statement=SELECT ...",
      "retrying upstream attempt=2/5 backoff=400ms",
      "connection pool nearing limit active=9 max=10",
      "deprecated config key 'legacy_mode' will be removed in v2",
      "rate limit approaching client=10.0.0.31 used=92%",
    ],
  },
  {
    level: "error",
    stream: "stderr",
    weight: 3,
    lines: [
      "failed to connect to upstream redis://redis:6379 error=connection refused",
      "unhandled rejection at job worker id=4810 error=timeout after 30000ms",
      "panic recovered in handler /api/v1/export error=nil pointer dereference",
      "request failed method=POST path=/api/v1/import status=500 error=disk full",
    ],
  },
];

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickTemplate(rand: () => number): LogTemplate {
  const total = GENERIC.reduce((a, t) => a + t.weight, 0);
  let r = rand() * total;
  for (const t of GENERIC) {
    if (r < t.weight) return t;
    r -= t.weight;
  }
  return GENERIC[0];
}

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generate a backlog of log lines for a container, ending at `now`.
 */
export function generateLogBacklog(
  containerName: string,
  count: number,
  now = Date.now(),
): LogLine[] {
  const rand = seeded(hashName(containerName));
  const out: LogLine[] = [];
  let ts = now - count * 850;
  for (let i = 0; i < count; i++) {
    const tpl = pickTemplate(rand);
    const text = tpl.lines[Math.floor(rand() * tpl.lines.length)];
    ts += 200 + Math.floor(rand() * 1400);
    out.push({
      id: i,
      ts,
      level: tpl.level,
      stream: tpl.stream,
      text,
    });
  }
  return out;
}

/**
 * Produce a single new live log line for tailing.
 */
export function generateLogLine(
  containerName: string,
  id: number,
  now = Date.now(),
): LogLine {
  const rand = seeded(hashName(containerName) + id * 2654435761);
  const tpl = pickTemplate(rand);
  const text = tpl.lines[Math.floor(rand() * tpl.lines.length)];
  return { id, ts: now, level: tpl.level, stream: tpl.stream, text };
}
