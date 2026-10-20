/*
 * Байрлалын аудит: route/төлөв бүрийн бүтэн хуудасны зураг (1440/390px, харанхуй/цайвар) ба түгээмэл алдааны автомат шалгалт.
 * npm run screenshots:install -w web (нэг удаа) · npm run web · npm run screenshots -w web → apps/web/screenshots/
 * BASE_URL нь http://localhost:3000-ийг сольно.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import process from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// Хөтчүүд глобал кэшид биш node_modules-д байна (PLAYWRIGHT_BROWSERS_PATH=0):
// npm run screenshots:install
// eslint-disable-next-line turbo/no-undeclared-env-vars -- audit script only, not a build input
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";
const { chromium } = await import("playwright");

// eslint-disable-next-line turbo/no-undeclared-env-vars -- audit script only, not a build input
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const THEMES = ["dark", "light"];

/** Хуудсанд ажиллаж, хүнд ойлгомжтой асуудлын жагсаалт буцаана. */
function checks() {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
  };
  const name = (el) => {
    const cls = typeof el.className === "string" ? el.className.split(" ")[0]?.replace(/__\w+$/, "").replace(/-module/, "") : "";
    const txt = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().slice(0, 30);
    return `<${el.tagName.toLowerCase()}${cls ? "." + cls : ""}>${txt ? ` "${txt}"` : ""}`;
  };
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  const fixedish = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === "fixed" || pos === "sticky") return true;
    }
    return false;
  };

  // 1. хэвтээ гүйлгээ
  if (document.documentElement.scrollWidth > vw + 1)
    out.push(`horizontal scroll: page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`);

  const all = [...document.body.querySelectorAll("*")].filter(
    (el) => !el.closest("script,style,svg,nextjs-portal") && visible(el),
  );

  // 2. баруун тийш цухуйсан контент / дэлгэцийн захад наалдсан текст
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && !inScroller(el)) out.push(`overflows viewport: ${name(el)} right=${Math.round(r.right)}`);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && !inScroller(el) && !fixedish(el) && (r.left < 8 || r.right > vw - 8))
      out.push(`text touches edge: ${name(el)} (${Math.round(r.left)}–${Math.round(r.right)})`);
  }

  // 3. наалттай толгойн доогуур орох наалттай элементүүд
  const header = document.querySelector("header");
  const hh = header ? header.getBoundingClientRect().height : 0;
  for (const el of all) {
    const s = getComputedStyle(el);
    if (s.position === "sticky" && el !== header && !el.closest("header") && parseFloat(s.top) < hh - 1 && s.top !== "auto")
      if (!el.closest("[role=dialog]") && getComputedStyle(el.parentElement).overflowY === "visible")
        out.push(`sticky under header: ${name(el)} top=${s.top} but header is ${Math.round(hh)}px`);
  }

  // 4. нэг мөрийн оролт / картууд тэгш биш
  const groups = new Map();
  for (const el of all.filter((e) => e.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea"))) {
    const grid = el.closest("[class*=grid],[class*=row],[class*=Grid],[class*=Row]") ?? el.parentElement?.parentElement;
    if (!grid) continue;
    if (!groups.has(grid)) groups.set(grid, []);
    groups.get(grid).push(el);
  }
  for (const [, els] of groups) {
    for (let i = 0; i < els.length; i++)
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i].getBoundingClientRect();
        const b = els[j].getBoundingClientRect();
        const sameRow = a.left !== b.left && Math.abs(a.top - b.top) < Math.max(a.height, b.height);
        if (sameRow && Math.abs(a.top - b.top) > 2)
          out.push(`misaligned inputs: ${name(els[i])} vs ${name(els[j])} (${Math.round(a.top)} / ${Math.round(b.top)})`);
      }
  }

  return [...new Set(out)];
}

/**
 * Хөвөгч чатын товч дарж болох зүйлийг дарж, хэрэглэгч гүйлгээд гаргаж чадахгүй байна уу?
 * Тогтмол товч гүйлгэхэд үргэлж контент дээгүүр өнгөрдөг тул зөвхөн эхний дэлгэц ба хуудасны төгсгөлийг шалгана.
 */
async function chatOverlap(page) {
  return page.evaluate(async () => {
    const fab = document.querySelector("[class*=ChatWidget] button, [class*=chat] button");
    if (!fab) return [];
    const found = new Set();
    const H = document.documentElement.scrollHeight;
    for (const y of [0, H]) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
      const r = fab.getBoundingClientRect();
      for (const [x, yy] of [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2]]) {
        const under = document.elementsFromPoint(x, yy).find((e) => !fab.contains(e) && !e.contains(fab) && e.closest("a,button,input,select,textarea,label"));
        if (under) {
          const el = under.closest("a,button,input,select,textarea,label");
          // Том картын жижиг хэсэг дарагдсаар байна; жижиг удирдлага эсвэл бодит дарагдлыг тэмдэглэнэ.
          const e = el.getBoundingClientRect();
          const ix = Math.max(0, Math.min(r.right, e.right) - Math.max(r.left, e.left));
          const iy = Math.max(0, Math.min(r.bottom, e.bottom) - Math.max(r.top, e.top));
          const covered = (ix * iy) / Math.max(1, e.width * e.height);
          const small = e.width * e.height < 4 * r.width * r.height;
          if (!small && covered < 0.2) continue;
          found.add(`chat button covers <${el.tagName.toLowerCase()}> "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`);
        }
      }
    }
    window.scrollTo(0, 0);
    return [...found];
  });
}

const report = [];

async function audit(page, label, { full = true, skipChat = false } = {}) {
  await page.waitForTimeout(450);
  const file = `${label}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage: full });
  const issues = await page.evaluate(checks);
  if (!skipChat) issues.push(...(await chatOverlap(page)));
  report.push({ label, issues });
  process.stdout.write(`${issues.length ? "✗" : "✓"} ${label}${issues.length ? ` (${issues.length})` : ""}\n`);
}

async function go(page, path) {
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
}

async function addToCart(page, id, mobile) {
  await go(page, `/product/${id}`);
  await page.locator(mobile ? "[data-detail-bar] button" : "button:has-text('Сагслах')").first().click();
  await page.waitForTimeout(150);
}

// Бүрэн Chromium: тусдаа headless-shell нь macOS дээр бүтэн хуудасны зураг авахад унадаг
// (GPU процесс гардаг) тул ашиглахгүй, суулгахгүй.
const browser = await chromium.launch({ headless: true, channel: "chromium" });

for (const [vpName, opts] of Object.entries(VIEWPORTS)) {
  const mobile = vpName === "mobile";
  for (const theme of THEMES) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript((t) => {
      try {
        if (!sessionStorage.getItem("audit:init")) {
          sessionStorage.setItem("audit:init", "1");
          localStorage.setItem("autohub:theme", t);
        }
      } catch {
        /* хадгалах сан хаалттай — горим анхдагчаараа үлдэнэ */
      }
    }, theme);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const L = (n) => `${vpName}-${theme}-${n}`;

    // Каталог
    await go(page, "/");
    await audit(page, L("01-home"));
    await go(page, "/shop");
    await audit(page, L("02-shop"));
    await go(page, "/shop/brake");
    await audit(page, L("03-category"));
    await go(page, "/sale");
    await audit(page, L("04-sale"));
    if (mobile) {
      await go(page, "/shop");
      await page.getByRole("button", { name: "Шүүлтүүр" }).first().click();
      await audit(page, L("02b-filter-sheet"), { full: false, skipChat: true });
    }
    await go(page, "/product/17");
    await audit(page, L("05-product"));
    await page.getByRole("tab", { name: "Тохирох машинууд" }).click();
    await audit(page, L("05b-product-fitment"));

    // Сагс
    await go(page, "/cart");
    await audit(page, L("06-cart-empty"));
    for (const id of [17, 1, 3]) await addToCart(page, id, mobile);
    await go(page, "/cart");
    await audit(page, L("07-cart-items"));

    // Checkout: хэрэглэгч шиг ирнэ (гүйлгэсэн сагсны хуудаснаас)
    await page.mouse.wheel(0, 3000);
    await page.locator("a[href='/checkout']").first().click();
    await page.waitForURL("**/checkout");
    await audit(page, L("08-checkout-from-cart"), { full: false });
    await page.evaluate(() => window.scrollTo(0, 260));
    await audit(page, L("08b-checkout-scrolled"), { full: false });
    await audit(page, L("08c-checkout"));
    await page.getByRole("button", { name: "Захиалга баталгаажуулах" }).click();
    await audit(page, L("08d-checkout-errors"));
    await page.getByPlaceholder("Таны нэр").fill("Бат-Эрдэнэ");
    await page.getByPlaceholder("9911 2233").fill("99112233");
    const selects = page.locator("main select");
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ index: 1 });
    await page.locator("main textarea").first().fill("45-р байр, 12 тоот");
    await page.getByRole("button", { name: "Захиалга баталгаажуулах" }).click();
    await page.waitForURL("**/checkout/payment**");
    const order = new URL(page.url()).searchParams.get("order");

    // Төлбөр + QPay-ийн төлөвүүд
    await audit(page, L("09-payment"));
    await page.locator("main button:has-text('QPay')").last().click();
    await audit(page, L("10-qpay-waiting"), { full: false, skipChat: true });
    await page.getByRole("button", { name: "Сүлжээний алдаа" }).click();
    await audit(page, L("10b-qpay-network-error"), { full: false, skipChat: true });
    await page.keyboard.press("Escape");
    await go(page, `/checkout/payment?order=${order}`);
    await page.locator("main button:has-text('QPay')").last().click();
    await page.getByRole("button", { name: "Хугацаа дуусгах" }).click();
    await audit(page, L("10c-qpay-expired"), { full: false, skipChat: true });
    await go(page, `/checkout/payment?order=${order}`);
    await audit(page, L("11-payment-failed"));
    await page.locator("main button:has-text('QPay')").last().click();
    await page.getByRole("button", { name: "Төлөгдсөнийг дуурайх" }).click();
    await page.waitForURL("**/checkout/success**");
    await audit(page, L("12-success"));

    // Захиалгууд
    await go(page, "/account/orders");
    await audit(page, L("13-orders"));
    await go(page, `/account/orders?order=${order}`);
    await audit(page, L("13b-order-detail"));

    // Хүрээ (толгой, хөл, цэс)
    await go(page, "/does-not-exist");
    await audit(page, L("14-not-found"));
    if (mobile) {
      await go(page, "/");
      await page.getByRole("button", { name: /Цэс/ }).first().click();
      await audit(page, L("15-drawer"), { full: false, skipChat: true });
    }
    await go(page, "/");
    await page.locator("[class*=ChatWidget] button").first().click();
    await audit(page, L("16-chat-open"), { full: false, skipChat: true });

    if (errors.length) report.push({ label: L("page-errors"), issues: errors });
    await ctx.close();
  }
}
await browser.close();

const lines = report.flatMap((r) => (r.issues.length ? [`\n${r.label}`, ...r.issues.map((i) => `  - ${i}`)] : []));
writeFileSync(join(OUT, "report.txt"), lines.length ? lines.join("\n").trim() + "\n" : "No issues found.\n");
console.log(`\n${report.filter((r) => r.issues.length).length} of ${report.length} states with issues → screenshots/report.txt`);
