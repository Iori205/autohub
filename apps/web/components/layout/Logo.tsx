import Link from "next/link";
import { STORE_NAME } from "../../lib/site";
import styles from "./Logo.module.css";

export function Logo({
  size = "md",
  onClick,
}: {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  return (
    <Link href="/" className={`${styles.logo} ${styles[size]}`} onClick={onClick}>
      <span className={styles.mark}>A</span>
      <span className={styles.name}>{STORE_NAME}</span>
    </Link>
  );
}
