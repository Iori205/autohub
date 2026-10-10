"use client";

import type { Order, PayStatus } from "../types";
import { getOrder, newInvoice, patchOrder } from "./orders";

/*
 * QPay data access — MOCK.
 * Later: createInvoice → POST /payments/qpay/invoice, checkPayment → GET
 * /payments/qpay/:invoiceId (the server talks to QPay and its callback).
 * The demo* helpers exist only for the prototype's test buttons.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reuse a still-valid invoice, otherwise issue a new one. */
export async function openInvoice(no: string): Promise<Order | null> {
  const o = await getOrder(no);
  if (!o) return null;
  const valid = o.payStatus === "pending" && Date.now() < o.invoice.expires;
  if (valid) return o;
  return patchOrder(no, { payStatus: "pending", invoice: newInvoice(no) });
}

/** Poll QPay. In the mock nothing gets paid unless the demo button is used. */
export async function checkPayment(no: string): Promise<PayStatus | null> {
  await sleep(1200);
  return (await getOrder(no))?.payStatus ?? null;
}

export const cancelPayment = (no: string) =>
  patchOrder(no, { payStatus: "cancelled" });

export const expireInvoice = (no: string) =>
  patchOrder(no, { payStatus: "expired" });

export function demoMarkPaid(no: string) {
  const now = Date.now();
  return patchOrder(no, {
    payStatus: "paid",
    stage: 1,
    paidAt: now,
    txn: String(Math.floor(now * 7.3)).slice(-12),
  });
}

export const BANKS: { name: string; abbr: string; scheme: string }[] = [
  { name: "Хаан банк", abbr: "ХААН", scheme: "khanbank" },
  { name: "Голомт", abbr: "ГОЛ", scheme: "golomtbank" },
  { name: "ХХБ", abbr: "ХХБ", scheme: "tdbbank" },
  { name: "Төрийн банк", abbr: "ТБ", scheme: "statebank" },
  { name: "Хас банк", abbr: "ХАС", scheme: "xacbank" },
  { name: "Капитрон", abbr: "КАП", scheme: "capitronbank" },
  { name: "М банк", abbr: "М", scheme: "mbank" },
  { name: "Ард", abbr: "АРД", scheme: "ard" },
  { name: "MonPay", abbr: "MP", scheme: "monpay" },
  { name: "SocialPay", abbr: "SP", scheme: "socialpay-payment" },
  { name: "Богд банк", abbr: "БОГД", scheme: "bogdbank" },
  { name: "Чингис Хаан", abbr: "ЧХБ", scheme: "ckbank" },
];

const z = (n: number) => String(n).padStart(2, "0");

/** Placeholder EMVCo-style payload; the real QR string comes from QPay's invoice response. */
export function qpayPayload(o: Order): string {
  const k = o.invoice.id;
  const amt = String(o.total);
  return (
    "000201010212" +
    "2642" +
    "0011mn.qpay.www" +
    "0115" +
    k.slice(0, 15) +
    "52045533" +
    "5303496" +
    "54" +
    z(amt.length) +
    amt +
    "5802MN" +
    "5907AUTOHUB" +
    "6011ULAANBAATAR" +
    "62" +
    z(k.length + 4) +
    "05" +
    z(k.length) +
    k +
    "6304"
  );
}
