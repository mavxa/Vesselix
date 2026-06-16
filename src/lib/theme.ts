import type { UiTheme } from "./types";

export const THEME_STORAGE_KEY = "vesselix.theme";
export const DEFAULT_THEME: UiTheme = "dark";

export function readStoredTheme(): UiTheme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: UiTheme) {
  document.documentElement.dataset.theme = theme;
}

export function persistTheme(theme: UiTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures; theme still applies for the current session.
  }
}
