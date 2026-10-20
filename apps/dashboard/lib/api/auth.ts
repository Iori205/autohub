"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { StaffDto } from "@repo/types";
import { clearDb } from "../db";
import type { Session } from "../types";
import { ApiError, api, setUnauthorizedHandler } from "./client";
import { toSession } from "./map";

/*
 * apps/service-ээр ажилтны нэвтрэлт. POST /admin/auth/login нь httpOnly `autohub_admin_session` күүки тавина
 * (proxy.ts хүсэлт бүрт шалгана); GET /admin/auth/me хэн нэвтэрснийг хэлнэ.
 */

let session: Session | null | undefined;
let checking: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function set(s: Session | null) {
  session = s;
  notify();
}

/** Сесс дууссан / цуцлагдсан: proxy.ts нэвтэрсэн гэж үзэхээ болихын тулд күүкиг устгана. */
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
      // сүлжээний алдаа: гаргахын оронд дараагийн удаа дахин оролдоно
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

/** Тодорхойгүй үед `undefined` (серверийн рендер / анхны шалгалт), гарсан үед `null`. */
export function useSession() {
  const s = useSyncExternalStore<Session | null | undefined>(subscribe, () => session, () => undefined);
  useEffect(check, []);
  return s;
}
