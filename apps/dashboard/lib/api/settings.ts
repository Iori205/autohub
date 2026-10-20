"use client";

import type { StaffDto } from "@repo/types";
import { reload } from "../db";
import type { AdminRole, Settings } from "../types";
import { api } from "./client";

/* Дэлгүүрийн тохиргоо ба ажилтан → /admin/settings/:key, /admin/staff, /admin/qpay-test (зөвхөн ADMIN). */

/** QPay-г сервисийн .env-д тохируулдаг тул зөвхөн дэлгүүр, хүргэлтийн хэсгийг хадгална. */
export async function saveSettings(s: Settings) {
  await Promise.all([
    api("/admin/settings/store", { method: "PUT", body: s.store }),
    api("/admin/settings/delivery", { method: "PUT", body: { zones: s.zones, freeOver: s.freeOver } }),
  ]);
  await reload("settings");
}

/** env-ийн нэвтрэх мэдээллээр QPay токен авч шалгана. */
export const testQPay = () => api<{ ok: boolean; message: string }>("/admin/qpay-test", { method: "POST" });

const ROLE = { admin: "ADMIN", operator: "OPERATOR" } as const;

/** Бүртгэл үүсгээд нэг удаагийн түр нууц үг буцаана (и-мэйл урилга хараахан холбогдоогүй). */
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
