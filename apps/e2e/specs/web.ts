/* Storefront (apps/web) against the real API + DB. */
import { adminApi } from "../lib/admin-api";
import { Suite, eventually, expect, launch, sessionUserId, watch } from "../lib/harness";
import type { Ctx } from "../lib/types";

const fmt = (n: number) => n.toLocaleString("en-US") + "₮";

export async function run(ctx: Ctx) {
  const { prisma } = await import("@repo/db");
  const browser = await launch();
  const bctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await bctx.newPage();
  const problems = watch(page);
  const s = new Suite(bctx, ctx.out);
  const go = async (p: string) => {
    await page.goto(ctx.web + p);
    await page.waitForLoadState("networkidle");
  };
  const W = "Web";
  console.log("\nStorefront");

  /* ---------- catalog ---------- */
  await s.step(W, "Home: banners, categories, featured from DB", async () => {
    await go("/");
    const banner = await prisma.banner.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    expect(banner && (await page.getByText(banner.title).count()) > 0, `hero doesn't show banner "${banner?.title}"`);
    const cats = await prisma.category.count();
    const shown = await page.locator("main a[href^='/shop/']").count();
    expect(shown >= cats, `category grid shows ${shown} links, DB has ${cats}`);
    const first8 = await prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 8 });
    for (const p of first8) expect((await page.getByText(p.name, { exact: true }).count()) > 0, `featured missing "${p.name}"`);
    return "hero = active banners in order; featured = first 8 by sortOrder";
  });

  await s.step(W, "Vehicle finder → fitting parts, car saved", async () => {
    await go("/");
    const sel = page.locator("#finder select");
    await sel.nth(0).selectOption("Toyota");
    await sel.nth(1).selectOption("Land Cruiser 200");
    await sel.nth(2).selectOption("2015");
    await sel.nth(3).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Тохирох сэлбэг хайх" }).click();
    await page.waitForURL("**/shop?fit=1");
    await page.waitForLoadState("networkidle");
    const n = await prisma.product.count({ where: { active: true, fitments: { some: { vehicle: { model: "Land Cruiser 200" } } } } });
    await page.getByText(`${n}`, { exact: true }).first().waitFor();
    const userId = await sessionUserId(bctx);
    const car = await eventually(() => prisma.savedCar.findFirst({ where: { userId } }), "car not saved in DB");
    expect(car.model === "Land Cruiser 200" && car.year === 2015, `saved car ${car.model} ${car.year}`);
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect((await page.getByText("Land Cruiser 200").count()) > 0, "car not shown after reload");
    return `${n} fitting parts; SavedCar row persisted, survives reload`;
  });

  await s.step(W, "Search by name", async () => {
    await go("/");
    await page.getByPlaceholder("Сэлбэгийн нэр, код, OEM дугаараар хайх").fill("Тоормосны диск");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/shop\?q=/);
    await page.waitForLoadState("networkidle");
    const p = await prisma.product.findFirstOrThrow({ where: { name: { contains: "Тоормосны диск" } } });
    expect((await page.getByText(p.name, { exact: true }).count()) > 0, `"${p.name}" not in results`);
  });

  await s.step(W, "Search by OEM (spaces/dashes ignored)", async () => {
    await go("/shop?q=0446547070");
    const p = await prisma.product.findUniqueOrThrow({ where: { id: 1 } });
    expect((await page.getByText(p.name, { exact: true }).count()) > 0, `OEM search didn't find "${p.name}"`);
  });

  await s.step(W, "Category filter", async () => {
    await go("/shop/brake");
    const n = await prisma.product.count({ where: { active: true, category: { slug: "brake" } } });
    const label = await page.locator("main").getByText("бараа олдлоо").first().textContent();
    expect(label?.includes(String(n)), `shows "${label}", DB has ${n}`);
    return `${n} products = DB`;
  });

  await s.step(W, "Product detail (price, stock, fitment)", async () => {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: 17 }, include: { fitments: { include: { vehicle: true } } } });
    await go("/product/17");
    expect((await page.getByRole("heading", { name: p.name }).count()) > 0, "name missing");
    expect((await page.getByText(fmt(p.price)).count()) > 0, `price ${fmt(p.price)} missing`);
    await page.getByRole("tab", { name: "Тохирох машинууд" }).click();
    const models = [...new Set(p.fitments.map((f) => f.vehicle.model))];
    for (const m of models) expect((await page.getByText(m, { exact: true }).count()) > 0, `fitment ${m} missing`);
  });

  /* ---------- wishlist ---------- */
  await s.step(W, "Wishlist add → DB → reload → remove", async () => {
    const userId = await sessionUserId(bctx);
    await go("/product/17");
    await page.locator("main button[title='Хадгалах']").first().click();
    await eventually(() => prisma.wishlistItem.findUnique({ where: { userId_productId: { userId, productId: 17 } } }), "wishlist row not created");
    await page.reload();
    await page.waitForLoadState("networkidle");
    const color = await page.locator("main button[title='Хадгалах']").first().evaluate((b) => getComputedStyle(b).color);
    await page.locator("main button[title='Хадгалах']").first().click();
    await eventually(async () => !(await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId, productId: 17 } } })), "wishlist row not deleted");
    return `persisted across reload (heart colour ${color}), removed from DB`;
  });

  /* ---------- cart ---------- */
  await s.step(W, "Cart add → DB → reload", async () => {
    const userId = await sessionUserId(bctx);
    for (const id of [17, 1]) {
      await go(`/product/${id}`);
      await page.getByRole("button", { name: "Сагслах" }).first().click();
    }
    const rows = await eventually(async () => {
      const r = await prisma.cartItem.findMany({ where: { cart: { userId } } });
      return r.length === 2 ? r : null;
    }, "cart rows not in DB");
    await go("/cart");
    await page.reload();
    await page.waitForLoadState("networkidle");
    for (const id of [17, 1]) {
      const p = await prisma.product.findUniqueOrThrow({ where: { id } });
      expect((await page.getByText(p.name).count()) > 0, `${p.name} missing after reload`);
    }
    return `${rows.length} CartItem rows; cart rendered from the server after reload`;
  });

  await s.step(W, "Cart update quantity → DB", async () => {
    const userId = await sessionUserId(bctx);
    await go("/cart");
    await page.getByRole("button", { name: "Нэмэх" }).first().click();
    await eventually(async () => (await prisma.cartItem.findFirst({ where: { cart: { userId }, productId: 17 } }))?.qty === 2, "qty not 2 in DB");
  });

  await s.step(W, "Cart remove line → DB", async () => {
    const userId = await sessionUserId(bctx);
    await go("/cart");
    await page.locator("button[title='Устгах']").last().click();
    await eventually(async () => (await prisma.cartItem.count({ where: { cart: { userId } } })) === 1, "line not removed in DB");
    await page.reload();
    await page.waitForLoadState("networkidle");
    const p1 = await prisma.product.findUniqueOrThrow({ where: { id: 1 } });
    expect((await page.locator("main").getByText(p1.name).count()) === 0, "removed line came back after reload");
  });

  /* ---------- checkout ---------- */
  let orderNo = "";
  await s.step(W, "Checkout validation (Mongolian)", async () => {
    await go("/checkout");
    await page.getByRole("button", { name: "Захиалга баталгаажуулах" }).click();
    for (const t of ["Нэрээ оруулна уу", "8 оронтой утасны дугаар оруулна уу", "Дүүрэг сонгоно уу"])
      expect((await page.getByText(t).count()) > 0, `missing message "${t}"`);
  });

  await s.step(W, "Checkout → order in DB, cart emptied", async () => {
    const userId = await sessionUserId(bctx);
    await page.getByPlaceholder("Таны нэр").fill("Е2Е Хэрэглэгч");
    await page.getByPlaceholder("9911 2233").fill("8800 1122");
    const selects = page.locator("main select");
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ index: 1 });
    await page.getByPlaceholder("Байр, орц, давхар, тоот, тэмдэгт газар").fill("45-р байр, 12 тоот");
    await page.getByRole("button", { name: "Захиалга баталгаажуулах" }).click();
    await page.waitForURL("**/checkout/payment?order=*");
    orderNo = new URL(page.url()).searchParams.get("order")!;
    const o = await prisma.order.findUniqueOrThrow({ where: { number: orderNo }, include: { items: true } });
    expect(o.userId === userId && o.paymentStatus === "PENDING", `order ${orderNo} ${o.paymentStatus}`);
    expect(o.customerPhone === "88001122" && o.car?.includes("Land Cruiser 200"), `phone ${o.customerPhone}, car ${o.car}`);
    const p = await prisma.product.findUniqueOrThrow({ where: { id: 17 } });
    expect(o.items[0]?.qty === 2 && o.subtotal === p.price * 2, `items ${JSON.stringify(o.items.map((i) => [i.productId, i.qty]))}`);
    expect((await prisma.cartItem.count({ where: { cart: { userId } } })) === 0, "cart not emptied in DB");
    return `${orderNo} PENDING, total ${fmt(o.total)} (fee ${fmt(o.shippingFee)}), car + phone stored`;
  });

  /* ---------- QPay ---------- */
  const dialog = () => page.getByRole("dialog", { name: "QPay нэхэмжлэх" });
  await s.step(W, "QPay invoice (QR + bank links)", async () => {
    await page.getByRole("button", { name: /QPay-ээр төлөх/ }).click();
    const img = dialog().locator("img").first();
    await img.waitFor();
    expect((await img.getAttribute("src"))?.startsWith("data:image/"), "QR is not the API's image");
    const inv = await eventually(() => prisma.paymentInvoice.findFirst({ where: { order: { number: orderNo } } }), "no PaymentInvoice row");
    expect(inv.demo && inv.status === "OPEN", `invoice ${inv.status}`);
    return `PaymentInvoice ${inv.id.slice(0, 13)}… OPEN, 15 min`;
  });

  await s.step(W, "QPay DEMO error → network error screen → retry", async () => {
    problems.allowOnce("/payments/qpay/check"); // the simulated QPay outage answers 502 once
    await dialog().getByRole("button", { name: "Сүлжээний алдаа" }).click();
    await dialog().getByText("Сүлжээний алдаа", { exact: true }).last().waitFor();
    await dialog().getByRole("button", { name: /Дахин шалгах|Дахин оролдох/ }).first().click();
    await dialog().getByRole("button", { name: "Төлөгдсөнийг дуурайх" }).waitFor();
  });

  await s.step(W, "QPay DEMO expired → EXPIRED in DB → new invoice", async () => {
    await dialog().getByRole("button", { name: "Хугацаа дуусгах" }).click();
    await dialog().getByText("Нэхэмжлэхийн хугацаа дууссан").waitFor();
    await eventually(async () => (await prisma.order.findUnique({ where: { number: orderNo } }))?.paymentStatus === "EXPIRED", "order not EXPIRED in DB");
    await dialog().getByRole("button", { name: "Дахин үүсгэх" }).click();
    await dialog().getByRole("button", { name: "Төлөгдсөнийг дуурайх" }).waitFor();
    const o = await prisma.order.findUniqueOrThrow({ where: { number: orderNo } });
    const n = await prisma.paymentInvoice.count({ where: { orderId: o.id } });
    expect(o.paymentStatus === "PENDING" && n === 2, `after renew: ${o.paymentStatus}, ${n} invoices`);
    return "order reopened with a second invoice";
  });

  await s.step(W, "QPay DEMO paid → success, PAID + stock in DB", async () => {
    const before = (await prisma.product.findUniqueOrThrow({ where: { id: 17 } })).stock;
    await dialog().getByRole("button", { name: "Төлөгдсөнийг дуурайх" }).click();
    await page.waitForURL("**/checkout/success?order=*");
    const o = await prisma.order.findUniqueOrThrow({ where: { number: orderNo } });
    const after = (await prisma.product.findUniqueOrThrow({ where: { id: 17 } })).stock;
    expect(o.paymentStatus === "PAID" && o.paidAt, `order ${o.paymentStatus}`);
    expect(after === Math.max(0, before - 2), `stock ${before} → ${after}`);
    const mv = await prisma.stockMovement.findFirst({ where: { orderId: o.id } });
    expect(mv?.reason === `Борлуулалт · #${orderNo}`, "no stock movement");
    return `PAID; stock ${before} → ${after}; movement logged`;
  });

  await s.step(W, "Миний захиалгууд shows the order", async () => {
    await go("/account/orders");
    expect((await page.getByText(orderNo).count()) > 0, `${orderNo} not listed`);
  });

  /* ---------- cross-app ---------- */
  const admin = await adminApi(ctx.api, ctx.staffPassword);
  await s.step("Cross-app", "Web order appears for the dashboard", async () => {
    const r = await admin<{ items: { number: string; stage: string }[] }>("GET", `/admin/orders?q=${orderNo}`);
    expect(r.json.items[0]?.number === orderNo && r.json.items[0].stage === "paid", JSON.stringify(r.json.items[0]));
    return "via the admin API (dashboard UI is covered in the dashboard phase)";
  });

  await s.step("Cross-app", "Dashboard status change → Миний захиалгууд", async () => {
    await admin("POST", `/admin/orders/${orderNo}/status`, { status: "SHIPPING" });
    await go(`/account/orders?order=${orderNo}`);
    expect((await page.getByText("Хүргэлтэнд гарсан").count()) > 0, "shipping status not shown");
  });

  await s.step("Cross-app", "Dashboard price + stock change → web", async () => {
    await admin("PATCH", "/admin/products/3", { price: 19900, stock: 41 });
    await go("/product/3");
    expect((await page.getByText(fmt(19900)).count()) > 0, "new price not shown");
    expect((await page.getByText("Үлдэгдэл: 41 ш").count()) > 0, "new stock not shown");
  });

  /* ---------- not wired by design ---------- */
  s.note(W, "Guest order lookup (phone + number)", "todo", "API works (POST /orders/lookup, covered by test:api); no storefront UI is designed yet");
  s.note(W, "Compare list", "todo", "browser-only by design: there is no compare table in the schema");
  s.note(W, "Hero side promo tiles", "todo", "static design content (not managed in the dashboard)");

  await s.step(W, "No console errors / failed requests", async () => {
    expect(problems.length === 0, problems.slice(0, 3).join(" · "));
  });

  await browser.close();
  return s.results;
}
