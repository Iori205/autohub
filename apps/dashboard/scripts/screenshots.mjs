/*
 * Layout audit for the admin: full-page screenshots of every route/state at
 * 1440px (expanded sidebar) and 1024px (tablet, collapsed sidebar) in dark and
 * light, plus automated layout and data-consistency checks.
 *
 *   npm run screenshots:install -w dashboard   (once: Chromium into node_modules)
 *   npm run dash                               (in another terminal)
 *   npm run screenshots -w dashboard           → apps/dashboard/screenshots/
 *
 * BASE_URL overrides http://localhost:3001.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Browsers live in node_modules (installed with PLAYWRIGHT_BROWSERS_PATH=0).
// eslint-disable-next-line turbo/no-undeclared-env-vars -- audit script only, not a build input
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";
const { chromium } = await import("playwright");

// eslint-disable-next-line turbo/no-undeclared-env-vars -- audit script only, not a build input
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
};
const THEMES = ["dark", "light"];

/** Runs in the page; returns human-readable problems. */
function checks(opts) {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const name = (el) => {
    const cls = typeof el.className === "string" ? (el.className.split(" ").find((c) => c && !c.startsWith("tone-")) ?? "").replace(/-module__\w+__/, ".") : "";
    const txt = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.value || "").trim().replace(/\s+/g, " ").slice(0, 32);
    return `<${el.tagName.toLowerCase()}${cls ? "." + cls : ""}>${txt ? ` "${txt}"` : ""}`;
  };
  const all = [...document.body.querySelectorAll("*")].filter((el) => !el.closest("script,style,svg,nextjs-portal") && vis(el));

  // page-level horizontal scroll
  if (document.documentElement.scrollWidth > vw + 1)
    out.push(`horizontal page scroll: ${document.documentElement.scrollWidth}px in ${vw}px`);

  // horizontal scroll inside cards (tables wider than their card)
  for (const s of document.querySelectorAll(".tbl-scroll")) {
    if (!vis(s) || s.scrollWidth <= s.clientWidth + 1) continue;
    const card = s.closest(".panel");
    const title = card?.querySelector(".panel-head h3, h3")?.textContent?.trim() || card?.querySelector(".tr.th")?.textContent?.trim().slice(0, 30) || "table";
    out.push(`card scrolls sideways: "${title}" content ${s.scrollWidth}px in ${s.clientWidth}px`);
  }

  // any other strip that scrolls sideways (tabs, segmented controls…) hides items
  for (const el of document.querySelectorAll("main *")) {
    if (el.closest(".tbl-scroll") || !vis(el)) continue;
    const o = getComputedStyle(el).overflowX;
    if ((o === "auto" || o === "scroll") && el.scrollWidth > el.clientWidth + 1)
      out.push(`strip scrolls sideways (items hidden): ${name(el)} ${el.scrollWidth}px in ${el.clientWidth}px`);
  }

  // text clipped with an ellipsis but no tooltip
  for (const el of all) {
    const s = getComputedStyle(el);
    if (s.textOverflow !== "ellipsis" || el.scrollWidth <= el.clientWidth + 1) continue;
    if (el.closest("[title]") || el.closest("[aria-label]")) continue;
    out.push(`truncated without tooltip: ${name(el)}`);
  }

  // table header vs first row columns
  for (const th of document.querySelectorAll(".tr.th")) {
    if (!vis(th)) continue;
    const row = [...th.parentElement.children].find((r) => r !== th && r.classList.contains("tr") && vis(r));
    if (!row || getComputedStyle(th).gridTemplateColumns !== getComputedStyle(row).gridTemplateColumns) {
      if (row) out.push(`table header/row columns differ: ${name(th)}`);
      continue;
    }
    const shown = (el) => getComputedStyle(el).display !== "none";
    const hc = [...th.children].filter(shown);
    const rc = [...row.children].filter(shown);
    hc.forEach((h, i) => {
      const c = rc[i];
      if (!c) return;
      const a = h.getBoundingClientRect();
      const b = c.getBoundingClientRect();
      const right = getComputedStyle(h).textAlign === "right";
      const d = right ? Math.abs(a.right - b.right) : Math.abs(a.left - b.left);
      if (d > 2 && h.textContent.trim() !== "") out.push(`column ${i + 1} misaligned (${Math.round(d)}px): header ${name(h)} vs row ${name(c)}`);
    });
  }

  // controls in one toolbar row: same vertical centre and height
  const ROWS = ".toolbar, .bulkbar, .panel-head, [class*=pageActions], [class*=picker], [class*=qRow], [class*=free]";
  for (const row of document.querySelectorAll(ROWS)) {
    if (!vis(row)) continue;
    const ctrls = [...row.querySelectorAll(":scope > input, :scope > select, :scope > button, :scope > a.btn, :scope > .search, :scope > [class*=dates], :scope > .seg, :scope > div:not(.seg) > select, :scope > div:not(.seg) > button, :scope > label > select")].filter(vis);
    const byLine = [];
    for (const c of ctrls) {
      const r = c.getBoundingClientRect();
      const line = byLine.find((l) => Math.abs(l.top - r.top) < r.height);
      if (line) line.items.push([c, r]);
      else byLine.push({ top: r.top, items: [[c, r]] });
    }
    for (const l of byLine) {
      const boxes = l.items.filter(([c]) => !c.matches(".link-btn,.btn.plain,.icon-btn"));
      for (let i = 1; i < boxes.length; i++) {
        const [a, ra] = boxes[0];
        const [b, rb] = boxes[i];
        const ca = ra.top + ra.height / 2;
        const cb = rb.top + rb.height / 2;
        if (Math.abs(ca - cb) > 1.5) out.push(`not centred in row: ${name(a)} vs ${name(b)} (${Math.round(ca)}/${Math.round(cb)})`);
        else if (Math.abs(ra.height - rb.height) > 1.5 && !b.matches(".seg") && !a.matches(".seg"))
          out.push(`different heights in one row: ${name(a)} ${Math.round(ra.height)}px vs ${name(b)} ${Math.round(rb.height)}px`);
      }
    }
  }

  // anything floating (menus, dialogs, drawers, tooltips) must be on screen
  for (const el of document.querySelectorAll("[role=dialog],[role=alertdialog],[class*=dropdown],[class*=tip],[class*=drawer],[class*=toast]")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > vw + 1 || (getComputedStyle(el).position === "fixed" && r.bottom > vh + 1))
      out.push(`off screen: ${name(el)} (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
  }

  // sidebar
  const side = document.querySelector("aside[aria-label]");
  if (side && opts.app) {
    const active = side.querySelectorAll("[aria-current=page]");
    if (active.length !== 1) out.push(`sidebar: ${active.length} active items (expected 1)`);
    const collapsed = side.getBoundingClientRect().width < 100;
    for (const a of side.querySelectorAll("nav a, nav + div button")) {
      if (collapsed && !a.getAttribute("title")) out.push(`sidebar: collapsed item without tooltip ${name(a)}`);
      if (!collapsed && a.scrollWidth > a.clientWidth + 1) out.push(`sidebar: label clipped ${name(a)}`);
    }
    const labels = [...side.querySelectorAll("nav [class*=groupLabel]")];
    const shown = labels.filter((l) => l.innerText.trim()).length;
    const w = Math.round(side.getBoundingClientRect().width);
    if (!collapsed && shown !== labels.length) out.push(`sidebar: ${labels.length - shown} group labels hidden while expanded (sidebar ${w}px)`);
    if (collapsed && shown) out.push(`sidebar: group label text visible while collapsed`);
  }

  // spacing: page header position relative to the app header
  const head = document.querySelector("header");
  const ph = document.querySelector("main h1")?.closest("div")?.parentElement;
  if (head && ph && opts.app) {
    const gap = Math.round(ph.getBoundingClientRect().top - head.getBoundingClientRect().bottom);
    out.push(`@gap-top=${gap}`);
    const first = ph.nextElementSibling;
    if (first) out.push(`@gap-head=${Math.round(first.getBoundingClientRect().top - ph.getBoundingClientRect().bottom)}`);
  }
  return [...new Set(out)];
}

const report = [];
const metrics = [];
const facts = {};

async function audit(page, label, { full = true, app = true } = {}) {
  await page.waitForTimeout(400);
  // Check first: a full-page capture briefly resizes the viewport, which would
  // otherwise be measured (and photographed) mid-transition.
  const res = await page.evaluate(checks, { app });
  await page.screenshot({ path: join(OUT, `${label}.png`), fullPage: full });
  const issues = res.filter((x) => !x.startsWith("@"));
  metrics.push({ label, m: res.filter((x) => x.startsWith("@")) });
  report.push({ label, issues });
  process.stdout.write(`${issues.length ? "✗" : "✓"} ${label}${issues.length ? ` (${issues.length})` : ""}\n`);
}

const go = async (page, path) => {
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(150);
};
const text = (page, sel) => page.locator(sel).first().innerText();
const num = (s) => Number(String(s).replace(/[^\d-]/g, "")) || 0;

const browser = await chromium.launch({ headless: true, channel: "chromium" });

for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport });
    await ctx.addInitScript((t) => {
      try {
        if (!sessionStorage.getItem("audit:init")) {
          sessionStorage.setItem("audit:init", "1");
          localStorage.setItem("autohub:theme", t);
        }
      } catch {
        /* storage blocked */
      }
    }, theme);
    // No animations while auditing, so nothing is captured half-way.
    await ctx.addInitScript(() => {
      const css = "*,*::before,*::after{transition:none!important;animation:none!important}";
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style");
        s.textContent = css;
        document.head.append(s);
      });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const L = (n) => `${vpName}-${theme}-${n}`;
    const step = async (label, fn) => {
      try {
        await fn();
      } catch (e) {
        report.push({ label: L(label), issues: [`audit step failed: ${e.message.split("\n")[0]}`] });
      }
    };

    // ---------- login ----------
    await go(page, "/login");
    await page.fill("input[type=password]", "12");
    await page.fill("input[type=email]", "admin@");
    await page.click("button[type=submit]");
    await audit(page, L("00-login-errors"), { app: false });
    await page.fill("input[type=email]", "admin@autohub.mn");
    await page.fill("input[type=password]", "autohub123");
    await page.click("button[type=submit]");
    await page.waitForURL(BASE + "/");
    await page.waitForLoadState("networkidle");

    // ---------- dashboard ----------
    await step("01-dashboard", async () => {
      await audit(page, L("01-dashboard"));
      facts.kpiToday ??= num(await text(page, "main .kpis > div:nth-child(1) [class*=kpiValue]"));
      facts.kpiOrders ??= num(await text(page, "main .kpis > div:nth-child(2) [class*=kpiValue]"));
      facts.kpiPending ??= num(await text(page, "main .kpis > div:nth-child(3) [class*=kpiValue]"));
      facts.kpiLow ??= num(await text(page, "main .kpis > div:nth-child(4) [class*=kpiValue]"));
      facts.navBadge ??= num(await text(page, "aside [class*=navBadge], aside [class*=navDot]").catch(() => "0"));
      // chart tooltip at both edges
      const chart = page.locator("div[class*='__chart']:not([class*='chartPad'])").first();
      const b = await chart.boundingBox();
      await chart.scrollIntoViewIfNeeded();
      for (const [n, x] of [["left", 2], ["right", b.width - 2]]) {
        await chart.hover({ position: { x, y: b.height / 2 }, force: true });
        await page.waitForTimeout(120);
        const tip = await page.locator("div[class*='__tip']").first().boundingBox({ timeout: 3000 }).catch(() => null);
        if (!tip) report.push({ label: L(`01b-chart-tooltip-${n}`), issues: ["chart tooltip did not appear on hover"] });
        const panel = await page.locator("main .panel").filter({ has: chart }).first().boundingBox();
        if (tip && panel && (tip.x < panel.x - 1 || tip.x + tip.width > panel.x + panel.width + 1))
          report.push({ label: L(`01b-chart-tooltip-${n}`), issues: [`chart tooltip leaves its card at the ${n} edge (${Math.round(tip.x)}..${Math.round(tip.x + tip.width)} vs ${Math.round(panel.x)}..${Math.round(panel.x + panel.width)})`] });
        await audit(page, L(`01b-chart-hover-${n}`), { full: false });
      }
      for (const r of ["7 өдөр", "90 өдөр"]) {
        await page.getByRole("button", { name: r, exact: true }).click();
        await audit(page, L(`01c-chart-${r.split(" ")[0]}d`), { full: false });
      }
      await page.mouse.move(5, 5);
    });
    await step("01d-header-menus", async () => {
      await page.fill("header input", "тоормос");
      await audit(page, L("01d-search"), { full: false });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Мэдэгдэл" }).click();
      await audit(page, L("01e-notifications"), { full: false });
      await page.keyboard.press("Escape");
      await page.locator("header button[aria-expanded]").last().click();
      await audit(page, L("01f-user-menu"), { full: false });
      await page.keyboard.press("Escape");
    });

    // ---------- orders ----------
    await step("02-orders", async () => {
      await go(page, "/orders");
      await audit(page, L("02-orders-all"));
      facts.ordersTotal ??= num(await page.getByRole("tab", { name: /Бүгд/ }).locator(".count-chip").innerText());
      const tabs = await page.getByRole("tab").all();
      for (let i = 1; i < tabs.length; i++) {
        const t = page.getByRole("tab").nth(i);
        const n = (await t.innerText()).split("\n")[0].trim();
        await t.click();
        if (n === "Төлөгдсөн") facts.paidTab ??= num(await t.locator(".count-chip").innerText());
        if (n.startsWith("Төлбөр хүлээгдэж")) facts.pendingTab ??= num(await t.locator(".count-chip").innerText());
        await audit(page, L(`02-orders-tab-${i}`));
      }
      await page.getByRole("tab", { name: /Бүгд/ }).click();
      await page.locator(".tr input[type=checkbox]").nth(1).check();
      await audit(page, L("02b-orders-selected"), { full: false });
      await page.fill("input[placeholder='Захиалга #, нэр, утас']", "zzzz-нэг");
      await audit(page, L("02c-orders-empty"));
    });
    await step("03-order-detail", async () => {
      await go(page, "/orders/A1024");
      await audit(page, L("03-order-detail"));
      await page.getByRole("button", { name: "Баглаа баримт хэвлэх" }).click();
      await audit(page, L("03b-slip-modal"), { full: false });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Цуцлах" }).first().click();
      await page.getByRole("button", { name: "Захиалга цуцлах" }).click();
      await audit(page, L("03c-cancel-form-errors"), { full: false });
      await page.keyboard.press("Escape");
      await go(page, "/orders/A1013");
      await audit(page, L("03d-order-expired"));
    });

    // ---------- products ----------
    await step("04-products", async () => {
      await go(page, "/products");
      await audit(page, L("04-products"));
      await page.locator(".tr input[type=checkbox]").nth(1).check();
      await audit(page, L("04b-products-selected"), { full: false });
      await page.getByRole("button", { name: "Устгах" }).first().click();
      await audit(page, L("04c-confirm-dialog"), { full: false });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Болих" }).last().click();
    });
    await step("05-product-edit", async () => {
      await go(page, "/products/new");
      await page.getByRole("button", { name: "Хадгалах" }).click();
      await audit(page, L("05-product-new-errors"));
      await go(page, "/products/17");
      await audit(page, L("05b-product-edit"));
      await page.getByText("Тохирох машинууд").first().scrollIntoViewIfNeeded();
      await audit(page, L("05c-product-fitment"), { full: false });
    });

    // ---------- catalog ----------
    await step("06-catalog", async () => {
      await go(page, "/catalog");
      await audit(page, L("06-catalog"));
      await page.getByRole("button", { name: "Ангилал нэмэх" }).click();
      await page.getByRole("button", { name: "Хадгалах" }).click();
      await audit(page, L("06b-category-form-errors"), { full: false });
      await page.keyboard.press("Escape");
    });
    await step("07-vehicles", async () => {
      await go(page, "/vehicles");
      await audit(page, L("07-vehicles"));
      await page.getByRole("button", { name: "CSV импорт" }).click();
      await audit(page, L("07b-import-modal"), { full: false });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Машин нэмэх" }).click();
      await audit(page, L("07c-vehicle-form"), { full: false });
      await page.keyboard.press("Escape");
    });
    await step("08-inventory", async () => {
      await go(page, "/inventory");
      await audit(page, L("08-inventory"));
      const stats = await page.locator("main .kpis .stat strong").allInnerTexts();
      facts.invLow ??= num(stats[2]);
      facts.invOut ??= num(stats[3]);
      await page.getByRole("button", { name: "Нөөц тохируулах" }).first().click();
      await audit(page, L("08b-adjust-modal"), { full: false });
      await page.keyboard.press("Escape");
    });
    await step("09-customers", async () => {
      await go(page, "/customers");
      await audit(page, L("09-customers"));
      await go(page, "/customers?c=C001");
      await audit(page, L("09b-customer-drawer"), { full: false });
    });
    await step("10-promos", async () => {
      await go(page, "/promos");
      await audit(page, L("10-promos"));
      await page.getByRole("button", { name: "Баннер нэмэх" }).click();
      await audit(page, L("10b-banner-form"), { full: false });
      await page.keyboard.press("Escape");
    });
    await step("11-reports", async () => {
      await go(page, "/reports");
      await audit(page, L("11-reports-month"));
      await page.getByRole("button", { name: "7 хоногоор" }).click();
      await audit(page, L("11b-reports-week"));
      await page.getByRole("button", { name: "Өдрөөр" }).click();
      await audit(page, L("11c-reports-day"));
      // newest row first; columns: period, orders, revenue, average
      const today = page.locator("main .panel", { hasText: "Борлуулалт хугацаагаар" }).locator(".tr:not(.th)").first();
      facts.reportToday ??= num((await today.innerText()).split("\n")[2] ?? "0");
    });
    await step("12-settings", async () => {
      for (const t of ["", "delivery", "qpay", "admins"]) {
        await go(page, "/settings" + (t ? `?tab=${t}` : ""));
        await audit(page, L(`12-settings-${t || "store"}`));
      }
    });

    if (errors.length) report.push({ label: L("page-errors"), issues: [...new Set(errors)] });
    await ctx.close();
  }
}
await browser.close();

// ---------- cross-page numbers ----------
const consistency = [];
const eq = (what, a, b) => a === b || consistency.push(`${what}: ${a} ≠ ${b}`);
eq("sidebar Захиалгууд badge vs Төлөгдсөн tab", facts.navBadge, facts.paidTab);
eq("dashboard 'Төлбөр хүлээгдэж буй' vs orders tab", facts.kpiPending, facts.pendingTab);
eq("dashboard 'Дуусах дөхсөн бараа' vs Нөөц (бага + дууссан)", facts.kpiLow, facts.invLow + facts.invOut);
eq("dashboard today's revenue vs Тайлан → Өдрөөр (today)", facts.kpiToday, facts.reportToday);
if (consistency.length) report.push({ label: "numbers across pages", issues: consistency });

// spacing summary: every page should use the same top gap / header→content gap
const gaps = {};
for (const { label, m } of metrics) for (const x of m) (gaps[x] ??= []).push(label.replace(/^\w+-\w+-/, ""));
const spacing = Object.entries(gaps).map(([k, v]) => `${k}: ${[...new Set(v)].length} states (e.g. ${[...new Set(v)].slice(0, 4).join(", ")})`);

const lines = report.flatMap((r) => (r.issues.length ? [`\n${r.label}`, ...r.issues.map((i) => `  - ${i}`)] : []));
writeFileSync(
  join(OUT, "report.txt"),
  (lines.length ? lines.join("\n").trim() : "No issues found.") +
    `\n\nNumbers checked: ${JSON.stringify(facts)}\n\nSpacing (should be one value each):\n  ${spacing.join("\n  ")}\n`,
);
console.log(`\n${report.filter((r) => r.issues.length).length} groups with issues → screenshots/report.txt`);
