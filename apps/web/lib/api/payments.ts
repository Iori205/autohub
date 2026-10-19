"use client";

import type { PaymentStateDto, QPayInvoiceDto } from "@repo/types";
import { api } from "./client";
import { refreshOrder } from "./orders";

/*
 * QPay through apps/service: the server talks to QPay (or simulates it in
 * DEMO_MODE) and confirms payments; the modal only polls and displays.
 */

/** Current invoice, or a new 15-minute one (also after expiry / cancel). */
export async function openInvoice(no: string): Promise<QPayInvoiceDto> {
  const inv = await api<QPayInvoiceDto>("/payments/qpay/invoice", { method: "POST", body: { number: no } });
  await refreshOrder(no);
  return inv;
}

/** Ask the server to check with QPay; refreshes the cached order. */
export async function checkPayment(no: string): Promise<PaymentStateDto> {
  const st = await api<PaymentStateDto>("/payments/qpay/check", { method: "POST", body: { number: no } });
  await refreshOrder(no);
  return st;
}

export async function cancelPayment(no: string): Promise<PaymentStateDto> {
  const st = await api<PaymentStateDto>("/payments/qpay/cancel", { method: "POST", body: { number: no } });
  await refreshOrder(no);
  return st;
}

/** DEMO_MODE test buttons (the endpoints don't exist when DEMO_MODE is off). */
export async function demoAction(no: string, action: "paid" | "expired" | "error"): Promise<PaymentStateDto> {
  const st = await api<PaymentStateDto>(`/payments/demo/${action}`, { method: "POST", body: { number: no } });
  await refreshOrder(no);
  return st;
}

/** Abbreviations for the bank tiles (QPay sends the bank name and app link). */
const ABBR: Record<string, string> = {
  "Хаан банк": "ХААН",
  Голомт: "ГОЛ",
  ХХБ: "ХХБ",
  "Төрийн банк": "ТБ",
  "Хас банк": "ХАС",
  Капитрон: "КАП",
  "М банк": "М",
  Ард: "АРД",
  MonPay: "MP",
  SocialPay: "SP",
  "Богд банк": "БОГД",
  "Чингис Хаан": "ЧХБ",
};

export const bankAbbr = (name: string) =>
  ABBR[name] ??
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
