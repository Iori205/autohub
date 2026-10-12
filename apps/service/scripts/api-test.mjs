/*
 * End-to-end API check against a running service and a freshly seeded DB.
 * It creates orders, products etc. — run it on a dev/test database:
 *
 *   npm run db:seed && npm run dev -w service      (other terminal)
 *   npm run test:api -w service
 *
 * API_URL overrides http://localhost:4000. Staff password: SEED_ADMIN_PASSWORD or autohub123.
 */
import process from "node:process";

// eslint-disable-next-line turbo/no-undeclared-env-vars -- test script only
const API = (process.env.API_URL ?? "http://localhost:4000") + "/api/v1";
// eslint-disable-next-line turbo/no-undeclared-env-vars -- test script only
const STAFF_PW = process.env.SEED_ADMIN_PASSWORD || "autohub123";
const TODAY = "2026-10-11"; // the seed's "today"

let passed = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/** A browser-like client with its own cookie jar. */
function client(origin = "http://localhost:3000") {
  const jar = new Map();
  return async function call(method, path, body) {
    const res = await fetch(API + path, {
      method,
      headers: {
        origin,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const [k, v] = kv.split("=");
      if (/max-age=0/i.test(c)) jar.delete(k);
      else jar.set(k, v);
    }
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json, headers: res.headers, jar };
  };
}

const anon = client();

// ---------- health & CORS ----------
check("health", (await anon("GET", "/health")).status === 200);
{
  const pre = await fetch(API + "/cart", { method: "OPTIONS", headers: { origin: "http://localhost:3001", "access-control-request-method": "PUT" } });
  check("CORS preflight allowed origin", pre.status === 204 && pre.headers.get("access-control-allow-origin") === "http://localhost:3001");
  const evil = await fetch(API + "/health", { headers: { origin: "https://evil.example" } });
  check("CORS other origin gets no allow header", !evil.headers.get("access-control-allow-origin"));
}

// ---------- catalog ----------
{
  const cats = await anon("GET", "/catalog/categories");
  check("categories", cats.status === 200 && cats.json.length === 11, `${cats.json?.length}`);
  const brands = await anon("GET", "/catalog/brands");
  check("brands", brands.json?.length === 10);
  const all = await anon("GET", "/catalog/products?pageSize=100");
  check("products total 26", all.json?.total === 26, `${all.json?.total}`);
  const oem = await anon("GET", "/catalog/products?q=" + encodeURIComponent("0446547070"));
  check("search by OEM ignoring dashes", oem.json?.items?.[0]?.id === 1, JSON.stringify(oem.json?.items?.map((p) => p.id)));
  const oemPart = await anon("GET", "/catalog/products?q=43512");
  check("search by partial OEM", oemPart.json?.items?.some((p) => p.id === 17));
  const name = await anon("GET", "/catalog/products?q=" + encodeURIComponent("тоормосны"));
  check("search by name", name.json?.total >= 8, `${name.json?.total}`);
  const brake = await anon("GET", "/catalog/products?category=brake&type=orig&sort=desc");
  check(
    "filter category+type, sort desc",
    brake.json?.items?.length > 0 && brake.json.items.every((p) => p.category.slug === "brake" && p.type === "ORIGINAL") &&
      brake.json.items.every((p, i, a) => i === 0 || a[i - 1].price >= p.price),
  );
  const fit = await anon("GET", "/catalog/fitment?make=Toyota&model=" + encodeURIComponent("Land Cruiser 200") + "&year=2015");
  check("fitment LC200 2015", fit.json?.length === 12, `${fit.json?.length}`);
  const fitBad = await anon("GET", "/catalog/fitment?make=Toyota&model=Prius&year=1990");
  check("fitment out of year range is empty", fitBad.json?.length === 0);
  const detail = await anon("GET", "/catalog/products/17");
  check("product detail", detail.json?.fitments?.length > 0 && Array.isArray(detail.json?.specs) && detail.json.oemNumbers[0] === "43512-60191");
  check("product 404", (await anon("GET", "/catalog/products/9999")).status === 404);
  const bad = await anon("GET", "/catalog/products?pageSize=0");
  check("query validation 422", bad.status === 422 && bad.json?.error?.code === "VALIDATION" && bad.json.error.fields?.pageSize);
  const makes = await anon("GET", "/vehicles/options");
  const models = await anon("GET", "/vehicles/options?make=Toyota");
  const years = await anon("GET", "/vehicles/options?make=Toyota&model=Prius");
  const engines = await anon("GET", "/vehicles/options?make=Toyota&model=Prius&year=2014");
  check("vehicle finder cascade", makes.json?.makes?.includes("Toyota") && models.json?.models?.includes("Prius") && years.json?.years?.[0] === 2022 && engines.json?.engines?.length === 1);
  check("banners (active only)", (await anon("GET", "/banners")).json?.length === 2);
  const settings = await anon("GET", "/settings");
  check("public settings", settings.json?.store?.name === "AuToHub" && settings.json?.fees?.UB === 5000 && settings.json?.delivery?.freeOver === 200000);
}

// ---------- guest cart → checkout ----------
const guest = client();
let orderNo;
{
  const empty = await guest("GET", "/cart");
  check("guest session cookie", empty.jar.has("autohub_customer") && empty.json?.count === 0);
  await guest("PUT", "/cart/items/3", { qty: 2 });
  const cart = await guest("PUT", "/cart/items/7", { qty: 1 });
  check("cart lines", cart.json?.count === 3 && cart.json?.subtotal === 18500 * 2 + 128000, JSON.stringify(cart.json?.subtotal));
  check("cart unknown product 404", (await guest("PUT", "/cart/items/9999", { qty: 1 })).status === 404);
  check("cart needs JSON", (await fetch(API + "/cart/items/3", { method: "PUT", body: "qty=1", headers: { "content-type": "application/x-www-form-urlencoded" } })).status === 400);
  await guest("PUT", "/wishlist/17");
  check("wishlist", (await guest("GET", "/wishlist")).json?.[0]?.id === 17);

  const invalid = await guest("POST", "/orders", { customer: { name: "", phone: "123" }, delivery: { method: "UB" } });
  check(
    "checkout validation",
    invalid.status === 422 && invalid.json.error.fields["customer.name"] && invalid.json.error.fields["customer.phone"] && invalid.json.error.fields["delivery.district"],
    JSON.stringify(invalid.json?.error?.fields),
  );
  const order = await guest("POST", "/orders", {
    customer: { name: "Тест Хэрэглэгч", phone: "9911 0000" },
    delivery: { method: "UB", district: "Хан-Уул", khoroo: "15-р хороо", address: "45-р байр, 12 тоот" },
    car: "Toyota Prius 2014 · 2ZR-FXE 1.8 Hybrid",
  });
  orderNo = order.json?.number;
  check("order created A1025", order.status === 201 && orderNo === "A1025", `${order.status} ${orderNo}`);
  check("order pending, total incl. fee", order.json?.stage === "pending" && order.json?.shippingFee === 5000 && order.json?.total === 165000 + 5000);
  check("phone normalised on order", order.json?.customer?.phone === "99110000");
  check("invoice expiry in 15 min", Math.abs(new Date(order.json?.invoiceExpiresAt) - Date.now() - 15 * 60e3) < 60e3);
  check("cart emptied after checkout", (await guest("GET", "/cart")).json?.count === 0);
  check("my orders", (await guest("GET", "/orders")).json?.[0]?.number === orderNo);
  check("my order detail", (await guest("GET", `/orders/${orderNo}`)).status === 200);
  check("someone else's order is 404", (await client()("GET", `/orders/${orderNo}`)).status === 404);
  check("lookup by phone + number", (await anon("POST", "/orders/lookup", { phone: "99110000", number: orderNo })).json?.number === orderNo);
  check("lookup wrong phone 404", (await anon("POST", "/orders/lookup", { phone: "88887777", number: orderNo })).status === 404);

  const free = await guest("POST", "/orders", {
    customer: { name: "Тест", phone: "99110000" },
    delivery: { method: "UB", district: "СБД", khoroo: "1-р хороо", address: "Олимпийн гудамж 12" },
    items: [{ productId: 10, qty: 1 }],
  });
  check("free UB delivery from 200,000", free.json?.shippingFee === 0 && free.json?.total === 395000);
  const pickup = await guest("POST", "/orders", { customer: { name: "Тест", phone: "99110000" }, delivery: { method: "PICKUP" }, items: [{ productId: 3, qty: 1 }] });
  check("pickup is free, branch address", pickup.json?.shippingFee === 0 && pickup.json?.address.includes("Хан-Уул салбар"));
}

// ---------- customer accounts ----------
{
  const reg = await guest("POST", "/auth/register", { name: "Тест Хэрэглэгч", phone: "99110000", password: "secret12" });
  check("register upgrades guest", reg.status === 201 && reg.json?.isGuest === false);
  check("register duplicate phone 409", (await client()("POST", "/auth/register", { name: "X", phone: "99110000", password: "secret12" })).status === 409);
  await guest("POST", "/auth/logout");
  check("logged out", (await guest("GET", "/auth/me")).json === null);
  const other = client();
  await other("PUT", "/cart/items/21", { qty: 1 });
  const login = await other("POST", "/auth/login", { login: "9911-0000", password: "secret12" });
  check("login by phone", login.status === 200 && login.json?.phone === "99110000");
  check("orders kept after login", (await other("GET", "/orders")).json?.length === 3);
  check("guest cart merged into account", (await other("GET", "/cart")).json?.items?.some((l) => l.product.id === 21));
  check("bad password 401", (await client()("POST", "/auth/login", { login: "99110000", password: "nope" })).status === 401);
}

// ---------- admin ----------
const admin = client("http://localhost:3001");
const operator = client("http://localhost:3001");
{
  check("admin requires login", (await admin("GET", "/admin/orders")).status === 401);
  check("customer cookie is not staff", (await guest("GET", "/admin/orders")).status === 401);
  check("admin wrong password 401", (await admin("POST", "/admin/auth/login", { email: "admin@autohub.mn", password: "wrong" })).status === 401);
  const login = await admin("POST", "/admin/auth/login", { email: "admin@autohub.mn", password: STAFF_PW });
  check("admin login sets dashboard cookie", login.status === 200 && login.jar.has("autohub_admin_session") && login.json?.role === "ADMIN");
  check("admin me", (await admin("GET", "/admin/auth/me")).json?.email === "admin@autohub.mn");
  await operator("POST", "/admin/auth/login", { email: "operator1@autohub.mn", password: STAFF_PW });

  const ov = await admin("GET", `/admin/stats/overview?days=30&today=${TODAY}`);
  check("overview today revenue = 841,000", ov.json?.revenueToday === 841000, `${ov.json?.revenueToday}`);
  check("overview orders today 5, to process 2", ov.json?.ordersToday === 5 && ov.json?.toProcess === 2, `${ov.json?.ordersToday} ${ov.json?.toProcess}`);
  check("overview low stock 5 (2 out)", ov.json?.lowStock?.count === 5 && ov.json?.lowStock?.out === 2, JSON.stringify(ov.json?.lowStock));
  check("overview series length", ov.json?.series?.length === 30);
  const rep = await admin("GET", `/admin/stats/report?period=day&today=${TODAY}`);
  check("report today matches overview", rep.json?.rows?.at(-1)?.revenue === 841000);
  const splitSum = rep.json?.byCategory?.reduce((a, r) => a + r.value, 0);
  check("report split sums to revenue", splitSum === rep.json?.total, `${splitSum} vs ${rep.json?.total}`);

  const list = await admin("GET", "/admin/orders?stage=pending");
  check("admin orders stage filter + counts", list.json?.items?.every((o) => o.stage === "pending") && list.json?.stageCounts?.pending === list.json?.total && list.json?.all >= 482);
  const search = await admin("GET", "/admin/orders?q=99110000");
  check("admin order search by phone", search.json?.total === 3);

  const p3before = (await admin("GET", "/admin/products/3")).json.stock;
  const paid = await admin("POST", `/admin/orders/${orderNo}/status`, { status: "PAID" });
  check("mark paid", paid.json?.stage === "paid" && paid.json?.paidAt);
  check("stock deducted on payment", (await admin("GET", "/admin/products/3")).json.stock === p3before - 2);
  const moves = await admin("GET", "/admin/stock?productId=3&pageSize=1");
  check("stock movement logged", moves.json?.items?.[0]?.reason === `Борлуулалт · #${orderNo}` && moves.json.items[0].delta === -2);
  check("paid twice is 409", (await admin("POST", `/admin/orders/${orderNo}/status`, { status: "PAID" })).status === 409);
  await admin("POST", `/admin/orders/${orderNo}/status`, { status: "PREPARING" });
  const ship = await admin("POST", `/admin/orders/${orderNo}/status`, { status: "SHIPPING" });
  check("delivery status", ship.json?.stage === "shipping" && ship.json?.preparingAt && ship.json?.shippingAt);
  check("customer sees delivery update", (await guest("POST", "/auth/login", { login: "99110000", password: "secret12" })).status === 200 &&
    (await guest("GET", `/orders/${orderNo}`)).json?.deliveryStatus === "SHIPPING");
  const note = await admin("POST", `/admin/orders/${orderNo}/notes`, { text: "Туршилтын тэмдэглэл" });
  check("order note", note.json?.notes?.at(-1)?.authorName === "Ганболд Батбаяр");
  check("unpaid order can't ship", (await admin("POST", "/admin/orders/A1023/status", { status: "SHIPPING" })).status === 409);

  const p10before = (await admin("GET", "/admin/products/10")).json.stock;
  const free = (await admin("GET", "/admin/orders?q=99110000&stage=pending")).json.items.find((o) => o.total === 395000);
  await admin("POST", `/admin/orders/${free.number}/status`, { status: "PAID" });
  const cancel = await admin("POST", `/admin/orders/${free.number}/cancel`, { reason: "Бараа дууссан", comment: "Уучлаарай" });
  check("cancel paid = refunded", cancel.json?.stage === "cancelled" && cancel.json?.refunded === true);
  check("stock returned on refund", (await admin("GET", "/admin/products/10")).json.stock === p10before);
  check("cancel validation", (await admin("POST", "/admin/orders/A1022/cancel", { reason: "" })).status === 422);

  // products
  const cats = (await admin("GET", "/admin/categories")).json;
  const brands = (await admin("GET", "/admin/brands")).json;
  const veh = (await admin("GET", "/admin/vehicles?make=Toyota&model=Prius")).json;
  const created = await admin("POST", "/admin/products", {
    name: "Туршилтын бараа", brandId: brands[0].id, categoryId: cats[0].id, oemNumbers: ["TEST-001 A"], price: 10000,
    stock: 5, type: "AFTERMARKET", fitments: [{ vehicleId: veh[0].id }], specs: [{ k: "Материал", v: "Ган" }],
  });
  check("create product", created.status === 201 && created.json?.id > 26 && created.json?.fitments?.length === 1 && created.json?.stock === 5);
  check("new product searchable by OEM", (await anon("GET", "/catalog/products?q=test001")).json?.items?.[0]?.id === created.json?.id);
  const badPrice = await admin("PATCH", `/admin/products/${created.json.id}`, { oldPrice: 5000 });
  check("oldPrice must exceed price", badPrice.status === 400 && badPrice.json?.error?.fields?.oldPrice);
  const patched = await admin("PATCH", `/admin/products/${created.json.id}`, { price: 12000, stock: 8, active: false });
  check("patch product", patched.json?.price === 12000 && patched.json?.stock === 8 && patched.json?.active === false);
  check("hidden product not public", (await anon("GET", `/catalog/products/${created.json.id}`)).status === 404);
  const bulk = await admin("POST", "/admin/products/bulk", { action: "price", ids: [created.json.id], mode: "up", value: 10 });
  check("bulk price", bulk.json?.updated === 1 && (await admin("GET", `/admin/products/${created.json.id}`)).json.price === 13000);
  check("delete product", (await admin("DELETE", `/admin/products/${created.json.id}`)).status === 204);
  check("admin product filters", (await admin("GET", "/admin/products?stockLevel=out")).json?.total === 2);

  // catalog
  check("category in use can't be deleted", (await admin("DELETE", `/admin/categories/${cats.find((c) => c.slug === "brake").id}`)).status === 409);
  const cat = await admin("POST", "/admin/categories", { name: "Туршилт", slug: "test-cat", icon: "package" });
  check("create category", cat.status === 201);
  check("duplicate slug 409", (await admin("POST", "/admin/categories", { name: "Туршилт 2", slug: "test-cat", icon: "package" })).status === 409);
  check("bad slug 422", (await admin("POST", "/admin/categories", { name: "X", slug: "Bad Slug", icon: "x" })).status === 422);
  check("delete empty category", (await admin("DELETE", `/admin/categories/${cat.json.id}`)).status === 204);
  const imp = await admin("POST", "/admin/vehicles/import", { csv: "make,model,gen,year_from,year_to,engine,fuel\nToyota,Hilux,AN120,2015,2024,2GD-FTV 2.4D,Дизель\nbad,row\n" });
  check("vehicle CSV import", imp.json?.added === 1 && imp.json?.errors?.length === 1, JSON.stringify(imp.json));
  check("vehicle year validation", (await admin("POST", "/admin/vehicles", { make: "A", model: "B", yearFrom: 2020, yearTo: 2010, engine: "E", fuel: "PETROL" })).status === 422);

  // stock
  check("adjust below zero rejected", (await admin("POST", "/admin/stock/adjust", { productId: 12, delta: -1, reason: "Тест" })).status === 400);
  const adj = await admin("POST", "/admin/stock/adjust", { productId: 12, delta: 4, reason: "Шинэ орлого" });
  check("stock adjust", adj.json?.stock === 4);

  // marketing
  const banner = await admin("POST", "/admin/banners", { title: "Тест баннер", link: "/shop" });
  check("create banner", banner.status === 201 && banner.json?.sortOrder === 4);
  check("banner link validation", (await admin("POST", "/admin/banners", { title: "x", link: "shop" })).status === 422);
  const camp = await admin("POST", "/admin/campaigns", { name: "Тест", percent: 10, target: "BRAND", brandId: brands[0].id, startsAt: "2026-10-01", endsAt: "2026-10-31" });
  check("create campaign", camp.status === 201 && camp.json?.targetLabel?.startsWith("Брэнд:"));
  check("campaign date validation", (await admin("POST", "/admin/campaigns", { name: "x", percent: 10, startsAt: "2026-10-10", endsAt: "2026-10-01" })).status === 422);

  // customers
  const custs = await admin("GET", "/admin/customers");
  check("customers list sorted by spend", custs.json?.items?.length > 0 && custs.json.items.every((c, i, a) => i === 0 || a[i - 1].spent >= c.spent));
  const c1 = await admin("GET", `/admin/customers/${custs.json.items[0].id}`);
  check("customer detail with orders", c1.json?.orders?.length === c1.json?.orderCount);

  // settings & staff permissions
  const st = await admin("GET", "/admin/settings");
  check("settings never expose QPay secrets", st.json?.qpay && !("password" in st.json.qpay) && !("username" in st.json.qpay));
  check("operator can't change settings", (await operator("PUT", "/admin/settings/store", st.json.store)).status === 403);
  const store = await admin("PUT", "/admin/settings/store", { ...st.json.store, phone: "7711-2234" });
  check("admin saves settings", store.json?.phone === "7711-2234");
  await admin("PUT", "/admin/settings/store", st.json.store);
  check("settings validation", (await admin("PUT", "/admin/settings/store", { ...st.json.store, phone: "1" })).status === 422);
  const inv = await admin("POST", "/admin/staff", { name: "Шинэ ажилтан", email: "new@autohub.mn", role: "OPERATOR" });
  check("invite staff", inv.status === 201 && inv.json?.tempPassword);
  const newbie = client("http://localhost:3001");
  check("invited staff can log in", (await newbie("POST", "/admin/auth/login", { email: "new@autohub.mn", password: inv.json.tempPassword })).status === 200);
  check("operator can't invite", (await operator("POST", "/admin/staff", { name: "x", email: "x@x.mn", role: "ADMIN" })).status === 403);
  check("remove staff", (await admin("DELETE", `/admin/staff/${inv.json.id}`)).status === 204);
  check("removed staff loses access", (await newbie("GET", "/admin/auth/me")).status === 401);
  await admin("POST", "/admin/auth/logout");
  check("admin logout", (await admin("GET", "/admin/auth/me")).status === 401);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log("  ✗ " + f);
process.exitCode = failures.length ? 1 : 0;
