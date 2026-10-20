"use client";

import type { PaymentStateDto, QPayInvoiceDto } from "@repo/types";
import { api } from "./client";
import { refreshOrder } from "./orders";

/* QPay apps/service-ээр дамжина: сервер QPay-тэй ярьж (DEMO_MODE-д дуурайж) төлбөрийг баталгаажуулна; цонх зөвхөн polling хийж харуулна. */

/** Одоогийн нэхэмжлэх, эсвэл шинэ 15 минутынх (хугацаа дууссан / цуцалсны дараа ч). */
export async function openInvoice(no: string): Promise<QPayInvoiceDto> {
  const inv = await api<QPayInvoiceDto>("/payments/qpay/invoice", { method: "POST", body: { number: no } });
  await refreshOrder(no);
  return inv;
}

/** Серверээр QPay-ээс шалгуулж, кэш дэх захиалгыг шинэчилнэ. */
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

/** DEMO_MODE-ийн туршилтын товчнууд (DEMO_MODE унтраалттай үед endpoint байхгүй). */
export async function demoAction(no: string, action: "paid" | "expired" | "error"): Promise<PaymentStateDto> {
  const st = await api<PaymentStateDto>(`/payments/demo/${action}`, { method: "POST", body: { number: no } });
  await refreshOrder(no);
  return st;
}

/** Банкны хавтангийн товчлол (QPay банкны нэр, аппын холбоосыг илгээдэг). */
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
