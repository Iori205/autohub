"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
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
import { useOrder } from "../../lib/api/orders";
import {
  BANKS,
  cancelPayment,
  checkPayment,
  demoMarkPaid,
  expireInvoice,
  openInvoice,
  qpayPayload,
} from "../../lib/api/payments";
import { fmt, fmtMmSs, fmtTime } from "../../lib/format";
import { useNow } from "../../lib/hooks";
import { showToast } from "../../lib/store/shop";
import type { Order } from "../../lib/types";
import styles from "./QPayModal.module.css";

type Phase = "waiting" | "checking" | "confirmCancel" | "expired" | "cancelled" | "neterr";

const POLL_MS = 5000;
const TTL_MS = 15 * 60e3;

/**
 * QPay invoice modal. Opens (or reuses) an invoice for `orderNo`, shows the QR
 * + bank deep links, polls for payment, and reports success via `onPaid`.
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
  const opened = useRef(false);

  // Issue / reuse the invoice once on open.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void openInvoice(orderNo).then(() => setLastPoll(Date.now()));
  }, [orderNo]);

  // Paid (by poll, manual check or demo) → hand over to the success screen.
  useEffect(() => {
    if (order && order.payStatus === "paid") onPaid(order.no);
  }, [order, onPaid]);

  const waiting = phase === "waiting" || phase === "checking";

  // Background polling while waiting (the server / QPay callback flips the status).
  useEffect(() => {
    if (!waiting || !order) return;
    const t = setInterval(() => {
      void checkPayment(orderNo).then(() => setLastPoll(Date.now()));
    }, POLL_MS);
    return () => clearInterval(t);
  }, [waiting, orderNo, order]);

  // Invoice countdown ran out.
  useEffect(() => {
    if (!waiting || !order) return;
    if (order.payStatus === "pending" && now > order.invoice.expires) {
      void expireInvoice(order.no).then(() => setPhase("expired"));
    }
  }, [now, waiting, order]);

  // Esc closes; lock page scroll.
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
    const st = await checkPayment(orderNo);
    setLastPoll(Date.now());
    if (st !== "paid") {
      setPhase("waiting");
      showToast("Төлбөр хараахан ороогүй байна");
    }
  }, [orderNo]);

  const regenerate = async () => {
    await openInvoice(orderNo);
    setLastPoll(Date.now());
    setPhase("waiting");
  };

  const qrSrc = useMemo(() => {
    if (!order) return "";
    try {
      const qr = qrcode(0, "M");
      qr.addData(qpayPayload(order));
      qr.make();
      return qr.createDataURL(8, 0);
    } catch {
      return "";
    }
    // the QR only changes when a new invoice is issued
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.invoice.id]);

  if (!order) return null;

  const remaining = Math.max(0, order.invoice.expires - now);
  const low = remaining < 120e3;
  const pct = Math.min(100, (remaining / TTL_MS) * 100);

  const props: WaitProps = {
    order,
    qrSrc,
    checking: phase === "checking",
    remaining,
    low,
    pct,
    lastPoll,
    onCheck: manualCheck,
    onCancel: () => setPhase("confirmCancel"),
    onDemoPaid: () => void demoMarkPaid(order.no),
    onDemoExpire: () => {
      void expireInvoice(order.no);
      setPhase("expired");
    },
    onDemoNet: () => setPhase("neterr"),
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
                    void cancelPayment(order.no);
                    setPhase("cancelled");
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

/** Prototype-only test controls; remove once the real QPay callback is wired. */
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
        <DemoBox {...p} />
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
          {BANKS.map((b) => (
            <a
              key={b.scheme}
              href={`${b.scheme}://q?qPay_QRcode=${encodeURIComponent(p.order.invoice.id)}`}
              className={styles.bank}
              onClick={() => showToast(`${b.name} апп нээгдэж байна…`)}
            >
              <span className={styles.bankIcon}>{b.abbr}</span>
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
      <DemoBox {...p} />
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
