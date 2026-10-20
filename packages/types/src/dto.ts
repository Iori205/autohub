/* apps/service (/api/v1)-ийн буцаадаг JSON бүтэц. Огноо нь ISO тэмдэгт мөр, мөнгө бүхэл төгрөг. */
import type {
  CampaignTarget,
  DeliveryMethod,
  DeliveryStatus,
  Fuel,
  OrderStage,
  PaymentStatus,
  ProductType,
  Role,
  StaffRole,
} from "./enums";

/* ---------- алдаа ---------- */

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYMENT_PROVIDER"
  | "UNAVAILABLE"
  | "INTERNAL";

/** 2xx бус хариу бүр ийм body-тай. `fields` нь «delivery.address» → мессеж. */
export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ---------- каталог ---------- */

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
  countLabel: string | null;
  productCount: number;
}

export interface BrandDto {
  id: string;
  name: string;
  country: string;
  kind: ProductType;
  productCount: number;
}

export interface VehicleDto {
  id: string;
  make: string;
  model: string;
  generation: string;
  yearFrom: number;
  yearTo: number;
  engine: string;
  fuel: Fuel;
}

export interface Spec {
  k: string;
  v: string;
}

export interface FitmentDto {
  vehicleId: string;
  make: string;
  model: string;
  engine: string;
  /** бодит хүрээ: тохирлын өөрийн он эсвэл машиных */
  yearFrom: number;
  yearTo: number;
}

export interface ProductSummaryDto {
  id: number;
  name: string;
  brand: { id: string; name: string };
  category: { id: string; slug: string; name: string };
  /** эхнийх = үндсэн OEM, бусад = хөндлөн лавлагаа */
  oemNumbers: string[];
  price: number;
  oldPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  type: ProductType;
  images: string[];
  fitmentUnknown: boolean;
  active: boolean;
  /** «Санал болгох» дахь байрлал */
  sortOrder: number;
  /** энэ сэлбэг тохирох загварын нэрс («Prius», «Land Cruiser 200») */
  fitsModels: string[];
}

export interface ProductDetailDto extends ProductSummaryDto {
  description: string;
  specs: Spec[];
  fitments: FitmentDto[];
  createdAt: string;
  updatedAt: string;
}

/* ---------- сагс ба хүслийн жагсаалт ---------- */

export interface CartLineDto {
  product: ProductSummaryDto;
  qty: number;
  lineTotal: number;
}

export interface CartDto {
  items: CartLineDto[];
  count: number;
  subtotal: number;
}

/* ---------- захиалга ---------- */

export interface OrderItemDto {
  productId: number | null;
  name: string;
  oem: string | null;
  price: number;
  qty: number;
}

export interface OrderNoteDto {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface OrderDto {
  number: string;
  stage: OrderStage;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  /** мөнгө орж ирээд буцаагдсан */
  refunded: boolean;
  customer: { name: string; phone: string; email: string | null };
  deliveryMethod: DeliveryMethod;
  address: string;
  district: string | null;
  khoroo: string | null;
  note: string | null;
  car: string | null;
  items: OrderItemDto[];
  subtotal: number;
  shippingFee: number;
  total: number;
  qpayInvoiceId: string | null;
  qpayPaymentId: string | null;
  /** одоогийн QPay нэхэмжлэхийн төлөв — CANCELLED = хэрэглэгч төлбөрөө цуцалсан */
  invoiceStatus: "OPEN" | "PAID" | "CANCELLED" | "EXPIRED" | null;
  invoiceExpiresAt: string | null;
  createdAt: string;
  paidAt: string | null;
  preparingAt: string | null;
  shippingAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  expiredAt: string | null;
}

/** Админ харагдац хэрэглэгчийн бүртгэл, дотоод тэмдэглэлийг нэмнэ. */
export interface AdminOrderDto extends OrderDto {
  customerId: string | null;
  notes: OrderNoteDto[];
}

/* ---------- төлбөр (QPay) ---------- */

export interface BankLinkDto {
  name: string;
  description: string;
  /** QPay-ийн лого зургийн URL (DEMO_MODE-д хоосон) */
  logo: string;
  /** нэхэмжлэхтэйгээ банк / хэтэвчний аппыг нээх холбоос */
  link: string;
}

export interface QPayInvoiceDto {
  orderNumber: string;
  invoiceId: string;
  amount: number;
  /** data URL — <img src>-д харуулна */
  qrImage: string;
  qrText: string;
  shortUrl: string | null;
  urls: BankLinkDto[];
  expiresAt: string;
  /** QPay биш DEMO_MODE үүсгэсэн */
  demo: boolean;
}

/** Polling / callback / демо үйлдлийн үр дүн. */
export interface PaymentStateDto {
  orderNumber: string;
  paymentStatus: PaymentStatus;
  stage: OrderStage;
  paidAt: string | null;
  paymentId: string | null;
  invoiceExpiresAt: string | null;
  /** нэхэмжлэхийн хугацаа дуусах хүртэлх секунд (дууссан эсвэл төлөгдсөн бол 0) */
  secondsLeft: number;
}

/* ---------- хэрэглэгч ---------- */

export interface CustomerSessionDto {
  id: string;
  isGuest: boolean;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface StaffDto {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  lastSeenAt: string | null;
}

export interface SavedCarDto {
  make: string;
  model: string;
  year: number;
  engine: string;
}

export interface CustomerDto {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isGuest: boolean;
  createdAt: string;
  cars: SavedCarDto[];
  orderCount: number;
  /** төлөгдсөн, буцаагдаагүй захиалгын нийлбэр */
  spent: number;
  lastOrderAt: string | null;
}

/* ---------- нөөц ба маркетинг ---------- */

export interface StockMovementDto {
  id: string;
  productId: number;
  productName: string;
  delta: number;
  reason: string;
  orderNumber: string | null;
  actorName: string;
  stockAfter: number;
  createdAt: string;
}

export interface BannerDto {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
}

export interface CampaignDto {
  id: string;
  name: string;
  percent: number;
  target: CampaignTarget;
  categoryId: string | null;
  brandId: string | null;
  /** «Бүх бараа» / «Ангилал: Батарей» / «Брэнд: Brembo» */
  targetLabel: string;
  startsAt: string; // YYYY-MM-DD
  endsAt: string;
  active: boolean;
}

/* ---------- тохиргоо ---------- */

export interface StoreSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
}
export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  eta: string;
  active: boolean;
}
export interface DeliverySettings {
  zones: DeliveryZone[];
  freeOver: number;
}
export interface QPaySettingsDto {
  invoiceCode: string;
  env: "sandbox" | "production";
  /** env-ээс — самбарт зөвхөн уншигдана */
  demoMode: boolean;
  callbackUrl: string;
  merchantConfigured: boolean;
}
export interface PublicSettingsDto {
  store: StoreSettings;
  delivery: DeliverySettings;
  /** checkout-ын бодит хүргэлтийн төлбөрийг сервис захиалга үүсгэхдээ тооцно */
  fees: Record<DeliveryMethod, number>;
}

/* ---------- тайлан ---------- */

export interface OverviewDto {
  today: string;
  revenueToday: number;
  revenueYesterday: number;
  paidToday: number;
  ordersToday: number;
  ordersYesterday: number;
  pending: { count: number; today: number; amount: number };
  lowStock: { count: number; out: number; yesterday: number };
  toProcess: number;
  /** графикийн өдрийн орлого (хуучин нь эхэнд) ба өмнөх үеийн нийт дүн */
  series: { day: string; revenue: number }[];
  previousTotal: number;
  /** сүүлийн 7 хоног */
  stageCounts: Record<OrderStage, number>;
  topCategories: { name: string; revenue: number }[];
  topProducts: { productId: number; name: string; brand: string; oem: string | null; qty: number; revenue: number }[];
}

export interface ReportRowDto {
  label: string;
  short: string;
  from: string;
  to: string;
  orders: number;
  revenue: number;
}
export interface SplitRowDto {
  name: string;
  value: number;
  share: number;
}
export interface ReportDto {
  period: "day" | "week" | "month";
  rows: ReportRowDto[];
  total: number;
  orders: number;
  byCategory: SplitRowDto[];
  byBrand: SplitRowDto[];
}

export type { Role };
