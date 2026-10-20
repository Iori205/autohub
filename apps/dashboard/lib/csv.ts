"use client";

import { toast } from "./ui";

/** Мөрүүдийг UTF-8 CSV-ээр татах (Excel кирилл зөв уншихын тулд BOM-той). */
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const csv =
    "﻿" +
    rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`${name} татагдлаа`, "ok");
}
