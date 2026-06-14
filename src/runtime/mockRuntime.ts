import type { Container, HostInfo, LogLine } from "../lib/types";
import { createMockContainers, MOCK_HOST, tickContainers, tickHost } from "../lib/mockData";
import { generateLogBacklog, generateLogLine } from "../lib/mockLogs";
import type { ContainerAction } from "../store/appContext";
import type { RuntimeClient } from "./types";

let containers = createMockContainers();
let host: HostInfo = MOCK_HOST;
const logBuffers = new Map<string, LogLine[]>();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function actionLabel(action: ContainerAction): string {
  switch (action) {
    case "kill":
      return "Exited (137) 1 second ago";
    case "stop":
      return "Exited (0) 1 second ago";
    default:
      return "Up 1 second";
  }
}

export const mockRuntime: RuntimeClient = {
  mode: "mock",
  async getHost(): Promise<HostInfo> {
    host = tickHost(host);
    return clone(host);
  },
  async listContainers(): Promise<Container[]> {
    containers = tickContainers(containers);
    return clone(containers);
  },
  async getLogs(containerId: string, tail: number): Promise<LogLine[]> {
    const container = containers.find((c) => c.id === containerId);
    const name = container?.name ?? containerId;
    const running = container?.state === "running";
    const existing = logBuffers.get(containerId) ?? generateLogBacklog(name, tail);

    if (running) {
      const burst = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burst; i++) {
        existing.push(generateLogLine(name, existing.length));
      }
    }

    if (existing.length > tail) existing.splice(0, existing.length - tail);
    logBuffers.set(containerId, existing);
    return clone(existing);
  },
  async runAction(action: ContainerAction, container: Container): Promise<void> {
    if (action === "remove") {
      containers = containers.filter((c) => c.id !== container.id);
      return;
    }

    containers = containers.map((c) => {
      if (c.id !== container.id) return c;
      switch (action) {
        case "start":
          return { ...c, state: "running", status: actionLabel(action), health: "starting" };
        case "stop":
        case "kill":
          return {
            ...c,
            state: "exited",
            status: actionLabel(action),
            health: "none",
            cpuPercent: 0,
            networkRxRate: 0,
            networkTxRate: 0,
          };
        case "restart":
          return {
            ...c,
            state: "running",
            status: actionLabel(action),
            health: "starting",
            startedAt: Date.now(),
          };
        case "pause":
          return { ...c, state: "paused", status: `${c.status} (Paused)`, cpuPercent: 0 };
        case "unpause":
          return { ...c, state: "running", status: c.status.replace(" (Paused)", "") };
      }
    });
  },
};
