"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QPayInvoiceDto } from "@repo/types";
import {
  CircleAlert,
  CircleX,
  FlaskConical,
  RefreshCw,
  RotateCw,
  Timer,
  TimerOff,
  WifiOff,
  X,
} from "lucide-react";
import { ApiError } from "../../lib/api/client";
import { useOrder } from "../../lib/api/orders";
import { bankAbbr, cancelPayment, checkPayment, demoAction, openInvoice } from "../../lib/api/payments";
import { fmt, fmtMmSs, fmtTime } from "../../lib/format";
import { useNow } from "../../lib/hooks";
import { showToast } from "../../lib/store/shop";
import type { Order } from "../../lib/types";
import styles from "./QPayModal.module.css";

type Phase = "waiting" | "checking" | "confirmCancel" | "expired" | "cancelled" | "neterr";

const POLL_MS = 5000;
const TTL_MS = 15 * 60e3;

/**
 * QPay нэхэмжлэхийн цонх: `orderNo`-д нэхэмжлэх нээж (эсвэл дахин ашиглаж) QR, банкны холбоос харуулж,
 * төлбөрийг polling-оор хүлээгээд амжилтыг `onPaid`-ээр мэдэгдэнэ.
 */
export function QPayModal({
  orderNo,
  onClose,
  onPaid,
}: {
  orderNo: string;
  onClose: () => void;
  onPaid: (no: string) => void;
}) {
  const order = useOrder(orderNo);
  const now = useNow(1000);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [lastPoll, setLastPoll] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<QPayInvoiceDto | null>(null);
  const opened = useRef(false);

  /** QPay/сүлжээний дуудлага амжилтгүй бол «Сүлжээний алдаа» дэлгэц гарна. */
  const failed = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.code !== "NOT_FOUND") showToast(e.message);
    else setPhase("neterr");
  }, []);

  // Нээгдэхэд нэхэмжлэхийг нэг удаа үүсгэнэ / дахин ашиглана.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    openInvoice(orderNo)
      .then((inv) => {
        setInvoice(inv);
        setLastPoll(Date.now());
      })
      .catch(failed);
  }, [orderNo, failed]);

  // Төлөгдсөн (polling, гараар шалгах, демо) → амжилтын дэлгэц рүү.
  useEffect(() => {
    if (order && order.payStatus === "paid") onPaid(order.no);
  }, [order, onPaid]);

  const waiting = phase === "waiting" || phase === "checking";

  // Хүлээх зуур арын polling (төлөвийг сервер / QPay callback өөрчилнө).
  useEffect(() => {
    if (!waiting || !order) return;
    const t = setInterval(() => {
      checkPayment(orderNo)
        .then(() => setLastPoll(Date.now()))
        .catch(failed);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [waiting, orderNo, order, failed]);

  // Сервер 15 минутын дараа нэхэмжлэхийг дуусгадаг; дуусмагц харуулна.
  useEffect(() => {
    if (waiting && order?.payStatus === "expired") setPhase("expired");
  }, [waiting, order?.payStatus]);

  // Тоолуур тэг болсон: серверээс асууна (сүүлийн секундийн төлбөрийг баталгаажуулах эсвэл нэхэмжлэхийг дуусгана).
  const expiryChecked = useRef<string | null>(null);
  useEffect(() => {
    if (!waiting || !order || order.payStatus !== "pending" || now <= order.invoice.expires) return;
    if (expiryChecked.current === order.invoice.id) return;
    expiryChecked.current = order.invoice.id;
    void checkPayment(order.no).catch(failed);
  }, [now, waiting, order, failed]);

  // Esc хаана; хуудасны гүйлгээг түгжинэ.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const manualCheck = useCallback(async () => {
    setPhase("checking");
    try {
      const st = await checkPayment(orderNo);
      setLastPoll(Date.now());
      if (st.paymentStatus !== "PAID") {
        setPhase(st.paymentStatus === "EXPIRED" ? "expired" : "waiting");
        if (st.paymentStatus === "PENDING") showToast("Төлбөр хараахан ороогүй байна");
      }
    } catch (e) {
      failed(e);
    }
  }, [orderNo, failed]);

  const regenerate = async () => {
    try {
      setInvoice(await openInvoice(orderNo));
      setLastPoll(Date.now());
      setPhase("waiting");
    } catch (e) {
      failed(e);
    }
  };

  const qrSrc = invoice?.qrImage ?? "";

  if (!order) return null;

  const remaining = Math.max(0, order.invoice.expires - now);
  const low = remaining < 120e3;
  const pct = Math.min(100, (remaining / TTL_MS) * 100);

  const props: WaitProps = {
    order,
    qrSrc,
    banks: invoice?.urls ?? [],
    demo: invoice?.demo ?? false,
    checking: phase === "checking",
    remaining,
    low,
    pct,
    lastPoll,
    onCheck: manualCheck,
    onCancel: () => setPhase("confirmCancel"),
    onDemoPaid: () => void demoAction(order.no, "paid").catch(failed),
    onDemoExpire: () => {
      demoAction(order.no, "expired")
        .then(() => setPhase("expired"))
        .catch(failed);
    },
    // дараагийн серверийн шалгалт QPay тасалдсан мэт унана
    onDemoNet: () => {
      demoAction(order.no, "error")
        .then(() => checkPayment(order.no))
        .catch(failed);
    },
  };

  return (
    <div className={styles.overlay} data-qpay-open>
      <div className={styles.modal} role="dialog" aria-modal aria-label="QPay нэхэмжлэх">
        <div className={styles.head}>
          <span className={`qpay-logo ${styles.headLogo}`}>QPay</span>
          <div className={styles.headText}>
            <div className={styles.headTitle}>Нэхэмжлэх</div>
            <div className={`mono ${styles.invId}`}>{order.invoice.id}</div>
          </div>
          <button className={styles.close} onClick={onClose} title="Хаах">
            <X size={16} />
          </button>
        </div>

        {waiting && <WideWait {...props} />}

        <div className={`${styles.narrow} ${waiting ? styles.narrowOnly : ""}`}>
          <Amount order={order} size={32} />

          {waiting && <NarrowWait {...props} />}

          {phase === "confirmCancel" && (
            <Notice
              icon={<CircleAlert size={26} />}
              tone="danger"
              title="Төлбөрийг цуцлах уу?"
              text="Нэхэмжлэх хүчингүй болно. Захиалга хадгалагдах бөгөөд дараа нь дахин төлөх боломжтой."
            >
              <div className={styles.twoBtns}>
                <button className="btn" onClick={() => setPhase("waiting")}>
                  Үгүй, буцах
                </button>
                <button
                  className={`btn ${styles.dangerBtn}`}
                  onClick={() => {
                    cancelPayment(order.no)
                      .then((st) => setPhase(st.paymentStatus === "PAID" ? "waiting" : "cancelled"))
                      .catch(failed);
                  }}
                >
                  Тийм, цуцлах
                </button>
              </div>
            </Notice>
          )}

          {phase === "expired" && (
            <Notice
              icon={<TimerOff size={26} />}
              tone="mut"
              title="Нэхэмжлэхийн хугацаа дууссан"
              text="15 минутын дотор төлбөр хийгдээгүй тул нэхэмжлэх хүчингүй боллоо. Шинэ нэхэмжлэх үүсгэж дахин төлнө үү."
            >
              <button className="btn btn-primary btn-lg" onClick={regenerate}>
                <RefreshCw size={16} />
                Дахин үүсгэх
              </button>
              <button className={styles.textBtn} onClick={onClose}>
                Хаах
              </button>
            </Notice>
          )}

          {phase === "cancelled" && (
            <Notice
              icon={<CircleX size={26} />}
              tone="danger"
              title="Төлбөр цуцлагдлаа"
              text="Захиалга төлөгдөөгүй хэвээр байна. «Миний захиалгууд» хэсгээс хүссэн үедээ дахин төлөх боломжтой."
            >
              <button className="btn btn-primary btn-lg" onClick={regenerate}>
                Дахин төлөх
              </button>
              <button className={styles.textBtn} onClick={onClose}>
                Хаах
              </button>
            </Notice>
          )}

          {phase === "neterr" && (
            <Notice
              icon={<WifiOff size={26} />}
              tone="warn"
              title="Сүлжээний алдаа"
              text="QPay-тэй холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу. Хэрэв та төлбөрөө төлсөн бол санаа зовох хэрэггүй — төлбөр автоматаар баталгаажна."
            >
              <button className="btn btn-primary btn-lg" onClick={manualCheck}>
                <RotateCw size={16} />
                Дахин оролдох
              </button>
              <button className={styles.textBtn} onClick={onClose}>
                Хаах
              </button>
            </Notice>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

interface WaitProps {
  order: Order;
  qrSrc: string;
  /** QPay нэхэмжлэхийн банк / хэтэвчний холбоосууд */
  banks: QPayInvoiceDto["urls"];
  /** DEMO_MODE нэхэмжлэх → туршилтын товчнуудыг харуулна */
  demo: boolean;
  checking: boolean;
  remaining: number;
  low: boolean;
  pct: number;
  lastPoll: number | null;
  onCheck: () => void;
  onCancel: () => void;
  onDemoPaid: () => void;
  onDemoExpire: () => void;
  onDemoNet: () => void;
}

function Amount({ order, size }: { order: Order; size: number }) {
  return (
    <div className={styles.amount}>
      <div>
        <div className={styles.amountLabel}>Захиалга</div>
        <div className={`mono ${styles.orderNo}`}>#{order.no}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className={styles.amountLabel}>Төлөх дүн</div>
        <div className={styles.total} style={{ fontSize: size }}>
          {fmt(order.total)}
        </div>
      </div>
    </div>
  );
}

function Qr({ src, size, dim }: { src: string; size: number; dim: boolean }) {
  return (
    <div className={styles.qrFrame}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data: URL
        <img
          src={src}
          alt="QPay QR"
          width={size}
          height={size}
          className={styles.qrImg}
          style={{ opacity: dim ? 0.35 : 1 }}
        />
      ) : (
        <div className={styles.qrLoading} style={{ width: size, height: size }}>
          QR үүсгэж байна…
        </div>
      )}
      <span className={styles.qrLogo}>QPay</span>
    </div>
  );
}

function Countdown({ remaining, low, pct }: Pick<WaitProps, "remaining" | "low" | "pct">) {
  return (
    <div className={styles.countdown}>
      <div className={styles.countdownText}>
        <Timer size={15} />
        <span>
          Нэхэмжлэх{" "}
          <b className="mono" style={{ color: low ? "var(--danger)" : "var(--fg)" }}>
            {fmtMmSs(remaining)}
          </b>{" "}
          минутын дараа хүчингүй болно
        </span>
      </div>
      <span className={styles.track}>
        <span
          style={{ width: `${pct}%`, background: low ? "var(--danger)" : "var(--accent)" }}
        />
      </span>
    </div>
  );
}

function PollStatus({ checking, lastPoll }: Pick<WaitProps, "checking" | "lastPoll">) {
  return (
    <div className={styles.status}>
      {checking ? (
        <span className={styles.spinner} />
      ) : (
        <span className={styles.pulse}>
          <span />
          <span />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.statusTitle}>
          {checking ? "Төлбөр шалгаж байна…" : "Төлбөр хүлээгдэж байна..."}
        </div>
        <div className={styles.statusSub}>
          5 сек тутам автоматаар шалгана · Сүүлд:{" "}
          <span className="mono">{lastPoll ? fmtTime(lastPoll) : "—"}</span>
        </div>
      </div>
    </div>
  );
}

function Actions({ onCheck, onCancel }: Pick<WaitProps, "onCheck" | "onCancel">) {
  return (
    <>
      <button className={styles.checkBtn} onClick={onCheck}>
        <RefreshCw size={16} />
        Төлбөр шалгах
      </button>
      <button className={styles.cancelLink} onClick={onCancel}>
        Цуцлах
      </button>
    </>
  );
}

/** DEMO_MODE-ийн туршилтын товчнууд (жинхэнэ QPay нэхэмжлэхэд харагдахгүй). */
function DemoBox({ onDemoPaid, onDemoExpire, onDemoNet }: Pick<WaitProps, "onDemoPaid" | "onDemoExpire" | "onDemoNet">) {
  return (
    <div className={styles.demo}>
      <div className={styles.demoRow}>
        <span className={`mono ${styles.demoTag}`}>DEMO</span>
        <button className={styles.demoBtn} onClick={onDemoPaid}>
          <FlaskConical size={15} />
          Төлөгдсөнийг дуурайх
        </button>
      </div>
      <div className={styles.demoLinks}>
        <span>Туршилт:</span>
        <button onClick={onDemoExpire}>Хугацаа дуусгах</button>
        <button onClick={onDemoNet}>Сүлжээний алдаа</button>
      </div>
    </div>
  );
}

function WideWait(p: WaitProps) {
  return (
    <div className={styles.wide}>
      <div className={styles.wideLeft}>
        <Qr src={p.qrSrc} size={280} dim={p.checking} />
        <div className={styles.scanText}>QPay QR кодыг банкны аппаараа уншуулна уу</div>
        <Countdown remaining={p.remaining} low={p.low} pct={p.pct} />
      </div>
      <div className={styles.wideRight}>
        <Amount order={p.order} size={40} />
        <div className={styles.sep} />
        <PollStatus checking={p.checking} lastPoll={p.lastPoll} />
        <Actions onCheck={p.onCheck} onCancel={p.onCancel} />
        <div className={styles.howTo}>
          <div className={styles.howTitle}>ХЭРХЭН ТӨЛӨХ ВЭ?</div>
          {[
            "Банкны аппаа нээнэ",
            "QPay хэсгээс QR код уншуулна",
            "Төлбөрөө баталгаажуулна — захиалга автоматаар шинэчлэгдэнэ",
          ].map((t, i) => (
            <div key={t} className={styles.howStep}>
              <span className="mono">{i + 1}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
        {p.demo && <DemoBox {...p} />}
      </div>
    </div>
  );
}

function NarrowWait(p: WaitProps) {
  return (
    <>
      <div className={`only-mobile ${styles.banks}`}>
        <div className={styles.banksTitle}>Банкны аппаа сонгоно уу</div>
        <div className={styles.bankGrid}>
          {p.banks.map((b) => (
            <a
              key={b.name + b.link}
              href={b.link}
              className={styles.bank}
              onClick={() => showToast(`${b.name} апп нээгдэж байна…`)}
            >
              <span className={styles.bankIcon}>{bankAbbr(b.name)}</span>
              <span className={styles.bankName}>{b.name}</span>
            </a>
          ))}
        </div>
        <div className={styles.or}>
          <span />
          эсвэл QR уншуулах
          <span />
        </div>
      </div>
      <div className={styles.qrBlock}>
        <span className="not-mobile">
          <Qr src={p.qrSrc} size={236} dim={p.checking} />
        </span>
        <span className="only-mobile">
          <Qr src={p.qrSrc} size={180} dim={p.checking} />
        </span>
        <div className={styles.scanText}>QPay QR кодыг банкны аппаараа уншуулна уу</div>
      </div>
      <Countdown remaining={p.remaining} low={p.low} pct={p.pct} />
      <PollStatus checking={p.checking} lastPoll={p.lastPoll} />
      <Actions onCheck={p.onCheck} onCancel={p.onCancel} />
      {p.demo && <DemoBox {...p} />}
    </>
  );
}

function Notice({
  icon,
  tone,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  tone: "danger" | "warn" | "mut";
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.notice}>
      <div className={styles.noticeHead}>
        <span className={styles.noticeIcon} data-tone={tone}>
          {icon}
        </span>
        <div className={styles.noticeTitle}>{title}</div>
        <div className={styles.noticeText}>{text}</div>
      </div>
      {children}
    </div>
  );
}
