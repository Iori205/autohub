"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import styles from "./Overlays.module.css";

/** Дэвсгэртэй голлосон цонх; Esc эсвэл дэвсгэр дээр дарахад хаагдана. */
export function Modal({
  title,
  desc,
  onClose,
  children,
  footer,
  width = 520,
  headerExtra,
  z = 70,
}: {
  title: ReactNode;
  desc?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  headerExtra?: ReactNode;
  z?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} style={{ zIndex: z }} onClick={onClose}>
      <div
        className={styles.dialog}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.headText}>
            <h2>{title}</h2>
            {desc && <span>{desc}</span>}
          </div>
          <div className={styles.headActions}>
            {headerExtra}
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Хаах">
              <X size={19} />
            </button>
          </div>
        </div>
        {children}
        {footer && <div className={styles.foot}>{footer}</div>}
      </div>
    </div>
  );
}
