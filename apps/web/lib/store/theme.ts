"use client";

import { useSyncExternalStore } from "react";

import { THEME_KEY } from "../site";

export type Theme = "dark" | "light";

const listeners = new Set<() => void>();

const get = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";

export function toggleTheme() {
  const next: Theme = get() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* үл тооно */
  }
  listeners.forEach((l) => l());
}

export const useTheme = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get,
    (): Theme => "dark",
  );
