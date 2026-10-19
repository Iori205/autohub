"use client";

import type { StaffDto } from "@repo/types";
import { reload } from "../db";
import type { AdminRole, Settings } from "../types";
import { api } from "./client";

/* Store settings and staff → /admin/settings/:key, /admin/staff, /admin/qpay-test (ADMIN only). */

/** QPay is configured in the service's .env, so only the store and delivery sections are saved. */
export async function saveSettings(s: Settings) {
  await Promise.all([
    api("/admin/settings/store", { method: "PUT", body: s.store }),
    api("/admin/settings/delivery", { method: "PUT", body: { zones: s.zones, freeOver: s.freeOver } }),
  ]);
  await reload("settings");
}

/** Request a QPay token with the env credentials. */
export const testQPay = () => api<{ ok: boolean; message: string }>("/admin/qpay-test", { method: "POST" });

const ROLE = { admin: "ADMIN", operator: "OPERATOR" } as const;

/** Creates the account; returns a one-time temporary password (e-mail invites aren't wired yet). */
export async function inviteAdmin(name: string, email: string, role: AdminRole): Promise<string> {
  const r = await api<StaffDto & { tempPassword: string }>("/admin/staff", { method: "POST", body: { name, email, role: ROLE[role] } });
  await reload("admins");
  return r.tempPassword;
}

export async function setAdminRole(id: string, role: AdminRole) {
  await api(`/admin/staff/${id}`, { method: "PATCH", body: { role: ROLE[role] } });
  await reload("admins");
}

export async function removeAdmin(id: string) {
  await api(`/admin/staff/${id}`, { method: "DELETE" });
  await reload("admins");
}
