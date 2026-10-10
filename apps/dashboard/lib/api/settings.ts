"use client";

import { setDb } from "../db";
import { newId } from "../ids";
import type { AdminRole, QPaySettings, Settings } from "../types";

/* Store settings and admin users — MOCK. Later: /settings, /admins, POST /payments/qpay/test. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function saveSettings(settings: Settings) {
  setDb(() => ({ settings }));
}

/** Try a token request against QPay. The mock only checks the username is set. */
export async function testQPay(q: QPaySettings): Promise<{ ok: boolean; message: string }> {
  await sleep(900);
  return q.username.trim()
    ? { ok: true, message: "QPay холболт амжилттай · token хүчинтэй" }
    : { ok: false, message: "Холболт амжилтгүй: merchant username хоосон" };
}

export async function inviteAdmin(name: string, email: string, role: AdminRole) {
  setDb((db) => ({
    admins: [...db.admins, { id: newId("u"), name, email, role, lastSeen: "Урилга илгээсэн" }],
  }));
}

export async function setAdminRole(id: string, role: AdminRole) {
  setDb((db) => ({ admins: db.admins.map((a) => (a.id === id ? { ...a, role } : a)) }));
}

export async function removeAdmin(id: string) {
  setDb((db) => ({ admins: db.admins.filter((a) => a.id !== id) }));
}
