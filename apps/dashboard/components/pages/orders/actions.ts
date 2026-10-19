"use client";

import { cancelOrder, checkPayment, setOrderStatus } from "../../../lib/api/orders";
import { downloadCsv } from "../../../lib/csv";
import { money } from "../../../lib/format";
import { DELIVERY, STATUS, payBadge } from "../../../lib/status";
import { ubToday } from "../../../lib/format";
import type { Order, OrderStatus } from "../../../lib/types";
import { openForm, toast } from "../../../lib/ui";

const CANCEL_REASONS = [
  "",
  "Харилцагч цуцлах хүсэлт гаргасан",
  "Бараа дууссан",
  "Машинд тохирохгүй",
  "Төлбөрийн асуудал",
  "Хуурамч захиалга",
  "Бусад",
];

export function openCancel(o: Order) {
  openForm({
    title: `#${o.id} захиалга цуцлах`,
    desc: o.paid
      ? `Төлбөр төлөгдсөн тул ${money(o.total)} QPay-ээр буцаан олголт хийгдэнэ. Энэ үйлдлийг буцаах боломжгүй.`
      : "Энэ үйлдлийг буцаах боломжгүй.",
    danger: true,
    submit: "Захиалга цуцлах",
    fields: [
      { key: "reason", label: "Цуцлах шалтгаан", type: "select", required: true, options: CANCEL_REASONS },
      { key: "comment", label: "Тайлбар", type: "textarea", required: true, placeholder: "Харилцагчид илгээх тайлбар" },
    ],
    values: { reason: "", comment: "" },
    onSubmit: async (v) => {
      await cancelOrder(o.id, v.reason!, v.comment!.trim());
      toast(`#${o.id} захиалга цуцлагдлаа`, "ok");
    },
  });
}

export async function changeStatus(o: Order, status: OrderStatus) {
  if (status === o.status) return;
  if (status === "cancelled") return openCancel(o);
  const failed = await setOrderStatus(o.id, status);
  if (failed[o.id]) return toast(failed[o.id]!, "err");
  toast(`#${o.id} → ${STATUS[status].label}`, "ok");
}

export async function runPaymentCheck(o: Order) {
  toast("QPay-ээс төлөв шалгаж байна…", "info");
  const r = await checkPayment(o.id);
  if (r.paid) toast(`#${o.id}: төлбөр баталгаажсан`, "ok");
  else toast(`#${o.id}: төлбөр хараахан ороогүй байна`, "err");
}

export function exportOrders(list: Order[]) {
  downloadCsv(`autohub-orders-${ubToday()}.csv`, [
    ["Захиалга", "Огноо", "Харилцагч", "Утас", "Дүн", "Төлбөр", "Хүргэлт", "Төлөв"],
    ...list.map((o) => [o.id, o.createdAt, o.customer.name, o.customer.phone, o.total, payBadge(o).label, DELIVERY[o.delivery], STATUS[o.status].label]),
  ]);
}

/** Next step in the normal flow, shown as the primary action on the detail page. */
export const NEXT_STEP: Partial<Record<OrderStatus, [label: string, to: OrderStatus | "check"]>> = {
  pending: ["Төлбөр шалгах", "check"],
  paid: ["Бэлтгэж эхлэх", "preparing"],
  preparing: ["Хүргэлтэнд гаргах", "shipping"],
  shipping: ["Хүргэгдсэн болгох", "delivered"],
};

export const canCancel = (o: Order) => !["cancelled", "expired", "delivered"].includes(o.status);
