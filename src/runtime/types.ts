import type { Container, HostInfo, LogLine } from "../lib/types";
import type { ContainerAction } from "../store/appContext";

export type RuntimeMode = "api" | "mock";

export interface RuntimeClient {
  mode: RuntimeMode;
  getHost: () => Promise<HostInfo>;
  listContainers: () => Promise<Container[]>;
  getLogs: (containerId: string, tail: number) => Promise<LogLine[]>;
  runAction: (action: ContainerAction, container: Container) => Promise<void>;
}
