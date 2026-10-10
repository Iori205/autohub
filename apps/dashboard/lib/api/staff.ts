"use client";

import { SESSION_COOKIE } from "../session";

/** Name of the signed-in staff member, stamped on notes and stock moves. */
export function staffName(): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  try {
    return m ? (JSON.parse(decodeURIComponent(m[1]!)) as { name: string }).name : "Админ";
  } catch {
    return "Админ";
  }
}
