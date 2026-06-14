import type {
  Container,
  ContainerHealth,
  ContainerState,
  HostInfo,
} from "./types";

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Deterministic pseudo-random so history looks stable across renders.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function history(seed: number, base: number, spread: number, n = 32): number[] {
  const rand = seeded(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.5) * spread;
    v = Math.max(0, v);
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

interface MockSpec {
  name: string;
  image: string;
  state: ContainerState;
  health: ContainerHealth;
  cpu: number;
  memUsed: number;
  memLimit: number;
  cpuSpread: number;
  memSpread: number;
  rxRate: number;
  txRate: number;
  pids: number;
  ports: Container["ports"];
  startedAgo: number;
  createdAgo: number;
  status: string;
  command: string;
  networks: string[];
  mounts: Container["mounts"];
  env: string[];
  labels: Record<string, string>;
  restartPolicy: string;
}

const SPECS: MockSpec[] = [
  {
    name: "traefik",
    image: "traefik:v3.1",
    state: "running",
    health: "healthy",
    cpu: 3.4,
    memUsed: 78,
    memLimit: 512,
    cpuSpread: 2,
    memSpread: 6,
    rxRate: 184_320,
    txRate: 256_000,
    pids: 14,
    ports: [
      { privatePort: 80, publicPort: 80, protocol: "tcp", hostIp: "0.0.0.0" },
      { privatePort: 443, publicPort: 443, protocol: "tcp", hostIp: "0.0.0.0" },
      { privatePort: 8080, publicPort: 8080, protocol: "tcp" },
    ],
    startedAgo: 6 * DAY + 3 * HOUR,
    createdAgo: 6 * DAY + 3 * HOUR,
    status: "Up 6 days",
    command: "/entrypoint.sh --configFile=/etc/traefik/traefik.yml",
    networks: ["edge", "web"],
    mounts: [
      {
        type: "bind",
        source: "/var/run/docker.sock",
        destination: "/var/run/docker.sock",
        mode: "ro",
        rw: false,
      },
      {
        type: "bind",
        source: "/srv/traefik/traefik.yml",
        destination: "/etc/traefik/traefik.yml",
        mode: "ro",
        rw: false,
      },
    ],
    env: ["TZ=UTC", "TRAEFIK_LOG_LEVEL=INFO"],
    labels: {
      "com.docker.compose.project": "edge",
      "traefik.enable": "true",
    },
    restartPolicy: "unless-stopped",
  },
  {
    name: "nginx",
    image: "nginx:1.27-alpine",
    state: "running",
    health: "healthy",
    cpu: 1.1,
    memUsed: 24,
    memLimit: 256,
    cpuSpread: 1.4,
    memSpread: 3,
    rxRate: 92_160,
    txRate: 512_000,
    pids: 5,
    ports: [
      { privatePort: 80, publicPort: 8081, protocol: "tcp", hostIp: "0.0.0.0" },
    ],
    startedAgo: 2 * DAY + 7 * HOUR,
    createdAgo: 2 * DAY + 7 * HOUR,
    status: "Up 2 days",
    command: "nginx -g 'daemon off;'",
    networks: ["web"],
    mounts: [
      {
        type: "volume",
        source: "nginx_html",
        destination: "/usr/share/nginx/html",
        mode: "rw",
        rw: true,
      },
    ],
    env: ["NGINX_HOST=localhost", "NGINX_PORT=80"],
    labels: { "com.docker.compose.project": "web" },
    restartPolicy: "unless-stopped",
  },
  {
    name: "api",
    image: "ghcr.io/acme/api:1.8.2",
    state: "running",
    health: "healthy",
    cpu: 22.6,
    memUsed: 412,
    memLimit: 1024,
    cpuSpread: 14,
    memSpread: 24,
    rxRate: 640_000,
    txRate: 980_000,
    pids: 38,
    ports: [
      { privatePort: 3000, publicPort: 3000, protocol: "tcp", hostIp: "0.0.0.0" },
    ],
    startedAgo: 9 * HOUR + 12 * MIN,
    createdAgo: 9 * HOUR + 12 * MIN,
    status: "Up 9 hours",
    command: "node dist/server.js",
    networks: ["web", "backend"],
    mounts: [
      {
        type: "bind",
        source: "/srv/api/uploads",
        destination: "/app/uploads",
        mode: "rw",
        rw: true,
      },
    ],
    env: [
      "NODE_ENV=production",
      "PORT=3000",
      "DATABASE_URL=postgres://api:****@postgres:5432/app",
      "REDIS_URL=redis://redis:6379",
    ],
    labels: {
      "com.docker.compose.project": "app",
      "com.docker.compose.service": "api",
    },
    restartPolicy: "on-failure",
  },
  {
    name: "frontend",
    image: "ghcr.io/acme/frontend:2.3.0",
    state: "running",
    health: "healthy",
    cpu: 0.6,
    memUsed: 46,
    memLimit: 256,
    cpuSpread: 0.8,
    memSpread: 4,
    rxRate: 40_960,
    txRate: 122_880,
    pids: 7,
    ports: [
      { privatePort: 80, publicPort: 5173, protocol: "tcp", hostIp: "0.0.0.0" },
    ],
    startedAgo: 9 * HOUR,
    createdAgo: 9 * HOUR,
    status: "Up 9 hours",
    command: "nginx -g 'daemon off;'",
    networks: ["web"],
    mounts: [],
    env: ["NODE_ENV=production"],
    labels: {
      "com.docker.compose.project": "app",
      "com.docker.compose.service": "frontend",
    },
    restartPolicy: "unless-stopped",
  },
  {
    name: "postgres",
    image: "postgres:16-alpine",
    state: "running",
    health: "healthy",
    cpu: 8.3,
    memUsed: 268,
    memLimit: 2048,
    cpuSpread: 6,
    memSpread: 12,
    rxRate: 220_000,
    txRate: 180_000,
    pids: 26,
    ports: [
      { privatePort: 5432, publicPort: 5432, protocol: "tcp", hostIp: "127.0.0.1" },
    ],
    startedAgo: 14 * DAY,
    createdAgo: 14 * DAY,
    status: "Up 2 weeks",
    command: "postgres",
    networks: ["backend"],
    mounts: [
      {
        type: "volume",
        source: "pgdata",
        destination: "/var/lib/postgresql/data",
        mode: "rw",
        rw: true,
      },
    ],
    env: [
      "POSTGRES_USER=api",
      "POSTGRES_PASSWORD=****",
      "POSTGRES_DB=app",
      "PGDATA=/var/lib/postgresql/data",
    ],
    labels: { "com.docker.compose.project": "app" },
    restartPolicy: "unless-stopped",
  },
  {
    name: "redis",
    image: "redis:7-alpine",
    state: "running",
    health: "healthy",
    cpu: 0.9,
    memUsed: 14,
    memLimit: 256,
    cpuSpread: 0.6,
    memSpread: 2,
    rxRate: 30_720,
    txRate: 51_200,
    pids: 6,
    ports: [
      { privatePort: 6379, publicPort: 6379, protocol: "tcp", hostIp: "127.0.0.1" },
    ],
    startedAgo: 14 * DAY,
    createdAgo: 14 * DAY,
    status: "Up 2 weeks",
    command: "redis-server --appendonly yes",
    networks: ["backend"],
    mounts: [
      {
        type: "volume",
        source: "redis_data",
        destination: "/data",
        mode: "rw",
        rw: true,
      },
    ],
    env: ["TZ=UTC"],
    labels: { "com.docker.compose.project": "app" },
    restartPolicy: "unless-stopped",
  },
  {
    name: "worker",
    image: "ghcr.io/acme/worker:1.8.2",
    state: "running",
    health: "unhealthy",
    cpu: 47.2,
    memUsed: 731,
    memLimit: 1024,
    cpuSpread: 22,
    memSpread: 40,
    rxRate: 81_920,
    txRate: 61_440,
    pids: 52,
    ports: [],
    startedAgo: 41 * MIN,
    createdAgo: 9 * HOUR,
    status: "Up 41 minutes (unhealthy)",
    command: "node dist/worker.js --queue=default",
    networks: ["backend"],
    mounts: [],
    env: [
      "NODE_ENV=production",
      "REDIS_URL=redis://redis:6379",
      "CONCURRENCY=8",
    ],
    labels: {
      "com.docker.compose.project": "app",
      "com.docker.compose.service": "worker",
    },
    restartPolicy: "on-failure",
  },
  {
    name: "watchtower",
    image: "containrrr/watchtower:latest",
    state: "exited",
    health: "none",
    cpu: 0,
    memUsed: 0,
    memLimit: 128,
    cpuSpread: 0,
    memSpread: 0,
    rxRate: 0,
    txRate: 0,
    pids: 0,
    ports: [],
    startedAgo: 3 * HOUR,
    createdAgo: 20 * DAY,
    status: "Exited (1) 3 hours ago",
    command: "/watchtower --cleanup --interval 3600",
    networks: ["bridge"],
    mounts: [
      {
        type: "bind",
        source: "/var/run/docker.sock",
        destination: "/var/run/docker.sock",
        mode: "rw",
        rw: true,
      },
    ],
    env: ["WATCHTOWER_CLEANUP=true", "TZ=UTC"],
    labels: { "com.centurylinklabs.watchtower": "true" },
    restartPolicy: "no",
  },
  {
    name: "minio",
    image: "minio/minio:latest",
    state: "paused",
    health: "none",
    cpu: 0,
    memUsed: 142,
    memLimit: 1024,
    cpuSpread: 0,
    memSpread: 0,
    rxRate: 0,
    txRate: 0,
    pids: 11,
    ports: [
      { privatePort: 9000, publicPort: 9000, protocol: "tcp", hostIp: "0.0.0.0" },
      { privatePort: 9001, publicPort: 9001, protocol: "tcp", hostIp: "0.0.0.0" },
    ],
    startedAgo: 5 * DAY,
    createdAgo: 5 * DAY,
    status: "Up 5 days (Paused)",
    command: 'minio server /data --console-address ":9001"',
    networks: ["backend"],
    mounts: [
      {
        type: "volume",
        source: "minio_data",
        destination: "/data",
        mode: "rw",
        rw: true,
      },
    ],
    env: ["MINIO_ROOT_USER=admin", "MINIO_ROOT_PASSWORD=****"],
    labels: { "com.docker.compose.project": "storage" },
    restartPolicy: "unless-stopped",
  },
  {
    name: "grafana",
    image: "grafana/grafana:11.2.0",
    state: "running",
    health: "starting",
    cpu: 5.7,
    memUsed: 188,
    memLimit: 512,
    cpuSpread: 4,
    memSpread: 10,
    rxRate: 45_000,
    txRate: 70_000,
    pids: 19,
    ports: [
      { privatePort: 3000, publicPort: 3001, protocol: "tcp", hostIp: "0.0.0.0" },
    ],
    startedAgo: 2 * MIN,
    createdAgo: 8 * DAY,
    status: "Up 2 minutes (health: starting)",
    command: "/run.sh",
    networks: ["monitoring"],
    mounts: [
      {
        type: "volume",
        source: "grafana_data",
        destination: "/var/lib/grafana",
        mode: "rw",
        rw: true,
      },
    ],
    env: ["GF_SECURITY_ADMIN_PASSWORD=****", "GF_USERS_ALLOW_SIGN_UP=false"],
    labels: { "com.docker.compose.project": "monitoring" },
    restartPolicy: "unless-stopped",
  },
  {
    name: "prometheus",
    image: "prom/prometheus:v2.54.1",
    state: "running",
    health: "healthy",
    cpu: 11.4,
    memUsed: 324,
    memLimit: 1024,
    cpuSpread: 8,
    memSpread: 16,
    rxRate: 132_000,
    txRate: 88_000,
    pids: 22,
    ports: [
      { privatePort: 9090, publicPort: 9090, protocol: "tcp", hostIp: "127.0.0.1" },
    ],
    startedAgo: 8 * DAY,
    createdAgo: 8 * DAY,
    status: "Up 8 days",
    command:
      "--config.file=/etc/prometheus/prometheus.yml --storage.tsdb.retention.time=15d",
    networks: ["monitoring"],
    mounts: [
      {
        type: "volume",
        source: "prom_data",
        destination: "/prometheus",
        mode: "rw",
        rw: true,
      },
    ],
    env: ["TZ=UTC"],
    labels: { "com.docker.compose.project": "monitoring" },
    restartPolicy: "unless-stopped",
  },
];

function makeId(seed: number): string {
  const rand = seeded(seed + 7);
  let hex = "";
  while (hex.length < 64) hex += Math.floor(rand() * 16).toString(16);
  return hex.slice(0, 64);
}

export function createMockContainers(): Container[] {
  return SPECS.map((spec, i) => {
    const id = makeId(i * 31 + 13);
    return {
      id,
      name: spec.name,
      image: spec.image,
      imageId: "sha256:" + makeId(i * 53 + 101).slice(0, 12),
      command: spec.command,
      state: spec.state,
      status: spec.status,
      health: spec.health,
      cpuPercent: spec.cpu,
      memoryUsageMb: spec.memUsed,
      memoryLimitMb: spec.memLimit,
      networkRxBytes: spec.rxRate * 3600 * (i + 1),
      networkTxBytes: spec.txRate * 3600 * (i + 1),
      networkRxRate: spec.rxRate,
      networkTxRate: spec.txRate,
      blockReadBytes: (i + 1) * 1024 * 1024 * 37,
      blockWriteBytes: (i + 1) * 1024 * 1024 * 21,
      pids: spec.pids,
      ports: spec.ports,
      createdAt: NOW - spec.createdAgo,
      startedAt: NOW - spec.startedAgo,
      cpuHistory:
        spec.state === "running"
          ? history(i * 17 + 3, spec.cpu, spec.cpuSpread)
          : new Array(32).fill(0),
      memHistory:
        spec.state === "exited"
          ? new Array(32).fill(0)
          : history(i * 19 + 5, spec.memUsed, spec.memSpread),
      restartPolicy: spec.restartPolicy,
      networks: spec.networks,
      mounts: spec.mounts,
      env: spec.env,
      labels: spec.labels,
    };
  });
}

export const MOCK_HOST: HostInfo = {
  hostname: "homelab-01",
  dockerConnected: true,
  engineVersion: "27.3.1",
  apiVersion: "1.47",
  os: "Debian 12 (bookworm)",
  arch: "aarch64",
  cpuPercent: 18.4,
  cpuCores: 4,
  memUsedMb: 2304,
  memTotalMb: 7820,
};

function jitter(value: number, spread: number, min = 0, max = Infinity): number {
  const next = value + (Math.random() - 0.5) * spread;
  return Math.max(min, Math.min(max, next));
}

function pushHistory(arr: number[], value: number): number[] {
  const next = arr.slice(1);
  next.push(Math.round(value * 100) / 100);
  return next;
}

/**
 * Advance one live "stats" tick. Returns a new array with running containers'
 * CPU/RAM/network nudged and their sparkline history shifted by one sample.
 * Stopped / paused containers stay flat.
 */
export function tickContainers(containers: Container[]): Container[] {
  return containers.map((c) => {
    if (c.state !== "running") return c;

    const cpu = jitter(c.cpuPercent, Math.max(2, c.cpuPercent * 0.4), 0.1, 100);
    const mem = jitter(
      c.memoryUsageMb,
      Math.max(4, c.memoryUsageMb * 0.08),
      1,
      c.memoryLimitMb,
    );
    const rx = jitter(c.networkRxRate, c.networkRxRate * 0.5 + 4096, 0);
    const tx = jitter(c.networkTxRate, c.networkTxRate * 0.5 + 4096, 0);

    return {
      ...c,
      cpuPercent: cpu,
      memoryUsageMb: mem,
      networkRxRate: rx,
      networkTxRate: tx,
      networkRxBytes: c.networkRxBytes + rx,
      networkTxBytes: c.networkTxBytes + tx,
      cpuHistory: pushHistory(c.cpuHistory, cpu),
      memHistory: pushHistory(c.memHistory, mem),
    };
  });
}

/** Advance host-level CPU/RAM a touch so the top bar feels live too. */
export function tickHost(host: HostInfo): HostInfo {
  return {
    ...host,
    cpuPercent: jitter(host.cpuPercent, 6, 1, 100),
    memUsedMb: jitter(host.memUsedMb, 80, 256, host.memTotalMb),
  };
}
