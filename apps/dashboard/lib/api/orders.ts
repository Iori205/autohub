"use client";

import type { AdminOrderDto } from "@repo/types";
import { reload } from "../db";
import type { OrderStatus } from "../types";
import { api } from "./client";

/* Захиалга → /admin/orders/:number/{status,cancel,notes,check}, /admin/orders/bulk-status. */

const STATUS_CODE: Record<Exclude<OrderStatus, "cancelled">, string> = {
  pending: "PENDING",
  paid: "PAID",
  preparing: "PREPARING",
  shipping: "SHIPPING",
  delivered: "DELIVERED",
  expired: "EXPIRED",
};

const BULK_CANCEL = { reason: "Бусад", comment: "Захиалгын жагсаалтаас бөөнөөр цуцалсан" };

/** Өөрчилж чадаагүй захиалгуудыг серверийн шалтгаантай нь буцаана. */
export async function setOrderStatus(ids: string | string[], status: OrderStatus): Promise<Record<string, string>> {
  const list = Array.isArray(ids) ? ids : [ids];
  let failed: Record<string, string> = {};
  try {
    if (status === "cancelled") {
      for (const n of list)
        await api(`/admin/orders/${n}/cancel`, { method: "POST", body: BULK_CANCEL }).catch((e: Error) => (failed[n] = e.message));
    } else if (list.length === 1) {
      await api(`/admin/orders/${list[0]}/status`, { method: "POST", body: { status: STATUS_CODE[status] } });
    } else {
      failed = (
        await api<{ failed: Record<string, string> }>("/admin/orders/bulk-status", {
          method: "POST",
          body: { numbers: list, status: STATUS_CODE[status] },
        })
      ).failed;
    }
  } finally {
    await reload("orders", "products", "stockLog", "customers");
  }
  return failed;
}

export async function cancelOrder(id: string, reason: string, comment: string) {
  await api(`/admin/orders/${id}/cancel`, { method: "POST", body: { reason, comment } });
  await reload("orders", "products", "stockLog", "customers");
}

export async function addOrderNote(id: string, text: string) {
  await api(`/admin/orders/${id}/notes`, { method: "POST", body: { text } });
  await reload("orders");
}

/** Хүлээгдэж буй захиалга төлөгдсөн эсэхийг QPay-ээс (эсвэл демо төлөвөөс) асууна. */
export async function checkPayment(id: string): Promise<{ paid: boolean }> {
  const o = await api<AdminOrderDto>(`/admin/orders/${id}/check`, { method: "POST" });
  await reload("orders", "products", "stockLog");
  return { paid: o.paymentStatus === "PAID" };
}
