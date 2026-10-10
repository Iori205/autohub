import { fmtDateTime } from "./format";
import type { Order, PayStatus } from "./types";

/** Pending invoices past their expiry count as expired. */
export const effectivePayStatus = (o: Order, now: number): PayStatus =>
  o.payStatus === "pending" && o.invoice.expires && now > o.invoice.expires
    ? "expired"
    : o.payStatus;

export const PAY_STATUS: Record<PayStatus, { label: string; color: string }> = {
  pending: { label: "Хүлээгдэж буй", color: "var(--warn)" },
  paid: { label: "Төлөгдсөн", color: "var(--ok)" },
  cancelled: { label: "Цуцлагдсан", color: "var(--danger)" },
  expired: { label: "Хугацаа дууссан", color: "var(--mut)" },
};

const stageLabels = (pickup: boolean) => [
  "",
  "Төлбөр төлөгдсөн",
  "Бэлтгэж байна",
  pickup ? "Авахад бэлэн" : "Хүргэлтэнд гарсан",
  pickup ? "Хүлээлгэн өгсөн" : "Хүргэгдсэн",
];

export interface TimelineStep {
  label: string;
  sub: string;
  state: "done" | "current" | "failed" | "todo";
  /** connector below this step is green */
  lineDone: boolean;
  last: boolean;
}

export function orderView(o: Order, now: number) {
  const ps = effectivePayStatus(o, now);
  const pickup = o.delivery === "pickup";
  const stage = ps === "paid" ? o.stage : 0;
  const failed = ps === "cancelled" || ps === "expired";
  const STG = stageLabels(pickup);

  const statusLabel =
    ps === "paid"
      ? STG[stage]!
      : ps === "pending"
        ? "Төлбөр хүлээгдэж байна"
        : PAY_STATUS[ps].label;

  const subs = [
    fmtDateTime(o.created),
    ps === "paid" && o.paidAt
      ? fmtDateTime(o.paidAt) + " · QPay"
      : ps === "pending"
        ? "QPay төлбөр хүлээгдэж байна"
        : ps === "cancelled"
          ? "Хэрэглэгч цуцалсан"
          : "15 минутын дотор төлөгдөөгүй",
    "Агуулахаас бэлтгэнэ",
    pickup ? "Бэлэн болмогц SMS илгээнэ" : "Жолооч таны утсаар холбогдоно",
    "",
  ];

  const labels = ["Захиалга үүссэн", "Төлбөр төлөгдсөн", "Бэлтгэж байна", STG[3]!, STG[4]!];
  const timeline: TimelineStep[] = labels.map((l, i) => {
    const done = i === 0 || (ps === "paid" && i <= stage);
    const fail = failed && i === 1;
    const cur =
      !done && !fail && (ps === "pending" ? i === 1 : ps === "paid" && i === stage + 1);
    const state = done ? "done" : fail ? "failed" : cur ? "current" : "todo";
    return {
      label: fail
        ? ps === "cancelled"
          ? "Төлбөр цуцлагдсан"
          : "Нэхэмжлэхийн хугацаа дууссан"
        : l,
      sub: state !== "todo" ? subs[i]! : "",
      state,
      lineDone: ps === "paid" && i < stage,
      last: i === 4,
    };
  });

  return {
    ps,
    pickup,
    failed,
    isPaid: ps === "paid",
    canPay: ps !== "paid",
    statusLabel,
    statusColor: PAY_STATUS[ps].color,
    payLabel: ps === "pending" ? "Төлөх" : "Дахин төлөх",
    payButton: ps === "pending" ? "QPay-ээр төлөх" : "Шинэ нэхэмжлэх · QPay",
    itemCount: o.items.reduce((a, c) => a + c.qty, 0) + " бараа",
    deliveryTitle: pickup ? "Очиж авах" : "Хүргэлт",
    timeline,
    remaining: Math.max(0, o.invoice.expires - now),
    payRows: [
      ["Төлбөрийн хэрэгсэл", "QPay"],
      ["Нэхэмжлэхийн дугаар", o.invoice.id || "—"],
      ["QPay гүйлгээний дугаар", o.txn || "—"],
      ["Төлсөн огноо", o.paidAt ? fmtDateTime(o.paidAt) : "—"],
    ] as [string, string][],
  };
}

export type OrderView = ReturnType<typeof orderView>;
