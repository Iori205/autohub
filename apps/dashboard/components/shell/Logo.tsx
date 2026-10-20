import styles from "./Shell.module.css";

export function Logo({ size = "md", hideText }: { size?: "md" | "lg"; hideText?: boolean }) {
  return (
    <span className={`${styles.logo} ${size === "lg" ? styles.logoLg : ""}`}>
      <span className={styles.mark}>A</span>
      {!hideText && (
        <span className={`${styles.wordmark} side-label`}>
          AuToHub <span>Admin</span>
        </span>
      )}
    </span>
  );
}
