/*
 * Request bodies and query strings, validated with zod on the server
 * (apps/service) and reusable for form validation in the frontends.
 * Messages are in Mongolian because the UI shows them as-is.
 */
import { z } from "zod";
import {
  CAMPAIGN_TARGETS,
  DELIVERY_METHODS,
  FUELS,
  PAYMENT_STATUSES,
  PRODUCT_TYPES,
} from "./enums";

/** 8-digit Mongolian number; spaces and dashes are ignored ("9911 2233" → "99112233"). */
export const phone = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{8}$/, "8 оронтой утасны дугаар оруулна уу"));

const trimmed = (max = 200) => z.string().trim().max(max);
const required = (msg: string, max = 200) => z.string().trim().min(1, msg).max(max);
const email = z.string().trim().toLowerCase().email("Зөв и-мэйл хаяг оруулна уу");
const password = z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт").max(200);
const money = z.coerce.number().int("Бүхэл тоо оруулна уу").min(0, "0-ээс бага байж болохгүй").max(1_000_000_000);
const qty = z.coerce.number().int().min(1).max(999);
const id = z.string().min(1).max(64);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Огноо YYYY-MM-DD хэлбэртэй байна");
/** "1", "true" → true; anything else → false; missing → undefined */
const flag = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === true || v === "1" || v === "true"));
/** Comma separated or repeated query value → string[] */
const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? undefined : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean)));

/* ---------- catalog (public) ---------- */

export const productQuery = z.object({
  /** name or OEM number (spaces/dashes ignored for OEM) */
  q: trimmed(100).optional(),
  category: list,
  brand: list,
  type: z.enum(["all", "orig", "analog"]).optional(),
  inStock: flag,
  sale: flag,
  priceMin: money.optional(),
  priceMax: money.optional(),
  /** fitment: a vehicle row id, or make/model(/year/engine) */
  vehicleId: id.optional(),
  make: trimmed(60).optional(),
  model: trimmed(80).optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  engine: trimmed(80).optional(),
  sort: z.enum(["rec", "asc", "desc", "stock"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});
export type ProductQuery = z.infer<typeof productQuery>;

export const vehicleQuery = z.object({
  make: trimmed(60).optional(),
  model: trimmed(80).optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
});

/* ---------- cart & wishlist ---------- */

export const cartItemInput = z.object({ qty });
export const cartReplaceInput = z.object({
  items: z.array(z.object({ productId: z.coerce.number().int().positive(), qty })).max(100),
});

/* ---------- checkout ---------- */

export const createOrderInput = z
  .object({
    customer: z.object({
      name: required("Нэрээ оруулна уу", 100),
      phone,
      email: email.optional().or(z.literal("").transform(() => undefined)),
    }),
    delivery: z.object({
      method: z.enum(DELIVERY_METHODS),
      district: trimmed(60).optional(),
      khoroo: trimmed(60).optional(),
      address: trimmed(300).optional(),
    }),
    note: trimmed(500).optional(),
    /** Customer's selected car, shown to staff ("Toyota Prius 2014 · 2ZR-FXE") */
    car: trimmed(150).optional(),
    /** Omit to order the session cart */
    items: z.array(z.object({ productId: z.coerce.number().int().positive(), qty })).min(1).max(100).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.delivery.method === "PICKUP") return;
    if (v.delivery.method === "UB") {
      if (!v.delivery.district) ctx.addIssue({ code: "custom", path: ["delivery", "district"], message: "Дүүрэг сонгоно уу" });
      if (!v.delivery.khoroo) ctx.addIssue({ code: "custom", path: ["delivery", "khoroo"], message: "Хороо сонгоно уу" });
    }
    if (!v.delivery.address || v.delivery.address.length < 5)
      ctx.addIssue({ code: "custom", path: ["delivery", "address"], message: "Дэлгэрэнгүй хаягаа оруулна уу" });
  });
export type CreateOrderInput = z.infer<typeof createOrderInput>;

/** Guest order lookup: both the phone on the order and its number are required. */
export const orderLookupInput = z.object({
  phone,
  number: z.string().trim().toUpperCase().regex(/^A\d+$/, "Захиалгын дугаар буруу байна"),
});

/* ---------- payments ---------- */

export const paymentInput = z.object({
  number: z.string().trim().toUpperCase().regex(/^A\d+$/, "Захиалгын дугаар буруу байна"),
});

/* ---------- auth ---------- */

export const registerInput = z.object({
  name: required("Нэрээ оруулна уу", 100),
  phone,
  email: email.optional(),
  password,
});
export const loginInput = z.object({
  /** phone number or e-mail */
  login: required("Утас эсвэл и-мэйлээ оруулна уу", 120),
  password: z.string().min(1, "Нууц үгээ оруулна уу").max(200),
});
export const adminLoginInput = z.object({
  email,
  password: z.string().min(1, "Нууц үгээ оруулна уу").max(200),
  remember: z.boolean().optional(),
});

/* ---------- admin: catalog ---------- */

export const specInput = z.object({ k: trimmed(80), v: trimmed(200) });
export const fitmentInput = z.object({
  vehicleId: id,
  yearFrom: z.number().int().min(1950).max(2100).nullable().optional(),
  yearTo: z.number().int().min(1950).max(2100).nullable().optional(),
});

export const productInput = z
  .object({
    name: required("Барааны нэр оруулна уу"),
    description: trimmed(5000).default(""),
    brandId: id,
    categoryId: id,
    oemNumbers: z.array(trimmed(60).min(1)).min(1, "Хамгийн багадаа 1 OEM дугаар оруулна уу").max(30),
    price: money.refine((n) => n > 0, "Үнэ 0-ээс их байх ёстой"),
    oldPrice: money.nullable().optional(),
    stock: z.coerce.number().int().min(0, "Нөөцийн тоо оруулна уу"),
    lowStockThreshold: z.coerce.number().int().min(0).default(3),
    type: z.enum(PRODUCT_TYPES),
    images: z.array(z.string().max(2_000_000)).max(8).default([]),
    specs: z.array(specInput).max(40).default([]),
    fitmentUnknown: z.boolean().default(false),
    sortOrder: z.number().int().optional(),
    active: z.boolean().default(true),
    fitments: z.array(fitmentInput).max(500).default([]),
  })
  .refine((p) => p.oldPrice == null || p.oldPrice > p.price, {
    path: ["oldPrice"],
    message: "Хуучин үнэ одоогийн үнээс их байх ёстой",
  });
export const productPatch = z
  .object({
    name: required("Барааны нэр оруулна уу"),
    description: trimmed(5000),
    brandId: id,
    categoryId: id,
    oemNumbers: z.array(trimmed(60).min(1)).min(1, "Хамгийн багадаа 1 OEM дугаар оруулна уу").max(30),
    price: money.refine((n) => n > 0, "Үнэ 0-ээс их байх ёстой"),
    oldPrice: money.nullable(),
    stock: z.coerce.number().int().min(0),
    lowStockThreshold: z.coerce.number().int().min(0),
    type: z.enum(PRODUCT_TYPES),
    images: z.array(z.string().max(2_000_000)).max(8),
    specs: z.array(specInput).max(40),
    fitmentUnknown: z.boolean(),
    sortOrder: z.number().int(),
    active: z.boolean(),
    fitments: z.array(fitmentInput).max(500),
  })
  .partial();
export type ProductInput = z.infer<typeof productInput>;

export const productBulkInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate"), ids: z.array(z.number().int()).min(1) }),
  z.object({ action: z.literal("hide"), ids: z.array(z.number().int()).min(1) }),
  z.object({ action: z.literal("delete"), ids: z.array(z.number().int()).min(1) }),
  z.object({
    action: z.literal("price"),
    ids: z.array(z.number().int()).min(1),
    mode: z.enum(["up", "down", "fixed"]),
    value: z.number().positive(),
  }),
  z.object({
    action: z.literal("stock"),
    ids: z.array(z.number().int()).min(1),
    mode: z.enum(["add", "set"]),
    value: z.number().int().min(0),
  }),
]);

export const adminProductQuery = productQuery.extend({
  stockLevel: z.enum(["ok", "low", "out"]).optional(),
  active: flag,
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});

export const categoryInput = z.object({
  name: required("Нэр оруулна уу", 80),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Зөвхөн латин жижиг үсэг, тоо, зураас"),
  icon: z.string().trim().min(1).max(40),
  sortOrder: z.number().int().optional(),
  countLabel: trimmed(40).nullable().optional(),
});
export const brandInput = z.object({
  name: required("Нэр оруулна уу", 80),
  country: trimmed(60).default(""),
  kind: z.enum(PRODUCT_TYPES).default("AFTERMARKET"),
});
/** Field rules without the cross-field check (for partial updates). */
export const vehicleFields = z.object({
  make: required("Үйлдвэрлэгч оруулна уу", 60),
  model: required("Загвар оруулна уу", 80),
  generation: trimmed(60).default(""),
  yearFrom: z.coerce.number().int().min(1980, "1980-аас хойшхи он"),
  yearTo: z.coerce.number().int().max(2100),
  engine: required("Хөдөлгүүр оруулна уу", 80),
  fuel: z.enum(FUELS),
});
export const vehicleInput = vehicleFields
  .refine((v) => v.yearTo >= v.yearFrom, { path: ["yearTo"], message: "Дуусах он эхлэх оноос хойш байх ёстой" });
export const vehicleImportInput = z.object({ csv: z.string().min(1).max(10_000_000) });

/* ---------- admin: inventory ---------- */

export const stockAdjustInput = z.object({
  productId: z.number().int().positive(),
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "0-ээс өөр тоо оруулна уу"),
  reason: required("Шалтгаан сонгоно уу", 200),
});
export const stockQuery = z.object({
  productId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

/* ---------- admin: orders ---------- */

export const adminOrderQuery = z.object({
  stage: z.enum(["all", "pending", "paid", "preparing", "shipping", "delivered", "cancelled", "expired"]).default("all"),
  q: trimmed(100).optional(),
  payment: z.enum(PAYMENT_STATUSES).optional(),
  refunded: flag,
  delivery: z.enum(DELIVERY_METHODS).optional(),
  from: day.optional(),
  to: day.optional(),
  customerId: id.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});
export const orderStatusInput = z.object({
  /** Move along the flow: PAID (manual payment), PREPARING, SHIPPING, DELIVERED */
  status: z.enum(["PAID", "PREPARING", "SHIPPING", "DELIVERED", "PENDING", "EXPIRED"]),
});
export const orderBulkStatusInput = orderStatusInput.extend({
  numbers: z.array(z.string()).min(1).max(500),
});
export const orderCancelInput = z.object({
  reason: required("Цуцлах шалтгаан сонгоно уу", 200),
  comment: required("Тайлбар оруулна уу", 1000),
});
export const orderNoteInput = z.object({ text: required("Тэмдэглэл хоосон байна", 2000) });

/* ---------- admin: marketing & settings ---------- */

export const bannerInput = z.object({
  title: required("Гарчиг оруулна уу", 150),
  subtitle: trimmed(200).default(""),
  link: z
    .string()
    .trim()
    .refine((s) => s.startsWith("/") || /^https?:\/\//.test(s), "“/” эсвэл “http”-ээр эхлэх ёстой"),
  imageUrl: z.string().max(2_000_000).nullable().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().default(true),
});
export const campaignInput = z
  .object({
    name: required("Нэр оруулна уу", 120),
    percent: z.coerce.number().int().min(1, "1–90 хооронд").max(90, "1–90 хооронд"),
    target: z.enum(CAMPAIGN_TARGETS).default("ALL"),
    categoryId: id.nullable().optional(),
    brandId: id.nullable().optional(),
    startsAt: day,
    endsAt: day,
    active: z.boolean().default(true),
  })
  .refine((c) => c.endsAt >= c.startsAt, { path: ["endsAt"], message: "Дуусах огноо эхлэхээс хойш" })
  .refine((c) => c.target !== "CATEGORY" || !!c.categoryId, { path: ["categoryId"], message: "Ангилал сонгоно уу" })
  .refine((c) => c.target !== "BRAND" || !!c.brandId, { path: ["brandId"], message: "Брэнд сонгоно уу" });

export const storeSettingsInput = z.object({
  name: required("Нэр оруулна уу", 80),
  phone: z
    .string()
    .trim()
    .regex(/^\d{4}-?\d{4}$/, "8 оронтой утасны дугаар (жишээ: 7711-2233)"),
  email: email.or(z.literal("")),
  address: trimmed(300),
  hours: trimmed(120),
});
export const deliverySettingsInput = z.object({
  zones: z
    .array(
      z.object({
        id: id,
        name: required("Бүсийн нэр оруулна уу", 80),
        fee: money,
        eta: trimmed(60),
        active: z.boolean(),
      }),
    )
    .max(30),
  freeOver: money,
});
/** Non-secret QPay options; merchant credentials live in env. */
export const qpaySettingsInput = z.object({
  invoiceCode: trimmed(80),
  env: z.enum(["sandbox", "production"]),
});

export const staffInviteInput = z.object({
  name: required("Нэр оруулна уу", 100),
  email,
  role: z.enum(["OPERATOR", "ADMIN"]),
});
export const staffRoleInput = z.object({ role: z.enum(["OPERATOR", "ADMIN"]) });

export const customerQuery = z.object({
  q: trimmed(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const reportQuery = z.object({
  period: z.enum(["day", "week", "month"]).default("month"),
  /** Reference "today" (defaults to the server's date) */
  today: day.optional(),
});
export const overviewQuery = z.object({
  days: z.coerce.number().int().refine((n) => [7, 30, 90].includes(n)).default(30),
  today: day.optional(),
});
