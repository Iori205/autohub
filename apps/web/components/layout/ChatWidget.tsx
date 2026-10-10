"use client";

import { useRef, useState } from "react";
import { Headset, MessageCircle, Send, X } from "lucide-react";
import styles from "./ChatWidget.module.css";

interface Msg {
  me: boolean;
  t: string;
}

// Mock live-chat. Replace the canned reply with the real chat backend later.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      me: false,
      t: "Сайн байна уу! Машиныхаа загвар эсвэл VIN дугаараа бичээрэй — тохирох сэлбэгийг шалгаад өгье.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollDown = () =>
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight }),
    );

  const send = () => {
    const t = msg.trim();
    if (!t) return;
    setMsg("");
    setMsgs((m) => [...m, { me: true, t }]);
    scrollDown();
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          me: false,
          t: "Баярлалаа! Зөвлөх тань 1 минутын дотор хариулна. VIN дугаараа илгээвэл тохирохыг шууд шалгаж өгье.",
        },
      ]);
      scrollDown();
    }, 900);
  };

  return (
    <div className={styles.dock}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.head}>
            <span className={styles.avatar}>
              <Headset size={17} />
              <span className={styles.dot} />
            </span>
            <div style={{ flex: 1 }}>
              <div className={styles.title}>Онлайн зөвлөх</div>
              <div className={styles.status}>Онлайн · Бодит цагт хариулна</div>
            </div>
            <button className={styles.close} onClick={() => setOpen(false)}>
              <X size={15} />
            </button>
          </div>
          <div className={styles.list} ref={listRef}>
            {msgs.map((m, i) => (
              <div key={i} className={styles.row} data-me={m.me}>
                <span className={styles.bubble}>{m.t}</span>
              </div>
            ))}
          </div>
          <div className={styles.compose}>
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Мессеж бичих…"
            />
            <button onClick={send} aria-label="Илгээх">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        className={styles.fab}
        onClick={() => setOpen((o) => !o)}
        title="Онлайн зөвлөгөө · Бодит цагт хариулна"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        <span className={styles.fabDot} />
      </button>
    </div>
  );
}
