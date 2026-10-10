import styles from "./Switch.module.css";

/** Visual toggle track; the clickable row around it owns the handler. */
export function Switch({
  on,
  tone = "accent",
  size = "md",
}: {
  on: boolean;
  tone?: "accent" | "ok";
  size?: "md" | "lg";
}) {
  return (
    <span
      className={`${styles.track} ${styles[size]}`}
      data-on={on}
      data-tone={tone}
      aria-hidden
    >
      <span className={styles.knob} />
    </span>
  );
}
