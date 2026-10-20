"use client";

import { adjustStock } from "../../../lib/api/products";
import type { Product } from "../../../lib/types";
import { openForm, toast } from "../../../lib/ui";

const REASONS = ["Шинэ орлого", "Буцаалт", "Гэмтэл / гологдол", "Тооллогын зөрүү", "Борлуулалт (гараар)"];

/** «Нөөц тохируулах» маягт — Нөөц, хянах самбар, нөөц багассан жагсаалтаас дуудагдана. */
export function openAdjustStock(products: Product[], product?: Product) {
  openForm({
    title: "Нөөц тохируулах",
    desc: product ? `${product.name} · одоогийн нөөц ${product.stock} ш` : "Барааны нөөцийг нэмэх эсвэл хасах",
    fields: [
      { key: "pid", label: "Бараа", type: "select", full: true, options: products.map((x) => [String(x.id), `${x.name} (${x.stock} ш)`]) },
      { key: "dir", label: "Үйлдэл", type: "select", options: [["+", "+ Нэмэх"], ["-", "− Хасах"]] },
      { key: "qty", label: "Тоо ширхэг", type: "number", required: true, placeholder: "0" },
      { key: "reason", label: "Шалтгаан", type: "select", full: true, options: REASONS },
      { key: "note", label: "Тэмдэглэл", type: "textarea", full: true, placeholder: "Нийлүүлэгч, баримтын дугаар…" },
    ],
    values: { pid: String(product?.id ?? products[0]?.id ?? ""), dir: "+", qty: "", reason: REASONS[0]!, note: "" },
    validate: (v) => {
      const x = products.find((p) => p.id === Number(v.pid));
      if (!(Number(v.qty) > 0)) return { qty: "0-ээс их тоо оруулна уу" };
      if (x && v.dir === "-" && Number(v.qty) > x.stock) return { qty: `Нөөцөөс их байна (${x.stock} ш)` };
      return {};
    },
    onSubmit: async (v) => {
      const x = products.find((p) => p.id === Number(v.pid));
      if (!x) return;
      const d = (v.dir === "+" ? 1 : -1) * Number(v.qty);
      const after = await adjustStock(x.id, d, v.reason + (v.note?.trim() ? ` · ${v.note.trim()}` : ""));
      toast(`${x.name}: ${d > 0 ? "+" : ""}${d} ш → ${after} ш`, "ok");
    },
  });
}
