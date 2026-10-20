"use client";

import { useSyncExternalStore } from "react";
import { SIDEBAR_KEY, THEME_KEY } from "./site";

/* Хөтөч бүрийн UI тохиргоо: горим, хажуугийн цэс хураасан эсэх. */

type Theme = "dark" | "light";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const readTheme = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

export const useTheme = () => useSyncExternalStore(subscribe, readTheme, (): Theme => "dark");

export function toggleTheme() {
  const next: Theme = readTheme() === "dark" ? "light" : "dark";
  if (next === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* үл тооно */
  }
  notify();
}

let collapsed: boolean | null = null;
const readCollapsed = () => {
  if (collapsed === null) {
    try {
      collapsed = localStorage.getItem(SIDEBAR_KEY) === "collapsed";
    } catch {
      collapsed = false;
    }
  }
  return collapsed;
};

/** Desktop-ийн хажуугийн цэс: анхандаа дэлгэгдсэн, хураавал санана. */
export const useSidebarCollapsed = () => useSyncExternalStore(subscribe, readCollapsed, () => false);

export function setSidebarCollapsed(v: boolean) {
  collapsed = v;
  try {
    localStorage.setItem(SIDEBAR_KEY, v ? "collapsed" : "expanded");
  } catch {
    /* үл тооно */
  }
  notify();
}
