"use client";

import Link from "next/link";
import { useSite } from "../../lib/site-context";
import styles from "./Logo.module.css";

export function Logo({
  size = "md",
  onClick,
}: {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const { name } = useSite();
  return (
    <Link href="/" className={`${styles.logo} ${styles[size]}`} onClick={onClick}>
      <span className={styles.mark}>A</span>
      <span className={styles.name}>{name}</span>
    </Link>
  );
}
