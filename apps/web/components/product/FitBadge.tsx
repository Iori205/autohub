import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import type { FitStatus } from "../../lib/types";
import styles from "./FitBadge.module.css";

const LABELS: Record<FitStatus, { long: string; short: string }> = {
  yes: { long: "Таны машинд тохирно", short: "Тохирно" },
  no: { long: "Таны машинд тохирохгүй", short: "Тохирохгүй" },
  unknown: { long: "Тохирол тодорхойгүй", short: "Тодорхойгүй" },
};

const ICONS = { yes: CircleCheck, no: CircleX, unknown: CircleHelp };

/** `responsive` shows the short label below 820px (product cards). */
export function FitBadge({
  status,
  responsive = false,
  className = "",
}: {
  status: FitStatus;
  responsive?: boolean;
  className?: string;
}) {
  const Icon = ICONS[status];
  const l = LABELS[status];
  return (
    <span className={`${styles.badge} ${className}`} data-status={status}>
      <Icon size={13} />
      {responsive ? (
        <>
          <span className="not-mobile">{l.long}</span>
          <span className="only-mobile">{l.short}</span>
        </>
      ) : (
        l.long
      )}
    </span>
  );
}
