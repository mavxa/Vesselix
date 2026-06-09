// Domain types — structured like a real Docker REST/WS API response.

export type ContainerState = "running" | "exited" | "paused" | "restarting";

export type ContainerHealth =
  | "healthy"
  | "unhealthy"
  | "starting"
  | "none";

export interface PortMapping {
  privatePort: number;
  publicPort?: number;
  protocol: "tcp" | "udp";
  hostIp?: string;
}

export interface MountInfo {
  type: "bind" | "volume" | "tmpfs";
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  imageId: string;
  command: string;
  state: ContainerState;
  status: string; // human status, e.g. "Up 3 hours"
  health: ContainerHealth;

  cpuPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;

  networkRxBytes: number;
  networkTxBytes: number;
  networkRxRate: number; // bytes/s
  networkTxRate: number; // bytes/s

  blockReadBytes: number;
  blockWriteBytes: number;

  pids: number;

  ports: PortMapping[];
  createdAt: number; // epoch ms
  startedAt: number; // epoch ms

  // Tiny inline history for sparklines (oldest -> newest).
  cpuHistory: number[];
  memHistory: number[];

  // Inspect-only structured data.
  restartPolicy: string;
  networks: string[];
  mounts: MountInfo[];
  env: string[];
  labels: Record<string, string>;
}

export type UiPerformanceMode = "low" | "high";

export type ContainerFilter = "all" | "running" | "stopped" | "unhealthy";

export type SortKey = "name" | "state" | "cpu" | "mem";
export type SortDir = "asc" | "desc";

export type DetailTab = "logs" | "stats" | "inspect" | "actions";

export interface HostInfo {
  hostname: string;
  dockerConnected: boolean;
  engineVersion: string;
  apiVersion: string;
  os: string;
  arch: string;
  cpuPercent: number;
  cpuCores: number;
  memUsedMb: number;
  memTotalMb: number;
}

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogLine {
  id: number;
  ts: number; // epoch ms
  level: LogLevel;
  stream: "stdout" | "stderr";
  text: string;
}
