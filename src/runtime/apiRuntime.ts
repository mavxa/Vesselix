import type { Container, HostInfo, LogLine } from "../lib/types";
import type { ContainerAction } from "../store/appContext";
import type { RuntimeClient } from "./types";

const API_BASE = import.meta.env.VITE_VESSELIX_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiRuntime: RuntimeClient = {
  mode: "api",
  getHost: () => request<HostInfo>("/api/host"),
  listContainers: () => request<Container[]>("/api/containers"),
  getLogs: (containerId, tail) =>
    request<LogLine[]>(`/api/containers/${encodeURIComponent(containerId)}/logs?tail=${tail}`),
  runAction: (action: ContainerAction, container: Container) =>
    request<void>(
      `/api/containers/${encodeURIComponent(container.id)}/actions/${action}`,
      { method: "POST" },
    ),
};
