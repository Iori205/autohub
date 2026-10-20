/*
 * QPay flow checks against a running service on a seeded dev DB.
 *   MODE=demo (default)  server runs with DEMO_MODE=true
 *   MODE=off             server runs with DEMO_MODE=false and no QPay credentials
 *   MODE=sandbox         server runs with DEMO_MODE=false and QPay sandbox credentials
 * AUTH_SECRET (same as the server's) enables the signed-callback checks.
 *
 *   npm run test:payments -w service
 */
import { createHmac } from "node:crypto";
import process from "node:process";

/* eslint-disable turbo/no-undeclared-env-vars -- test script only */
const API = (process.env.API_URL ?? "http://localhost:4000") + "/api/v1";
const MODE = process.env.MODE ?? "demo";
const SECRET = process.env.AUTH_SECRET;
const STAFF_PW = process.env.SEED_ADMIN_PASSWORD || "autohub123";
/* eslint-enable turbo/no-undeclared-env-vars */

let passed = 0;
const failures = [];
const check = (name, cond, detail = "") => (cond ? passed++ : failures.push(`${name}${detail ? ` — ${detail}` : ""}`));

function client() {
  const jar = new Map();
  return async (method, path, body) => {
    const res = await fetch(API + path, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [k, v] = c.split(";")[0].split("=");
      jar.set(k, v);
    }
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json };
  };
}

const shopper = client();
// Checkout needs a registered customer; a fresh phone per run keeps re-runs on the same DB working
const reg = await shopper("POST", "/auth/register", { name: "Төлбөр Тест", phone: `8${String(Date.now()).slice(-7)}`, password: "secret12" });
check("shopper registered", reg.status === 201, `${reg.status}`);
const placeOrder = async (productId = 3, qty = 1) =>
  (await shopper("POST", "/orders", { customer: { name: "Төлбөр Тест", phone: "88001122" }, delivery: { method: "PICKUP" }, items: [{ productId, qty }] })).json;

if (MODE === "off") {
  const o = await placeOrder();
  const inv = await shopper("POST", "/payments/qpay/invoice", { number: o.number });
  check("no QPay credentials → 503", inv.status === 503 && inv.json?.error?.code === "UNAVAILABLE", `${inv.status}`);
  for (const a of ["paid", "expired", "error"])
    check(`demo/${a} is 404 when DEMO_MODE=false`, (await shopper("POST", `/payments/demo/${a}`, { number: o.number })).status === 404);
} else if (MODE === "sandbox") {
  const o = await placeOrder();
  const inv = await shopper("POST", "/payments/qpay/invoice", { number: o.number });
  check("sandbox invoice created", inv.status === 200 && inv.json?.invoiceId && !inv.json.demo, `${inv.status} ${JSON.stringify(inv.json?.error ?? "")}`);
  check("sandbox qr_image as data URL", inv.json?.qrImage?.startsWith("data:image/png;base64,"));
  check("sandbox bank app links", Array.isArray(inv.json?.urls) && inv.json.urls.length > 0 && inv.json.urls[0].link, `${inv.json?.urls?.length}`);
  const st = await shopper("POST", "/payments/qpay/check", { number: o.number });
  check("sandbox payment/check → still pending", st.status === 200 && st.json?.paymentStatus === "PENDING", `${st.status} ${JSON.stringify(st.json)}`);
  const cancel = await shopper("POST", "/payments/qpay/cancel", { number: o.number });
  check("sandbox invoice cancelled", cancel.json?.paymentStatus === "EXPIRED", JSON.stringify(cancel.json));
} else {
  // ---------- invoice ----------
  const o = await placeOrder(3, 2);
  check("other session can't open the invoice", (await client()("POST", "/payments/qpay/invoice", { number: o.number })).status === 404);
  const inv = await shopper("POST", "/payments/qpay/invoice", { number: o.number });
  check("invoice: QR data URL", inv.status === 200 && inv.json?.qrImage?.startsWith("data:image/"), `${inv.status}`);
  check("invoice: 12 bank app links", inv.json?.urls?.length === 12 && inv.json.urls[0].link.startsWith("khanbank://"));
  check("invoice: amount = order total, demo flag", inv.json?.amount === o.total && inv.json?.demo === true);
  check("invoice: expires in 15 min", Math.abs(new Date(inv.json?.expiresAt) - Date.now() - 15 * 60e3) < 60e3);
  const again = await shopper("POST", "/payments/qpay/invoice", { number: o.number });
  check("valid invoice is reused", again.json?.invoiceId === inv.json?.invoiceId);
  check("invoice input validation", (await shopper("POST", "/payments/qpay/invoice", { number: "xx" })).status === 422);

  // ---------- polling ----------
  let st = await shopper("POST", "/payments/qpay/check", { number: o.number });
  check("check: pending with time left", st.json?.paymentStatus === "PENDING" && st.json.secondsLeft > 800, JSON.stringify(st.json));
  await shopper("POST", "/payments/demo/error", { number: o.number });
  st = await shopper("POST", "/payments/qpay/check", { number: o.number });
  check("demo/error → next check fails like an outage (502)", st.status === 502 && st.json?.error?.code === "PAYMENT_PROVIDER", `${st.status}`);
  st = await shopper("POST", "/payments/qpay/check", { number: o.number });
  check("…and the one after works again", st.status === 200 && st.json?.paymentStatus === "PENDING");

  // ---------- paid ----------
  const admin = client();
  await admin("POST", "/admin/auth/login", { email: "admin@autohub.mn", password: STAFF_PW });
  const stockBefore = (await admin("GET", "/admin/products/3")).json.stock;
  st = await shopper("POST", "/payments/demo/paid", { number: o.number });
  check("demo/paid → PAID", st.json?.paymentStatus === "PAID" && st.json?.stage === "paid" && st.json?.paidAt && st.json?.paymentId);
  check("stock deducted on payment", (await admin("GET", "/admin/products/3")).json.stock === stockBefore - 2);
  check("paid twice doesn't deduct twice", (await shopper("POST", "/payments/demo/paid", { number: o.number })).json?.paymentStatus === "PAID" &&
    (await admin("GET", "/admin/products/3")).json.stock === stockBefore - 2);
  check("no new invoice for a paid order", (await shopper("POST", "/payments/qpay/invoice", { number: o.number })).status === 409);
  check("customer sees paid order", (await shopper("GET", `/orders/${o.number}`)).json?.paymentStatus === "PAID");
  check("dashboard sees paid order", (await admin("GET", `/admin/orders/${o.number}`)).json?.stage === "paid");

  // ---------- expiry → new invoice → cancel ----------
  const e = await placeOrder();
  const inv1 = await shopper("POST", "/payments/qpay/invoice", { number: e.number });
  st = await shopper("POST", "/payments/demo/expired", { number: e.number });
  check("demo/expired → EXPIRED", st.json?.paymentStatus === "EXPIRED" && st.json?.secondsLeft === 0, JSON.stringify(st.json));
  check("expired order stays expired on check", (await shopper("POST", "/payments/qpay/check", { number: e.number })).json?.paymentStatus === "EXPIRED");
  const inv2 = await shopper("POST", "/payments/qpay/invoice", { number: e.number });
  check("“Шинэ нэхэмжлэх”: new invoice reopens the order", inv2.status === 200 && inv2.json?.invoiceId !== inv1.json?.invoiceId &&
    (await shopper("GET", `/orders/${e.number}`)).json?.paymentStatus === "PENDING");
  st = await shopper("POST", "/payments/qpay/cancel", { number: e.number });
  check("cancel payment → invoice closed, order kept", st.json?.paymentStatus === "EXPIRED" && (await shopper("GET", `/orders/${e.number}`)).status === 200);
  check("can pay again after cancelling", (await shopper("POST", "/payments/qpay/invoice", { number: e.number })).status === 200);

  // ---------- admin cancel closes the invoice ----------
  await admin("POST", `/admin/orders/${e.number}/cancel`, { reason: "Тест", comment: "Тест" });
  check("no invoice after staff cancel", (await shopper("POST", "/payments/qpay/invoice", { number: e.number })).status === 409);

  // ---------- callback ----------
  check("callback with bad signature → 403", (await fetch(`${API}/payments/qpay/callback?order=${o.number}&sig=nope`)).status === 403);
  if (SECRET) {
    const sig = createHmac("sha256", SECRET).update(`qpay:${o.number}`).digest("hex").slice(0, 32);
    const cb = await fetch(`${API}/payments/qpay/callback?order=${o.number}&sig=${sig}`);
    check("signed callback → 200 SUCCESS", cb.status === 200 && (await cb.text()) === "SUCCESS");
    const p = await placeOrder();
    await shopper("POST", "/payments/qpay/invoice", { number: p.number });
    const sig2 = createHmac("sha256", SECRET).update(`qpay:${p.number}`).digest("hex").slice(0, 32);
    await fetch(`${API}/payments/qpay/callback?order=${p.number}&sig=${sig2}`, { method: "POST" });
    check("callback alone doesn't mark paid (QPay must confirm)", (await shopper("GET", `/orders/${p.number}`)).json?.paymentStatus === "PENDING");
  }

  // ---------- 15-minute sweep ----------
  const a1023 = await admin("GET", "/admin/orders/A1023");
  check("sweep expired the seeded stale pending order", a1023.json?.stage === "expired" && a1023.json?.expiredAt, a1023.json?.stage);
}

console.log(`\n[${MODE}] ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log("  ✗ " + f);
process.exitCode = failures.length ? 1 : 0;
