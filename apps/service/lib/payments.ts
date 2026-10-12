import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma, type Order, type PaymentInvoice, type Prisma } from "@repo/db";
import { orderStage, type BankLinkDto, type PaymentStateDto, type QPayInvoiceDto } from "@repo/types";
import qrcode from "qrcode-generator";
import { env } from "./env";
import { ApiError, conflict } from "./http";
import { INVOICE_TTL_MS, markPaid } from "./orders";
import { cancelInvoice, checkInvoice, createInvoice, type QPayUrl } from "./qpay";

/*
 * Payments: one QPay invoice per payment attempt, valid for 15 minutes.
 * The order is marked paid only after QPay confirms it (payment/check) —
 * the callback is a hint to check, never trusted on its own.
 */

export const demoMode = () => process.env.DEMO_MODE === "true";
const GRACE_MS = 2 * 60e3; // late payments are still caught by the check

/* ---------- callback URL signing ---------- */

export function callbackSig(number: string) {
  return createHmac("sha256", env.authSecret).update(`qpay:${number}`).digest("hex").slice(0, 32);
}

export function validCallbackSig(number: string, sig: string | null) {
  if (!sig) return false;
  const a = Buffer.from(callbackSig(number));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function callbackUrl(number: string) {
  const base = (process.env.PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
  return `${base}/api/v1/payments/qpay/callback?order=${encodeURIComponent(number)}&sig=${callbackSig(number)}`;
}

/* ---------- DTOs ---------- */

export function paymentState(o: Order): PaymentStateDto {
  const left = o.paymentStatus === "PENDING" && o.invoiceExpiresAt ? Math.max(0, Math.round((o.invoiceExpiresAt.getTime() - Date.now()) / 1000)) : 0;
  return {
    orderNumber: o.number,
    paymentStatus: o.paymentStatus,
    stage: orderStage(o),
    paidAt: o.paidAt?.toISOString() ?? null,
    paymentId: o.qpayPaymentId,
    invoiceExpiresAt: o.invoiceExpiresAt?.toISOString() ?? null,
    secondsLeft: left,
  };
}

const invoiceDto = (inv: PaymentInvoice, number: string): QPayInvoiceDto => ({
  orderNumber: number,
  invoiceId: inv.id,
  amount: inv.amount,
  qrImage: inv.qrImage,
  qrText: inv.qrText,
  shortUrl: inv.shortUrl,
  urls: (inv.urls as unknown as BankLinkDto[]) ?? [],
  expiresAt: inv.expiresAt.toISOString(),
  demo: inv.demo,
});

/* ---------- DEMO_MODE invoice (no QPay call) ---------- */

const DEMO_BANKS: [string, string][] = [
  ["Хаан банк", "khanbank"],
  ["Голомт", "golomtbank"],
  ["ХХБ", "tdbbank"],
  ["Төрийн банк", "statebank"],
  ["Хас банк", "xacbank"],
  ["Капитрон", "capitronbank"],
  ["М банк", "mbank"],
  ["Ард", "ard"],
  ["MonPay", "monpay"],
  ["SocialPay", "socialpay-payment"],
  ["Богд банк", "bogdbank"],
  ["Чингис Хаан", "ckbank"],
];

function qrDataUrl(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(6, 2);
}

function demoInvoice(o: Order) {
  const id = `demo-${randomUUID()}`;
  const qrText = `AUTOHUB-DEMO|${o.number}|${o.total}|${id}`;
  const urls: QPayUrl[] = DEMO_BANKS.map(([name, scheme]) => ({
    name,
    description: name,
    logo: "",
    link: `${scheme}://q?qPay_QRcode=${encodeURIComponent(qrText)}`,
  }));
  return { id, qrText, qrImage: qrDataUrl(qrText), shortUrl: null, urls };
}

/** DEMO_MODE: the next N checks for an order fail like a QPay outage. */
const demoFailures = new Map<string, number>();
export function demoFailNextChecks(number: string, n = 1) {
  demoFailures.set(number, n);
}

/* ---------- invoices ---------- */

/**
 * Invoice for the payment screen: the current one while it's still valid,
 * otherwise a fresh 15-minute invoice (this also reopens an EXPIRED order —
 * "Шинэ нэхэмжлэх").
 */
export async function openInvoice(o: Order): Promise<QPayInvoiceDto> {
  if (o.paymentStatus === "PAID") throw conflict("Захиалга аль хэдийн төлөгдсөн байна");
  if (o.paymentStatus === "CANCELLED") throw conflict("Захиалга цуцлагдсан байна");

  const now = Date.now();
  if (o.paymentStatus === "PENDING" && o.qpayInvoiceId) {
    const current = await prisma.paymentInvoice.findUnique({ where: { id: o.qpayInvoiceId } });
    if (current?.status === "OPEN" && current.expiresAt.getTime() - 30_000 > now) return invoiceDto(current, o.number);
  }

  // retire the old invoice before issuing a new one
  if (o.qpayInvoiceId) await retireInvoice(o.qpayInvoiceId, "EXPIRED");

  const created = demoMode()
    ? demoInvoice(o)
    : await createInvoice({
        senderInvoiceNo: `${o.number}-${now.toString(36)}`,
        receiverCode: o.customerPhone,
        description: `AuToHub захиалга #${o.number}`,
        amount: o.total,
        callbackUrl: callbackUrl(o.number),
      }).then((q) => ({
        id: q.invoice_id,
        qrText: q.qr_text,
        qrImage: q.qr_image.startsWith("data:") ? q.qr_image : `data:image/png;base64,${q.qr_image}`,
        shortUrl: q.qPay_shortUrl ?? null,
        urls: q.urls ?? [],
      }));

  const expiresAt = new Date(now + INVOICE_TTL_MS);
  const [inv] = await prisma.$transaction([
    prisma.paymentInvoice.create({
      data: {
        id: created.id,
        orderId: o.id,
        amount: o.total,
        qrText: created.qrText,
        qrImage: created.qrImage,
        shortUrl: created.shortUrl,
        urls: created.urls as unknown as Prisma.InputJsonValue,
        demo: demoMode(),
        expiresAt,
      },
    }),
    prisma.order.update({
      where: { id: o.id },
      data: { paymentStatus: "PENDING", qpayInvoiceId: created.id, invoiceExpiresAt: expiresAt, expiredAt: null },
    }),
  ]);
  return invoiceDto(inv, o.number);
}

/** Close an invoice locally and (best effort) at QPay. */
export async function retireInvoice(invoiceId: string, status: "EXPIRED" | "CANCELLED") {
  const inv = await prisma.paymentInvoice.findUnique({ where: { id: invoiceId } });
  if (!inv || inv.status !== "OPEN") return;
  await prisma.paymentInvoice.update({ where: { id: invoiceId }, data: { status } });
  if (!inv.demo) await cancelInvoice(invoiceId).catch((e) => console.warn("[qpay] cancel failed", invoiceId, (e as Error).message));
}

async function reload(o: Order) {
  return prisma.order.findUniqueOrThrow({ where: { id: o.id } });
}

/** PENDING → EXPIRED once the invoice window has passed (no-op otherwise). */
async function expire(o: Order) {
  const res = await prisma.order.updateMany({
    where: { id: o.id, paymentStatus: "PENDING" },
    data: { paymentStatus: "EXPIRED", expiredAt: o.invoiceExpiresAt ?? new Date() },
  });
  if (res.count && o.qpayInvoiceId) await retireInvoice(o.qpayInvoiceId, "EXPIRED");
}

/**
 * Ask QPay whether the current invoice is paid. Marks the order PAID (and
 * deducts stock) when the paid amount covers the total; expires it when the
 * 15 minutes are over. Used by polling, the callback and the sweep.
 */
export async function checkPayment(o: Order, { grace = 0 } = {}): Promise<PaymentStateDto> {
  if (o.paymentStatus === "PAID" || o.paymentStatus === "CANCELLED") return paymentState(o);
  const inv = o.qpayInvoiceId ? await prisma.paymentInvoice.findUnique({ where: { id: o.qpayInvoiceId } }) : null;

  if (inv && !inv.demo) {
    const res = await checkInvoice(inv.id);
    const paid = (res.rows ?? []).filter((r) => r.payment_status === "PAID");
    const amount = paid.reduce((a, r) => a + Number(r.payment_amount || 0), 0);
    if (paid.length && amount >= o.total) {
      const paymentId = paid[0]!.payment_id;
      if (await markPaid(o.id, { paymentId })) await prisma.paymentInvoice.update({ where: { id: inv.id }, data: { status: "PAID", paymentId } });
      return paymentState(await reload(o));
    }
  } else if (inv?.demo) {
    const left = demoFailures.get(o.number) ?? 0;
    if (left > 0) {
      if (left === 1) demoFailures.delete(o.number);
      else demoFailures.set(o.number, left - 1);
      throw new ApiError("PAYMENT_PROVIDER", "QPay-тэй холбогдож чадсангүй. Дахин оролдоно уу");
    }
  }

  if (o.paymentStatus === "PENDING" && o.invoiceExpiresAt && o.invoiceExpiresAt.getTime() + grace < Date.now()) await expire(o);
  return paymentState(await reload(o));
}

/** Customer pressed "Төлбөрийг цуцлах": the invoice is cancelled, the order stays and can be paid later. */
export async function cancelPayment(o: Order): Promise<PaymentStateDto> {
  if (o.paymentStatus !== "PENDING") return paymentState(o);
  // a payment that went through just before cancelling still counts
  const state = await checkPayment(o).catch(() => null);
  if (state?.paymentStatus === "PAID") return state;
  await prisma.order.updateMany({ where: { id: o.id, paymentStatus: "PENDING" }, data: { paymentStatus: "EXPIRED", expiredAt: new Date() } });
  if (o.qpayInvoiceId) await retireInvoice(o.qpayInvoiceId, "CANCELLED");
  return paymentState(await reload(o));
}

/* ---------- DEMO_MODE actions ---------- */

export async function demoPaid(o: Order) {
  if (o.paymentStatus === "PAID") return paymentState(o);
  if (o.paymentStatus === "CANCELLED") throw conflict("Захиалга цуцлагдсан байна");
  const paymentId = `demo-${Date.now()}`;
  if (await markPaid(o.id, { paymentId }))
    if (o.qpayInvoiceId) await prisma.paymentInvoice.updateMany({ where: { id: o.qpayInvoiceId }, data: { status: "PAID", paymentId } });
  return paymentState(await reload(o));
}

export async function demoExpire(o: Order) {
  if (o.paymentStatus !== "PENDING") return paymentState(o);
  await prisma.order.update({ where: { id: o.id }, data: { invoiceExpiresAt: new Date() } });
  await expire(await reload(o));
  return paymentState(await reload(o));
}

/* ---------- 15-minute expiry sweep ---------- */

let lastSweep = 0;

/**
 * Expires PENDING orders whose invoice ran out (plus a short grace for late
 * QPay confirmations). Throttled; called from order reads, so no cron is needed.
 */
export async function sweepExpired(force = false) {
  const now = Date.now();
  if (!force && now - lastSweep < 30_000) return;
  lastSweep = now;
  const cutoff = new Date(now - GRACE_MS);
  const stale = await prisma.order.findMany({
    where: { paymentStatus: "PENDING", invoiceExpiresAt: { lt: cutoff } },
    take: 50,
  });
  for (const o of stale) {
    // real invoices get one last check, so a late payment isn't lost
    await checkPayment(o, { grace: GRACE_MS }).catch(() => expire(o));
  }
}
