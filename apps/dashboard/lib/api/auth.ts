"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { StaffDto } from "@repo/types";
import { clearDb } from "../db";
import type { Session } from "../types";
import { ApiError, api, setUnauthorizedHandler } from "./client";
import { toSession } from "./map";

/*
 * Staff auth against apps/service. POST /admin/auth/login sets the httpOnly
 * `autohub_admin_session` cookie (proxy.ts checks it on every request);
 * GET /admin/auth/me tells the client who is signed in.
 */

let session: Session | null | undefined;
let checking: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function set(s: Session | null) {
  session = s;
  notify();
}

/** Session expired / revoked: drop the cookie so proxy.ts stops treating us as signed in. */
async function signedOut() {
  if (session === null) return;
  await api("/admin/auth/logout", { method: "POST" }).catch(() => undefined);
  clearDb();
  set(null);
}
setUnauthorizedHandler(() => void signedOut());

function check() {
  checking ??= api<StaffDto>("/admin/auth/me")
    .then((s) => set(toSession(s)))
    .catch((e) => {
      if (e instanceof ApiError && e.status === 401) return signedOut();
      // network trouble: retry on the next mount instead of signing out
      checking = null;
    });
}

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  const s = toSession(await api<StaffDto>("/admin/auth/login", { method: "POST", body: { email: email.trim(), password, remember } }));
  clearDb();
  checking = Promise.resolve();
  set(s);
  return s;
}

export async function logout() {
  await api("/admin/auth/logout", { method: "POST" }).catch(() => undefined);
  clearDb();
  set(null);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** `undefined` while unknown (server render / first check), `null` when signed out. */
export function useSession() {
  const s = useSyncExternalStore<Session | null | undefined>(subscribe, () => session, () => undefined);
  useEffect(check, []);
  return s;
}
