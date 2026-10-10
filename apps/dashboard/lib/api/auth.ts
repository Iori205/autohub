"use client";

import { useSyncExternalStore } from "react";
import { getDb } from "../db";
import { SESSION_COOKIE } from "../session";
import type { Session } from "../types";

/*
 * Auth — MOCK. Any admin e-mail from Тохиргоо → Админ & эрх with a password of
 * 6+ characters signs in. Later: login() → POST /auth/login on apps/service,
 * which sets an httpOnly session cookie; proxy.ts keeps checking that cookie.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function readCookie(): Session | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]!)) as Session;
  } catch {
    return null;
  }
}

let cached: { raw: string; session: Session | null } | null = null;
function snapshot(): Session | null {
  const raw = document.cookie;
  if (!cached || cached.raw !== raw) cached = { raw, session: readCookie() };
  return cached.session;
}

export class AuthError extends Error {}

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  await sleep(700);
  const user = getDb().admins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || password.length < 6) throw new AuthError("И-мэйл эсвэл нууц үг буруу байна");
  const session: Session = { userId: user.id, name: user.name, email: user.email, role: user.role };
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : "";
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; path=/; samesite=lax${maxAge}`;
  notify();
  return session;
}

export async function logout() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
  notify();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** `undefined` on the server, `null` when signed out. */
export const useSession = () =>
  useSyncExternalStore<Session | null | undefined>(subscribe, snapshot, () => undefined);
