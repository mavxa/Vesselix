import { apiRuntime } from "./apiRuntime";
import { mockRuntime } from "./mockRuntime";
import type { RuntimeClient, RuntimeMode } from "./types";

export function getRuntimeMode(): RuntimeMode {
  const mode = import.meta.env.VITE_VESSELIX_RUNTIME;
  return mode === "mock" ? "mock" : "api";
}

export function getRuntimeClient(): RuntimeClient {
  return getRuntimeMode() === "mock" ? mockRuntime : apiRuntime;
}

export type { RuntimeClient, RuntimeMode };
