import styles from "./Switch.module.css";

/** Зөвхөн харагдах сэлгүүр; дарах үйлдлийг эргэн тойрны мөр хариуцна. */
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
