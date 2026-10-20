/* Dashboard (apps/dashboard) against the real API + DB; cross-app flows also drive the storefront. */
import type { Browser, BrowserContext, Page } from "playwright";
import { adminApi } from "../lib/admin-api";
import { Suite, eventually, expect, launch, sessionUserId, watch } from "../lib/harness";
import type { Ctx } from "../lib/types";

const fmt = (n: number) => n.toLocaleString("en-US") + "₮";
const ubToday = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
const ubStart = (day: string) => new Date(`${day}T00:00:00+08:00`);
/** 1×1 PNG for the image upload */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

export async function run(ctx: Ctx) {
  const { prisma } = await import("@repo/db");
  const browser = await launch();
  const bctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await bctx.newPage();
  const problems = watch(page);
  const s = new Suite(bctx, ctx.out);
  const D = ctx.dashboard;

  /** Navigate and wait until the page has its data (skeleton gone). */
  const go = async (p: string, pg: Page = page) => {
    await pg.goto(D + p);
    await pg.waitForLoadState("networkidle");
    await pg.locator("[aria-busy=true]").first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => undefined);
  };
  const reload = async (pg: Page = page) => {
    await pg.reload();
    await pg.waitForLoadState("networkidle");
    await pg.locator("[aria-busy=true]").first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => undefined);
  };
  const dialog = (pg: Page = page) => pg.getByRole("dialog");
  const field = (key: string, pg: Page = page) => dialog(pg).locator(`#f-${key}`);
  const submit = async (pg: Page = page) => {
    await dialog(pg).locator("button[type=submit]").click();
  };
  const confirm = (name: string, pg: Page = page) => pg.getByRole("alertdialog").getByRole("button", { name, exact: true }).click();
  const toast = (text: string | RegExp, pg: Page = page) =>
    pg.locator("[aria-live=polite] [data-kind]").filter({ hasText: text }).first().waitFor({ timeout: 8000 });
  const row = (text: string | RegExp, pg: Page = page) => pg.locator(".tr").filter({ hasText: text }).first();
  const shows = async (text: string | RegExp, pg: Page = page) => (await pg.getByText(text).count()) > 0;
  /** product editor's fitment picker: make → model → year (all engines) */
  const pick = async (...v: string[]) => {
    const sel = page.locator(".panel", { hasText: "Тохирох машинууд" }).locator("select");
    for (const [i, x] of v.entries()) await sel.nth(i).selectOption(x);
  };

  const P = { login: "Нэвтрэх", dash: "Хянах самбар", prod: "Бараа", cat: "Ангилал & Брэнд", veh: "Машины сан", inv: "Нөөц", promo: "Баннер & Хямдрал", cust: "Хэрэглэгчид", ord: "Захиалгууд", rep: "Тайлан", set: "Тохиргоо", role: "Эрх", x: "Cross-app" };
  console.log("\nDashboard");

  /* ---------- auth ---------- */
  await s.step(P.login, "Signed-out visit → /login", async () => {
    await page.goto(D + "/products");
    await page.waitForURL("**/login?next=%2Fproducts");
  });

  await s.step(P.login, "Wrong password → Mongolian error", async () => {
    problems.allowOnce("/admin/auth/login");
    await page.locator("input[type=email]").fill("admin@autohub.mn");
    await page.locator("input[type=password]").fill("wrong-password");
    await page.getByRole("button", { name: "Нэвтрэх" }).click();
    await page.getByRole("alert").filter({ hasText: "И-мэйл эсвэл нууц үг буруу байна" }).waitFor();
  });

  await s.step(P.login, "Login → session cookie, lastSeen in DB", async () => {
    await page.locator("input[type=password]").fill(ctx.staffPassword);
    await page.getByRole("button", { name: "Нэвтрэх" }).click();
    await page.waitForURL("**/products");
    const cookie = (await bctx.cookies()).find((c) => c.name === "autohub_admin_session");
    expect(cookie?.httpOnly, "no httpOnly autohub_admin_session cookie");
    const u = await prisma.user.findFirstOrThrow({ where: { email: "admin@autohub.mn" } });
    expect(u.lastSeenAt && Date.now() - u.lastSeenAt.getTime() < 60_000, "lastSeenAt not updated");
    return "httpOnly cookie from apps/service; back to ?next";
  });

  /* ---------- dashboard ---------- */
  await s.step(P.dash, "KPIs + recent orders = DB", async () => {
    await go("/");
    const today = ubStart(ubToday());
    const [ordersToday, pending, paidToday, latest] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { paymentStatus: "PENDING" } }),
      prisma.order.aggregate({ where: { createdAt: { gte: today }, paymentStatus: "PAID" }, _sum: { total: true } }),
      prisma.order.findFirstOrThrow({ orderBy: { createdAt: "desc" } }),
    ]);
    const kpi = (i: number) => page.locator(".kpis > .panel").nth(i).innerText();
    expect((await kpi(0)).includes(fmt(paidToday._sum.total ?? 0)), `revenue KPI "${await kpi(0)}" ≠ ${fmt(paidToday._sum.total ?? 0)}`);
    expect((await kpi(1)).includes(String(ordersToday)), `orders KPI "${await kpi(1)}" ≠ ${ordersToday}`);
    expect((await kpi(2)).includes(String(pending)), `pending KPI "${await kpi(2)}" ≠ ${pending}`);
    expect(await shows(`#${latest.number}`), `latest order #${latest.number} not in recent list`);
    return `today: ${ordersToday} orders, ${fmt(paidToday._sum.total ?? 0)}; ${pending} pending (db:demo seed → data is "today")`;
  });

  await s.step(P.dash, "Loading state while the API answers", async () => {
    await page.route("**/api/v1/admin/products*", async (r) => {
      await new Promise((ok) => setTimeout(ok, 1200));
      await r.continue();
    });
    await page.goto(D + "/inventory");
    await page.locator("[aria-busy=true]").first().waitFor({ timeout: 3000 });
    await page.locator("[aria-busy=true]").first().waitFor({ state: "detached", timeout: 15_000 });
    await page.unroute("**/api/v1/admin/products*");
    return "skeleton until data arrives";
  });

  /* ---------- products ---------- */
  const NAME = "Е2Е туршилтын шүүлтүүр";
  let pid = 0;
  await s.step(P.prod, "Create (images, OEM numbers, fitment) → DB → reload", async () => {
    await go("/products/new");
    await page.getByPlaceholder("жишээ: Тоормосны дэвсгэр, урд").fill(NAME);
    await page.getByPlaceholder("Барааны онцлог, суурилуулах заавар, баталгаа…").fill("E2E тайлбар");
    await page.locator("input[type=file]").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
    await page.getByAltText("").first().waitFor();
    await page.getByPlaceholder("Үзүүлэлт (жишээ: Материал)").fill("Материал");
    await page.getByPlaceholder("Утга (жишээ: Керамик)").fill("Цаас");
    await page.locator("label.field", { hasText: "Брэнд" }).locator("select").selectOption("Bosch");
    await page.locator("label.field", { hasText: "Ангилал" }).locator("select").selectOption("filter");
    await page.getByRole("button", { name: "Аналог" }).click();
    const oem = page.getByLabel("OEM дугаар");
    for (const n of ["E2E-0001", "E2E-0002"]) {
      await oem.fill(n);
      await oem.press("Enter");
    }
    const nums = page.locator(".panel", { hasText: "Үнэ & нөөц" }).locator("input[type=number]");
    await nums.nth(0).fill("45000");
    await nums.nth(1).fill("52000");
    await nums.nth(2).fill("12");
    await nums.nth(3).fill("4");
    await pick("Toyota", "Land Cruiser 200", "2015");
    await page.getByRole("button", { name: "Нэмэх", exact: true }).click();
    await page.getByRole("button", { name: "Хадгалах" }).click();
    await page.waitForURL(D + "/products");
    const p = await prisma.product.findFirstOrThrow({ where: { name: NAME }, include: { fitments: true, brand: true, category: true } });
    pid = p.id;
    const lc = await prisma.vehicle.count({ where: { model: "Land Cruiser 200", yearFrom: { lte: 2015 }, yearTo: { gte: 2015 } } });
    expect(p.oemNumbers.join() === "E2E-0001,E2E-0002", `oem ${p.oemNumbers}`);
    expect(p.images.length === 1 && p.images[0]!.startsWith("data:image/png"), `images ${p.images.length}`);
    expect(p.price === 45000 && p.oldPrice === 52000 && p.stock === 12 && p.lowStockThreshold === 4, `price/stock ${p.price}/${p.oldPrice}/${p.stock}/${p.lowStockThreshold}`);
    expect(p.brand.name === "Bosch" && p.category.slug === "filter" && p.type === "AFTERMARKET", `${p.brand.name} ${p.category.slug} ${p.type}`);
    expect(p.fitments.length === lc && lc > 0, `fitments ${p.fitments.length}, LC200 engines in 2015: ${lc}`);
    expect(JSON.stringify(p.specs) === JSON.stringify([{ k: "Материал", v: "Цаас" }]), `specs ${JSON.stringify(p.specs)}`);
    const mv = await prisma.stockMovement.findFirst({ where: { productId: pid, reason: "Шинэ бараа", delta: 12 } });
    expect(mv, "no 'Шинэ бараа' stock movement");
    await go(`/products/${pid}`);
    expect((await page.getByPlaceholder("жишээ: Тоормосны дэвсгэр, урд").inputValue()) === NAME, "name not loaded after reload");
    expect(await shows("E2E-0002"), "OEM chip missing after reload");
    expect(await page.locator("img[src^='data:image/png']").count(), "image missing after reload");
    return `#${pid}: 2 OEM, 1 image, ${lc} fitments (every LC200 engine in 2015), stock movement logged`;
  });

  await s.step(P.prod, "Edit (price, OEM, stock, fitment) → DB → reload", async () => {
    await go(`/products/${pid}`);
    await page.getByRole("button", { name: "E2E-0002 хасах" }).click();
    const oem = page.getByLabel("OEM дугаар");
    await oem.fill("E2E-0003");
    await oem.press("Enter");
    const nums = page.locator(".panel", { hasText: "Үнэ & нөөц" }).locator("input[type=number]");
    await nums.nth(0).fill("47000");
    await nums.nth(2).fill("20");
    const fits = page.locator(".panel", { hasText: "Тохирох машинууд" });
    await fits.getByLabel("Бүгдийг сонгох").check();
    await fits.locator(".bulkbar").getByRole("button", { name: "Устгах" }).click();
    await pick("Toyota", "Prius", "2014");
    await page.getByRole("button", { name: "Нэмэх", exact: true }).click();
    await page.getByRole("button", { name: "Хадгалах" }).click();
    await page.waitForURL(D + "/products");
    const p = await prisma.product.findUniqueOrThrow({ where: { id: pid }, include: { fitments: { include: { vehicle: true } } } });
    expect(p.oemNumbers.join() === "E2E-0001,E2E-0003", `oem ${p.oemNumbers}`);
    expect(p.price === 47000 && p.stock === 20, `price ${p.price} stock ${p.stock}`);
    expect(p.fitments.length > 0 && p.fitments.every((f) => f.vehicle.model === "Prius"), `fitments ${p.fitments.map((f) => f.vehicle.model)}`);
    expect(await prisma.stockMovement.findFirst({ where: { productId: pid, reason: "Барааны карт засвар", delta: 8 } }), "no +8 stock movement");
    await go(`/products/${pid}`);
    expect(await shows("E2E-0003"), "new OEM missing after reload");
    expect(await shows("Prius"), "Prius fitment missing after reload");
    return "fitments replaced (LC200 → Prius); +8 logged as 'Барааны карт засвар'";
  });

  await s.step(P.prod, "Active switch + bulk hide/activate → DB", async () => {
    await go("/products");
    await row(NAME).getByRole("switch").click();
    await eventually(async () => (await prisma.product.findUnique({ where: { id: pid } }))?.active === false, "switch didn't hide in DB");
    await row(NAME).locator("input[type=checkbox]").check();
    await row("ID 1 ").locator("input[type=checkbox]").check();
    await page.locator(".bulkbar").getByRole("button", { name: "Идэвхжүүлэх" }).click();
    await toast("2 бараа идэвхжлээ");
    const both = await prisma.product.findMany({ where: { id: { in: [pid, 1] } } });
    expect(both.every((p) => p.active), "bulk activate not in DB");
    await reload();
    expect((await row(NAME).getByRole("switch").getAttribute("aria-checked")) === "true", "active state lost after reload");
  });

  await s.step(P.prod, "Delete → gone from DB and list", async () => {
    await go(`/products/${pid}`);
    await page.getByRole("button", { name: "Устгах" }).first().click();
    await confirm("Устгах");
    await page.waitForURL(D + "/products");
    expect(!(await prisma.product.findUnique({ where: { id: pid } })), "product still in DB");
    await reload();
    expect(!(await shows(NAME)), "product still listed after reload");
  });

  /* ---------- categories & brands ---------- */
  await s.step(P.cat, "Category create → edit → delete (DB)", async () => {
    await go("/catalog");
    await page.getByRole("button", { name: "Ангилал нэмэх" }).click();
    await field("name").fill("Е2Е ангилал");
    await field("key").fill("Bad Slug");
    await submit();
    await dialog().getByText("Зөвхөн латин жижиг үсэг, тоо, зураас").waitFor();
    await field("key").fill("e2e-cat");
    await field("icon").selectOption("snowflake");
    await submit();
    await toast("ангилал нэмэгдлээ");
    const c = await eventually(() => prisma.category.findUnique({ where: { slug: "e2e-cat" } }), "category not in DB");
    expect(c.name === "Е2Е ангилал" && c.icon === "snowflake", `${c.name} ${c.icon}`);
    await reload();
    await row("/e2e-cat").getByRole("button", { name: "Засах" }).click();
    await field("name").fill("Е2Е ангилал 2");
    await submit();
    await toast("шинэчлэгдлээ");
    expect((await prisma.category.findUnique({ where: { slug: "e2e-cat" } }))?.name === "Е2Е ангилал 2", "rename not in DB");
    await reload();
    expect(await shows("Е2Е ангилал 2"), "rename lost after reload");
    await row("/e2e-cat").getByRole("button", { name: "Устгах" }).click();
    await confirm("Устгах");
    await toast("устгагдлаа");
    expect(!(await prisma.category.findUnique({ where: { slug: "e2e-cat" } })), "category still in DB");
    await reload();
    expect(!(await shows("/e2e-cat")), "category listed after reload");
    return "slug validation in Mongolian";
  });

  await s.step(P.cat, "Category with products can't be deleted", async () => {
    await row("/brake").getByRole("button", { name: "Устгах" }).click();
    await toast("бараа байгаа тул устгах боломжгүй");
    expect(await prisma.category.findUnique({ where: { slug: "brake" } }), "brake category was deleted");
  });

  await s.step(P.cat, "Brand create → edit → delete (DB)", async () => {
    await page.getByRole("button", { name: "Брэнд нэмэх" }).click();
    await field("name").fill("E2E Brand");
    await field("country").fill("Монгол");
    await field("kind").selectOption("oem");
    await submit();
    await toast("брэнд нэмэгдлээ");
    const b = await eventually(() => prisma.brand.findFirst({ where: { name: "E2E Brand" } }), "brand not in DB");
    expect(b.country === "Монгол" && b.kind === "ORIGINAL", `${b.country} ${b.kind}`);
    await reload();
    await row("E2E Brand").getByRole("button", { name: "Засах" }).click();
    await field("country").fill("Япон");
    await submit();
    await toast("шинэчлэгдлээ");
    expect((await prisma.brand.findUnique({ where: { id: b.id } }))?.country === "Япон", "edit not in DB");
    await reload();
    await row("E2E Brand").getByRole("button", { name: "Устгах" }).click();
    await confirm("Устгах");
    await toast("устгагдлаа");
    expect(!(await prisma.brand.findUnique({ where: { id: b.id } })), "brand still in DB");
    await reload();
    expect(!(await shows("E2E Brand")), "brand listed after reload");
  });

  await s.step(P.cat, "Brand in use: UI message + API 409", async () => {
    await row("Bosch").getByRole("button", { name: "Устгах" }).click();
    await toast("тул устгах боломжгүй");
    const bosch = await prisma.brand.findFirstOrThrow({ where: { name: "Bosch" } });
    const admin = await adminApi(ctx.api, ctx.staffPassword);
    const r = await admin<{ error: { code: string; message: string } }>("DELETE", `/admin/brands/${bosch.id}`);
    expect(r.status === 409 && /бараа энэ брэндтэй холбоотой/.test(r.json.error.message), `${r.status} ${JSON.stringify(r.json)}`);
    expect(await prisma.brand.findUnique({ where: { id: bosch.id } }), "Bosch was deleted");
    return `409: "${r.json.error.message}"`;
  });

  /* ---------- vehicles ---------- */
  await s.step(P.veh, "Vehicle create → edit → delete (DB)", async () => {
    await go("/vehicles");
    await page.getByRole("button", { name: "Машин нэмэх" }).click();
    await field("make").fill("Lexus");
    await field("model").fill("LX 570 E2E");
    await field("gen").fill("J200");
    await field("fuel").selectOption("Бензин");
    await field("yearFrom").fill("2016");
    await field("yearTo").fill("2012");
    await field("engine").fill("3UR-FE 5.7 V8");
    await submit();
    await dialog().getByText("Дуусах он эхлэх оноос хойш байх ёстой").waitFor();
    await field("yearTo").fill("2021");
    await submit();
    await toast("нэмэгдлээ");
    const v = await eventually(() => prisma.vehicle.findFirst({ where: { model: "LX 570 E2E" } }), "vehicle not in DB");
    expect(v.fuel === "PETROL" && v.yearFrom === 2016 && v.yearTo === 2021, `${v.fuel} ${v.yearFrom}-${v.yearTo}`);
    await reload();
    await row("LX 570 E2E").getByRole("button", { name: "Засах" }).click();
    await field("engine").fill("3UR-FE 5.7 V8 Flex");
    await submit();
    await toast("шинэчлэгдлээ");
    expect((await prisma.vehicle.findUnique({ where: { id: v.id } }))?.engine === "3UR-FE 5.7 V8 Flex", "edit not in DB");
    await reload();
    await row("LX 570 E2E").getByRole("button", { name: "Устгах" }).click();
    await confirm("Устгах");
    await toast("устгагдлаа");
    expect(!(await prisma.vehicle.findUnique({ where: { id: v.id } })), "vehicle still in DB");
    await reload();
    expect(!(await shows("LX 570 E2E")), "vehicle listed after reload");
  });

  await s.step(P.veh, "CSV import (new, duplicate, bad rows) → DB", async () => {
    const before = await prisma.vehicle.count();
    const dup = await prisma.vehicle.findFirstOrThrow();
    const csv = [
      "make,model,gen,year_from,year_to,engine,fuel",
      "Nissan,Patrol E2E,Y62,2010,2024,VK56VD 5.6 V8,Бензин",
      "Nissan,Patrol E2E,Y61,1997,2016,ZD30 3.0 Diesel,Дизель",
      `${dup.make},${dup.model},${dup.generation},${dup.yearFrom},${dup.yearTo},${dup.engine},Бензин`,
      "Nissan,,Y62,2010,2024,,Бензин",
    ].join("\n");
    await go("/vehicles");
    await page.getByRole("button", { name: "CSV импорт" }).click();
    await dialog().locator("input[type=file]").setInputFiles({ name: "vehicles.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await dialog().getByRole("button", { name: "Импортлох" }).click();
    await toast("2 мөр импортлогдлоо · 1 давхардсан · 1 алдаатай мөр");
    expect((await prisma.vehicle.count()) === before + 2, `vehicles ${before} → ${await prisma.vehicle.count()}`);
    const diesel = await prisma.vehicle.findFirstOrThrow({ where: { model: "Patrol E2E", generation: "Y61" } });
    expect(diesel.fuel === "DIESEL", `fuel ${diesel.fuel}`);
    await reload();
    expect((await page.getByText("Patrol E2E").count()) >= 2, "imported rows not listed after reload");
    return "parsed by the service; duplicate skipped, bad row reported";
  });

  /* ---------- inventory ---------- */
  await s.step(P.inv, "Stock adjustment → DB + history", async () => {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: 2 } });
    await go("/inventory");
    await row(p.name).getByRole("button", { name: "Тохируулах" }).click();
    await field("qty").fill(String(p.stock + 999));
    await field("dir").selectOption("-");
    await submit();
    await dialog().getByText(`Нөөцөөс их байна (${p.stock} ш)`).waitFor();
    await field("dir").selectOption("+");
    await field("qty").fill("5");
    await field("reason").selectOption("Шинэ орлого");
    await field("note").fill("E2E баримт");
    await submit();
    await toast(`${p.stock + 5} ш`);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: 2 } });
    expect(after.stock === p.stock + 5, `stock ${p.stock} → ${after.stock}`);
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { productId: 2, reason: "Шинэ орлого · E2E баримт" } });
    expect(mv.delta === 5 && mv.reason === "Шинэ орлого · E2E баримт" && mv.stockAfter === after.stock && mv.actorId, `movement ${JSON.stringify(mv)}`);
    await reload();
    expect(await shows("Шинэ орлого · E2E баримт"), "history row missing after reload");
    return `${p.stock} → ${after.stock}; movement by ${mv.actorName}`;
  });

  await s.step(P.inv, "Low-stock threshold → DB", async () => {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: 2 } });
    const input = row(p.name).getByLabel("Доод хязгаар");
    await input.fill("9");
    await input.press("Enter");
    await eventually(async () => (await prisma.product.findUnique({ where: { id: 2 } }))?.lowStockThreshold === 9, "threshold not in DB");
    await reload();
    expect((await row(p.name).getByLabel("Доод хязгаар").inputValue()) === "9", "threshold lost after reload");
  });

  /* ---------- banners & campaigns ---------- */
  await s.step(P.promo, "Banner create → edit → toggle → reorder → delete (DB)", async () => {
    await go("/promos");
    await page.getByRole("button", { name: "Баннер нэмэх" }).click();
    await field("eyebrow").fill("Е2Е шошго");
    await field("cta").fill("Үзэх");
    await field("title").fill("Е2Е баннер");
    await field("link").fill("shop");
    await submit();
    await dialog().getByText("“/” эсвэл “http”-ээр эхлэх ёстой").waitFor();
    await field("link").fill("/shop/oil");
    await submit();
    await toast("Баннер нэмэгдлээ");
    const b = await eventually(() => prisma.banner.findFirst({ where: { title: "Е2Е баннер" } }), "banner not in DB");
    expect(b.eyebrow === "Е2Е шошго" && b.ctaLabel === "Үзэх" && b.link === "/shop/oil" && b.active, JSON.stringify(b));
    await reload();
    const card = page.locator("div", { has: page.getByText("Е2Е баннер", { exact: true }) }).filter({ has: page.getByRole("switch") }).last();
    await card.getByRole("button", { name: "Засах" }).click();
    await field("title").fill("Е2Е баннер 2");
    await submit();
    await toast("Баннер шинэчлэгдлээ");
    expect((await prisma.banner.findUnique({ where: { id: b.id } }))?.title === "Е2Е баннер 2", "edit not in DB");
    const card2 = page.locator("div", { has: page.getByText("Е2Е баннер 2", { exact: true }) }).filter({ has: page.getByRole("switch") }).last();
    await card2.getByRole("switch").click();
    await eventually(async () => (await prisma.banner.findUnique({ where: { id: b.id } }))?.active === false, "toggle not in DB");
    const orderBefore = (await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } })).map((x) => x.id);
    await card2.getByRole("button", { name: "Дээш" }).click();
    const orderAfter = await eventually(async () => {
      const ids = (await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } })).map((x) => x.id);
      return ids.indexOf(b.id) === orderBefore.indexOf(b.id) - 1 ? ids : null;
    }, "reorder not in DB");
    await reload();
    const titles = await page.locator("strong").allInnerTexts();
    const dbTitles = (await prisma.banner.findMany({ where: { id: { in: orderAfter } }, orderBy: { sortOrder: "asc" } })).map((x) => x.title);
    expect(dbTitles.every((t, i) => titles.indexOf(t) >= 0 && (i === 0 || titles.indexOf(t) > titles.indexOf(dbTitles[i - 1]!))), "order after reload ≠ DB");
    const card3 = page.locator("div", { has: page.getByText("Е2Е баннер 2", { exact: true }) }).filter({ has: page.getByRole("switch") }).last();
    expect((await card3.getByRole("switch").getAttribute("aria-checked")) === "false", "inactive state lost after reload");
    await card3.getByRole("button", { name: "Устгах" }).click();
    await confirm("Устгах");
    await toast("устгагдлаа");
    expect(!(await prisma.banner.findUnique({ where: { id: b.id } })), "banner still in DB");
    return "eyebrow + CTA saved (used by the storefront hero)";
  });

  await s.step(P.promo, "Campaign create → edit → toggle → delete (DB)", async () => {
    const today = ubToday();
    await page.getByRole("button", { name: "Хямдрал нэмэх" }).click();
    await field("name").fill("Е2Е хямдрал");
    await field("pct").fill("95");
    await field("target").selectOption("Ангилал: Тоормос");
    await field("from").fill(today);
    await field("to").fill("2027-01-31");
    await submit();
    await dialog().getByText("1–90 хооронд").waitFor();
    await field("pct").fill("15");
    await submit();
    await toast("хямдрал нэмэгдлээ");
    const c = await eventually(() => prisma.campaign.findFirst({ where: { name: "Е2Е хямдрал" }, include: { category: true } }), "campaign not in DB");
    expect(c.percent === 15 && c.target === "CATEGORY" && c.category?.name === "Тоормос" && c.active, `${c.percent} ${c.target} ${c.category?.name}`);
    await reload();
    await row("Е2Е хямдрал").getByRole("button", { name: "Засах" }).click();
    await field("pct").fill("20");
    await submit();
    await toast("шинэчлэгдлээ");
    expect((await prisma.campaign.findUnique({ where: { id: c.id } }))?.percent === 20, "edit not in DB");
    await row("Е2Е хямдрал").getByRole("switch").click();
    await eventually(async () => (await prisma.campaign.findUnique({ where: { id: c.id } }))?.active === false, "toggle not in DB");
    await reload();
    expect(await shows("Зогсоосон"), "paused state lost after reload");
    await row("Е2Е хямдрал").getByRole("button", { name: "Устгах" }).click();
    await confirm("Устгах");
    await toast("устгагдлаа");
    expect(!(await prisma.campaign.findUnique({ where: { id: c.id } })), "campaign still in DB");
  });

  /* ---------- customers ---------- */
  await s.step(P.cust, "List + profile drawer = DB", async () => {
    await go("/customers");
    const n = await prisma.user.count({ where: { role: "CUSTOMER", OR: [{ isGuest: false }, { orders: { some: {} } }] } });
    expect(await shows(`${n} хэрэглэгч`), `count ≠ ${n}`);
    await page.locator(".tr.click").first().click();
    const drawer = page.getByRole("dialog");
    await drawer.waitFor();
    const id = new URL(page.url()).searchParams.get("c")!;
    const orders = await prisma.order.count({ where: { userId: id } });
    expect((await drawer.locator("a[href^='/orders/']").count()) === orders, `drawer orders ≠ ${orders}`);
    return `${n} customers (incl. guests who ordered); drawer orders = DB`;
  });

  /* ---------- orders ---------- */
  // seed stages: a couple of "paid" (waiting) orders, more in preparing / shipping / delivered
  const stage = (deliveryStatus: "NONE" | "PREPARING" | "SHIPPING") =>
    prisma.order.findMany({ where: { paymentStatus: "PAID", deliveryStatus }, orderBy: { createdAt: "desc" }, take: 2, include: { items: true } });
  const [paid, preparing, shipping] = await Promise.all([stage("NONE"), stage("PREPARING"), stage("SHIPPING")]);
  await s.step(P.ord, "Status change from the list → DB", async () => {
    expect(paid.length === 2 && preparing.length && shipping.length, `seed has ${paid.length} paid, ${preparing.length} preparing, ${shipping.length} shipping`);
    const o = preparing[0]!;
    await go("/orders");
    await page.getByPlaceholder("Захиалга #, нэр, утас").fill(o.number);
    await row(`#${o.number}`).getByLabel("Төлөв").selectOption("shipping");
    await toast(`#${o.number} → Хүргэлтэнд`);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(after.deliveryStatus === "SHIPPING" && after.shippingAt, `delivery ${after.deliveryStatus}`);
    await reload();
    await page.getByPlaceholder("Захиалга #, нэр, утас").fill(o.number);
    expect((await row(`#${o.number}`).getByLabel("Төлөв").inputValue()) === "shipping", "status lost after reload");
  });

  await s.step(P.ord, "Next step on the order page → DB", async () => {
    const o = preparing[0]!;
    await go(`/orders/${o.number}`);
    await page.getByRole("button", { name: "Хүргэгдсэн болгох" }).click();
    await toast("Хүргэгдсэн");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(after.deliveryStatus === "DELIVERED" && after.deliveredAt, `delivery ${after.deliveryStatus}`);
    await reload();
    expect((await page.getByRole("button", { name: "Цуцлах" }).count()) === 0, "delivered order still offers Цуцлах");
  });

  await s.step(P.ord, "Bulk status → DB", async () => {
    const two = paid;
    await go("/orders");
    await page.getByRole("tab", { name: /Төлөгдсөн/ }).click();
    for (const o of two) await page.getByLabel(`#${o.number} сонгох`).check();
    await page.locator(".bulkbar").getByLabel("Төлөв өөрчлөх").selectOption("preparing");
    await toast("2 захиалга → Бэлтгэж байна");
    const rows = await prisma.order.findMany({ where: { id: { in: two.map((o) => o.id) } } });
    expect(rows.every((r) => r.deliveryStatus === "PREPARING"), rows.map((r) => r.deliveryStatus).join());
  });

  await s.step(P.ord, "Internal note → DB → reload", async () => {
    const o = preparing[0]!;
    await go(`/orders/${o.number}`);
    await page.getByLabel("Тэмдэглэл").fill("Е2Е: орой хүргэнэ");
    await page.getByRole("button", { name: "Тэмдэглэл нэмэх" }).click();
    await toast("Тэмдэглэл хадгалагдлаа");
    const n = await prisma.orderNote.findFirstOrThrow({ where: { orderId: o.id, text: "Е2Е: орой хүргэнэ" } });
    expect(n.authorId, "note has no author");
    await reload();
    expect(await shows("Е2Е: орой хүргэнэ"), "note missing after reload");
    return `by ${n.authorName}`;
  });

  await s.step(P.ord, "Cancel paid order → refund, stock back (DB)", async () => {
    const o = shipping[0]!;
    const it = o.items.find((i) => i.productId)!;
    const before = await prisma.product.findUniqueOrThrow({ where: { id: it.productId! } });
    await go(`/orders/${o.number}`);
    await page.getByRole("button", { name: "Цуцлах" }).click();
    expect(await dialog().getByText("QPay-ээр буцаан олголт").count(), "refund warning missing");
    await submit();
    await dialog().getByText("Заавал бөглөнө").first().waitFor();
    await field("reason").selectOption("Бараа дууссан");
    await field("comment").fill("Е2Е цуцлалт");
    await submit();
    await toast("цуцлагдлаа");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(after.paymentStatus === "CANCELLED" && after.paidAt && after.cancelReason === "Бараа дууссан", `${after.paymentStatus} ${after.cancelReason}`);
    const p = await prisma.product.findUniqueOrThrow({ where: { id: it.productId! } });
    expect(p.stock === before.stock + it.qty, `stock ${before.stock} → ${p.stock}, expected +${it.qty}`);
    expect(await prisma.stockMovement.findFirst({ where: { orderId: o.id, reason: `Буцаалт · #${o.number}` } }), "no refund stock movement");
    await reload();
    expect(await shows("Буцаагдсан"), "refunded badge missing after reload");
    return `+${it.qty} back to stock, note + movement logged`;
  });

  await s.step(P.ord, "Invalid change → server message (Mongolian)", async () => {
    const pend = await prisma.order.findFirstOrThrow({ where: { paymentStatus: "PENDING" } });
    problems.allowOnce(`/admin/orders/${pend.number}/status`);
    await go(`/orders/${pend.number}`);
    await page.getByLabel("Шинэ төлөв").selectOption("shipping");
    await page.getByRole("button", { name: "Төлөв шинэчлэх" }).click();
    await toast("Төлбөр төлөгдөөгүй захиалгыг хүргэлтэд гаргах боломжгүй");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: pend.id } })).paymentStatus === "PENDING", "order changed");
    return "409 shown as a toast, nothing changed";
  });

  await s.step(P.ord, "QPay check on a pending order", async () => {
    const pend = await prisma.order.findFirstOrThrow({ where: { paymentStatus: "PENDING" }, orderBy: { createdAt: "desc" } });
    await go(`/orders/${pend.number}`);
    await page.getByRole("button", { name: "QPay төлөв шалгах" }).click();
    await toast("төлбөр хараахан ороогүй байна");
    return "asks the service (DEMO_MODE state)";
  });

  /* ---------- reports ---------- */
  await s.step(P.rep, "Totals = DB (6 months)", async () => {
    await go("/reports");
    const t = ubToday();
    const [y, m] = t.split("-").map(Number) as [number, number];
    const d = new Date(Date.UTC(y, m - 1 - 5, 1));
    const from = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const agg = await prisma.order.aggregate({ where: { paymentStatus: "PAID", createdAt: { gte: ubStart(from) } }, _sum: { total: true }, _count: true });
    const kpi = (i: number) => page.locator(".kpis > .panel").nth(i).innerText();
    expect((await kpi(0)).includes(fmt(agg._sum.total ?? 0)), `revenue "${await kpi(0)}" ≠ ${fmt(agg._sum.total ?? 0)}`);
    expect((await kpi(1)).includes(String(agg._count)), `orders "${await kpi(1)}" ≠ ${agg._count}`);
    await page.getByRole("button", { name: "Өдрөөр" }).click();
    await page.getByText("Сүүлийн 14 өдөр").waitFor();
    return `${agg._count} paid orders, ${fmt(agg._sum.total ?? 0)} since ${from}`;
  });

  /* ---------- settings ---------- */
  await s.step(P.set, "Store tab: validation, save → DB → reload", async () => {
    await go("/settings");
    const input = (label: string) => page.locator("label.field", { hasText: label }).locator("input");
    await input("Утас").fill("123");
    await page.getByRole("button", { name: /Хадгалах/ }).click();
    await page.getByText("8 оронтой утасны дугаар (жишээ: 7711-2233)").waitFor();
    await input("Утас").fill("7711-2233");
    await input("Ажлын цаг").fill("Өдөр бүр 09:00–21:00 (E2E)");
    await page.getByRole("button", { name: /Хадгалах/ }).click();
    await toast("Тохиргоо хадгалагдлаа");
    const st = await prisma.setting.findUniqueOrThrow({ where: { key: "store" } });
    expect((st.value as { hours: string }).hours === "Өдөр бүр 09:00–21:00 (E2E)", JSON.stringify(st.value));
    await reload();
    expect((await input("Ажлын цаг").inputValue()) === "Өдөр бүр 09:00–21:00 (E2E)", "hours lost after reload");
  });

  await s.step(P.set, "Delivery tab: zone fee → DB", async () => {
    await go("/settings?tab=delivery");
    await page.getByLabel("Төлбөр", { exact: true }).first().fill("6500");
    await page.getByRole("button", { name: /Хадгалах/ }).click();
    await toast("Тохиргоо хадгалагдлаа");
    const dl = await prisma.setting.findUniqueOrThrow({ where: { key: "delivery" } });
    expect((dl.value as { zones: { fee: number }[] }).zones[0]?.fee === 6500, JSON.stringify(dl.value));
    await reload();
    expect((await page.getByLabel("Төлбөр", { exact: true }).first().inputValue()) === "6500", "fee lost after reload");
  });

  await s.step(P.set, "QPay tab: read-only env status + connection test", async () => {
    await go("/settings?tab=qpay");
    expect(await shows("Идэвхтэй"), "DEMO_MODE badge should be on (test env)");
    expect(!(await shows("10 секундын")), "old 'auto-paid after 10 s' copy still shown");
    expect((await page.locator("input[type=password]").count()) === 0, "credential inputs should be gone");
    await page.getByRole("button", { name: "Холболт шалгах" }).click();
    await toast("DEMO_MODE");
    return "credentials/env/DEMO_MODE from .env; test → /admin/qpay-test";
  });

  let opEmail = "e2e.operator@autohub.mn";
  let opPassword = "";
  await s.step(P.set, "Staff: invite → role change (DB)", async () => {
    await go("/settings?tab=admins");
    await page.getByRole("button", { name: "Урих" }).click();
    await field("name").fill("Е2Е Оператор");
    await field("email").fill(opEmail);
    await field("role").selectOption("operator");
    await submit();
    const msg = await page.getByRole("alertdialog").innerText();
    opPassword = msg.match(/нууц үг: (\S+)/)?.[1] ?? "";
    expect(opPassword.length >= 6, `no temp password in "${msg}"`);
    await confirm("Ойлголоо");
    const u = await eventually(() => prisma.user.findFirst({ where: { email: opEmail } }), "staff not in DB");
    expect(u.role === "OPERATOR", u.role);
    await row(opEmail).getByLabel("Эрх").selectOption("admin");
    await toast("→ Админ");
    await eventually(async () => (await prisma.user.findUnique({ where: { id: u.id } }))?.role === "ADMIN", "role change not in DB");
    await row(opEmail).getByLabel("Эрх").selectOption("operator");
    await toast("→ Оператор");
    await eventually(async () => (await prisma.user.findUnique({ where: { id: u.id } }))?.role === "OPERATOR", "role change back not in DB");
    await reload();
    expect((await row(opEmail).getByLabel("Эрх").inputValue()) === "operator", "role lost after reload");
    return "temporary password shown once";
  });

  /* ---------- roles ---------- */
  await s.step(P.role, "Operator: orders yes, settings read-only, API 403", async () => {
    const op = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pg = await op.newPage();
    const opProblems = watch(pg);
    await pg.goto(D + "/login");
    await pg.locator("input[type=email]").fill(opEmail);
    await pg.locator("input[type=password]").fill(opPassword);
    await pg.getByRole("button", { name: "Нэвтрэх" }).click();
    await pg.waitForURL(D + "/");
    expect(await shows("Оператор", pg), "header doesn't say Оператор");
    await go("/settings", pg);
    expect(await shows("Оператор эрхээр тохиргоог зөвхөн харах боломжтой", pg), "no read-only notice");
    expect((await pg.getByRole("button", { name: /Хадгалах/ }).count()) === 0, "operator sees Save");
    await go("/settings?tab=admins", pg);
    expect((await pg.getByRole("button", { name: "Урих" }).count()) === 0, "operator sees Invite");
    const r = await pg.request.put(`${ctx.api}/api/v1/admin/settings/store`, {
      data: { name: "x", phone: "7711-2233", email: "", address: "", hours: "" },
    });
    expect(r.status() === 403, `PUT settings as operator → ${r.status()}`);
    const o = paid[1]!;
    await go(`/orders/${o.number}`, pg);
    await pg.getByRole("button", { name: "Хүргэлтэнд гаргах" }).click();
    await toast("Хүргэлтэнд", pg);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).deliveryStatus === "SHIPPING", "operator status change not in DB");
    expect(opProblems.length === 0, opProblems.slice(0, 3).join(" · "));
    await op.close();
    return "403 from the service for settings; order flow allowed";
  });

  await s.step(P.role, "Remove staff → can't sign in", async () => {
    await go("/settings?tab=admins");
    await row(opEmail).getByRole("button", { name: "Хасах" }).click();
    await confirm("Хасах");
    await toast("Хэрэглэгч хасагдлаа");
    expect(!(await prisma.user.findFirst({ where: { email: opEmail } })), "staff still in DB");
    const r = await fetch(`${ctx.api}/api/v1/admin/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: opEmail, password: opPassword }),
    });
    expect(r.status === 401, `login after removal → ${r.status}`);
  });

  /* ---------- cross-app (storefront) ---------- */
  const webUp = await fetch(ctx.web).then((r) => r.ok).catch(() => false);
  let web: BrowserContext | null = null;
  let wpage: Page | null = null;
  let orderNo = "";
  if (!webUp) s.note(P.x, "Storefront flows", "todo", "web not running in this mode — run `npm run test:e2e` for the cross-app checks");
  else {
    web = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    wpage = await web.newPage();
    const wp = wpage;
    const wProblems = watch(wp);
    const wgo = async (p: string) => {
      await wp.goto(ctx.web + p);
      await wp.waitForLoadState("networkidle");
    };

    await s.step(P.x, "Web order appears in the dashboard", async () => {
      await wgo("/product/7");
      await wp.getByRole("button", { name: "Сагслах" }).first().click();
      const userId = await sessionUserId(web!);
      await eventually(async () => (await prisma.cartItem.count({ where: { cart: { userId } } })) === 1, "cart row not in DB");
      // checkout needs an account: register this guest (same browser cookies; the cart stays)
      const reg = await web!.request.post(`${ctx.api}/api/v1/auth/register`, {
        headers: { origin: ctx.web },
        data: { name: "Кросс Апп", phone: "88003344", password: "e2e-secret-2" },
      });
      expect(reg.status() === 201, `register → ${reg.status()}`);
      await wgo("/checkout");
      await wp.getByPlaceholder("Таны нэр").fill("Кросс Апп");
      await wp.getByPlaceholder("9911 2233").fill("8800 3344");
      const selects = wp.locator("main select");
      await selects.nth(0).selectOption({ index: 1 });
      await selects.nth(1).selectOption({ index: 1 });
      await wp.getByPlaceholder("Байр, орц, давхар, тоот, тэмдэгт газар").fill("12-р байр, 3 тоот");
      await wp.getByRole("button", { name: "Захиалга баталгаажуулах" }).click();
      await wp.waitForURL("**/checkout/payment?order=*");
      orderNo = new URL(wp.url()).searchParams.get("order")!;
      await go("/orders");
      await page.getByPlaceholder("Захиалга #, нэр, утас").fill(orderNo);
      const r = row(`#${orderNo}`);
      await r.waitFor();
      expect((await r.innerText()).includes("Кросс Апп"), `row: ${await r.innerText()}`);
      expect((await r.getByLabel("Төлөв").inputValue()) === "pending", "should be pending");
      return `#${orderNo} listed as pending with the checkout name`;
    });

    await s.step(P.x, "Dashboard status change → Миний захиалгууд", async () => {
      await go(`/orders/${orderNo}`);
      await page.getByLabel("Шинэ төлөв").selectOption("paid");
      await page.getByRole("button", { name: "Төлөв шинэчлэх" }).click();
      await toast(`#${orderNo} → Төлөгдсөн`);
      await page.getByRole("button", { name: "Бэлтгэж эхлэх" }).click();
      await toast(`#${orderNo} → Бэлтгэж байна`);
      const o = await prisma.order.findUniqueOrThrow({ where: { number: orderNo } });
      expect(o.paymentStatus === "PAID" && o.deliveryStatus === "PREPARING", `${o.paymentStatus}/${o.deliveryStatus}`);
      await wgo(`/account/orders?order=${orderNo}`);
      expect(await shows("Бэлтгэж байна", wp), "web doesn't show 'Бэлтгэж байна'");
      return "manual payment + preparing, shown on the storefront";
    });

    await s.step(P.x, "Dashboard price + stock change → web", async () => {
      const p = await prisma.product.findUniqueOrThrow({ where: { id: 5 } });
      await go("/products/5");
      const nums = page.locator(".panel", { hasText: "Үнэ & нөөц" }).locator("input[type=number]");
      await nums.nth(0).fill("88500");
      await nums.nth(1).fill("");
      await page.getByRole("button", { name: "Хадгалах" }).click();
      await page.waitForURL(D + "/products");
      await go("/inventory");
      await row(p.name).getByRole("button", { name: "Тохируулах" }).click();
      await field("qty").fill("7");
      await submit();
      await toast(`${p.stock + 7} ш`);
      await wgo("/product/5");
      expect(await shows(fmt(88500), wp), "new price not on web");
      expect(await shows(`Үлдэгдэл: ${p.stock + 7} ш`, wp), `stock ${p.stock + 7} not on web`);
      return `${fmt(p.price)} → ${fmt(88500)}, stock ${p.stock} → ${p.stock + 7}`;
    });

    await s.step(P.x, "Banner from the dashboard → web hero", async () => {
      const admin = await adminApi(ctx.api, ctx.staffPassword);
      const first = await prisma.banner.findFirstOrThrow({ where: { active: true }, orderBy: { sortOrder: "asc" } });
      await go("/promos");
      const card = page.locator("div", { has: page.getByText(first.title, { exact: true }) }).filter({ has: page.getByRole("switch") }).last();
      await card.getByRole("button", { name: "Засах" }).click();
      await field("title").fill(`${first.title} (E2E)`);
      await submit();
      await toast("Баннер шинэчлэгдлээ");
      await wgo("/");
      expect(await shows(`${first.title} (E2E)`, wp), "hero doesn't show the edited banner");
      await admin("PATCH", `/admin/banners/${first.id}`, { title: first.title });
    });

    await s.step(P.x, "No console errors / failed requests (web)", async () => {
      expect(wProblems.length === 0, wProblems.slice(0, 3).join(" · "));
    });
    await web.close();
  }

  /* ---------- sign out ---------- */
  await s.step(P.login, "Logout → cookie cleared, back to /login", async () => {
    await go("/");
    await page.locator("header").getByRole("button", { expanded: false }).last().click();
    await page.getByRole("button", { name: "Гарах" }).click();
    await page.waitForURL("**/login**");
    expect(!(await bctx.cookies()).some((c) => c.name === "autohub_admin_session"), "session cookie still set");
    await page.goto(D + "/orders");
    await page.waitForURL("**/login?next=%2Forders");
  });

  await s.step("Dashboard", "No console errors / failed requests", async () => {
    expect(problems.length === 0, problems.slice(0, 3).join(" · "));
  });

  await closeAll(browser);
  return s.results;
}

async function closeAll(browser: Browser) {
  await browser.close();
}
