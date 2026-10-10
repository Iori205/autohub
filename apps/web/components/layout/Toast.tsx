"use client";

import { CircleCheck } from "lucide-react";
import { useShop } from "../../lib/store/shop";
import styles from "./Toast.module.css";

export function Toast() {
  const { toast } = useShop();
  if (!toast) return null;
  return (
    <div className={styles.toast} role="status">
      <CircleCheck size={16} />
      {toast}
    </div>
  );
}
