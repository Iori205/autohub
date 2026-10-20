import type { DeliveryKind, Order, OrderStatus } from "./types";

/**
 * Тэмдгийн өнгө: тус бүр globals.css-ийн `tone-*` класс тул цайвар/харанхуйн гэрэлтэлтийг тэнд зохицуулна.
 * Улаан өнгө зөвхөн алдаа / цуцлалтад.
 */
export type Tone = "amber" | "blue" | "violet" | "cyan" | "green" | "red" | "pink" | "neutral";

export interface BadgeSpec {
  label: string;
  tone: Tone;
}

export const STATUS: Record<OrderStatus, BadgeSpec> = {
  pending: { label: "Төлбөр хүлээгдэж буй", tone: "amber" },
  paid: { label: "Төлөгдсөн", tone: "blue" },
  preparing: { label: "Бэлтгэж байна", tone: "violet" },
  shipping: { label: "Хүргэлтэнд", tone: "cyan" },
  delivered: { label: "Хүргэгдсэн", tone: "green" },
  cancelled: { label: "Цуцлагдсан", tone: "red" },
  expired: { label: "Хугацаа дууссан", tone: "neutral" },
};

export const STATUS_KEYS = Object.keys(STATUS) as OrderStatus[];

/** Хэвийн урсгал (цуцлах/хугацаа дуусах нь эцсийн гарц). */
export const FLOW: OrderStatus[] = ["pending", "paid", "preparing", "shipping", "delivered"];

/** Орлогод зөвхөн мөнгө нь орж, буцаагдаагүй захиалгыг тооцно. */
export const isLive = (o: Pick<Order, "status">) =>
  o.status !== "pending" && o.status !== "cancelled" && o.status !== "expired";

export function payBadge(o: Pick<Order, "status" | "paid">): BadgeSpec {
  if (o.status === "pending") return { label: "Хүлээгдэж буй", tone: "amber" };
  if (o.status === "expired") return { label: "Хугацаа дууссан", tone: "neutral" };
  if (o.status === "cancelled")
    return o.paid ? { label: "Буцаагдсан", tone: "pink" } : { label: "Цуцлагдсан", tone: "red" };
  return { label: "Төлөгдсөн", tone: "green" };
}

export const PAY_LABELS = ["Төлөгдсөн", "Хүлээгдэж буй", "Буцаагдсан", "Цуцлагдсан", "Хугацаа дууссан"];

export const DELIVERY: Record<DeliveryKind, string> = {
  ub: "Хүргэлт (УБ)",
  pickup: "Очиж авах",
  country: "Орон нутаг",
};

export const typeBadge = (genuine: boolean): BadgeSpec =>
  genuine ? { label: "Оригинал", tone: "blue" } : { label: "Аналог", tone: "neutral" };

export type StockLevel = "ok" | "low" | "out";

export const stockLevel = (p: { stock: number; threshold: number }): StockLevel =>
  p.stock === 0 ? "out" : p.stock <= p.threshold ? "low" : "ok";

export const STOCK_BADGE: Record<StockLevel, BadgeSpec> = {
  ok: { label: "Хангалттай", tone: "green" },
  low: { label: "Бага", tone: "amber" },
  out: { label: "Дууссан", tone: "red" },
};

/** Нөөцийн тооны текстийн өнгө */
export const STOCK_COLOR: Record<StockLevel, string> = {
  ok: "var(--text)",
  low: "var(--tone-amber)",
  out: "var(--danger)",
};
