/*
 * JSON shapes returned by apps/service (/api/v1). Dates are ISO strings,
 * money is whole tögrög.
 */
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

/* ---------- errors ---------- */

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

/** Every non-2xx response has this body. `fields` maps "delivery.address" → message. */
export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ---------- catalog ---------- */

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
  /** effective range: the fitment's own years or the vehicle's */
  yearFrom: number;
  yearTo: number;
}

export interface ProductSummaryDto {
  id: number;
  name: string;
  brand: { id: string; name: string };
  category: { id: string; slug: string; name: string };
  /** first = primary OEM, rest = cross-references */
  oemNumbers: string[];
  price: number;
  oldPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  type: ProductType;
  images: string[];
  fitmentUnknown: boolean;
  active: boolean;
  /** position in "Санал болгох" */
  sortOrder: number;
  /** distinct model names this part fits ("Prius", "Land Cruiser 200") */
  fitsModels: string[];
}

export interface ProductDetailDto extends ProductSummaryDto {
  description: string;
  specs: Spec[];
  fitments: FitmentDto[];
  createdAt: string;
  updatedAt: string;
}

/* ---------- cart & wishlist ---------- */

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

/* ---------- orders ---------- */

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
  /** money was received and then refunded */
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
  /** status of the current QPay invoice — CANCELLED = the customer cancelled the payment */
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

/** Admin view adds the customer account and internal notes. */
export interface AdminOrderDto extends OrderDto {
  customerId: string | null;
  notes: OrderNoteDto[];
}

/* ---------- payments (QPay) ---------- */

export interface BankLinkDto {
  name: string;
  description: string;
  /** logo image URL from QPay (empty in DEMO_MODE) */
  logo: string;
  /** deep link that opens the bank / wallet app with the invoice */
  link: string;
}

export interface QPayInvoiceDto {
  orderNumber: string;
  invoiceId: string;
  amount: number;
  /** data URL — show as <img src> */
  qrImage: string;
  qrText: string;
  shortUrl: string | null;
  urls: BankLinkDto[];
  expiresAt: string;
  /** created by DEMO_MODE, not by QPay */
  demo: boolean;
}

/** Result of polling / the callback / demo actions. */
export interface PaymentStateDto {
  orderNumber: string;
  paymentStatus: PaymentStatus;
  stage: OrderStage;
  paidAt: string | null;
  paymentId: string | null;
  invoiceExpiresAt: string | null;
  /** seconds until the invoice expires (0 when expired or paid) */
  secondsLeft: number;
}

/* ---------- users ---------- */

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
  /** sum of paid, not refunded orders */
  spent: number;
  lastOrderAt: string | null;
}

/* ---------- inventory & marketing ---------- */

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
  /** "Бүх бараа" / "Ангилал: Батарей" / "Брэнд: Brembo" */
  targetLabel: string;
  startsAt: string; // YYYY-MM-DD
  endsAt: string;
  active: boolean;
}

/* ---------- settings ---------- */

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
  /** from env — read-only in the dashboard */
  demoMode: boolean;
  callbackUrl: string;
  merchantConfigured: boolean;
}
export interface PublicSettingsDto {
  store: StoreSettings;
  delivery: DeliverySettings;
  /** what checkout charges per method for a given subtotal is in /checkout/quote */
  fees: Record<DeliveryMethod, number>;
}

/* ---------- reports ---------- */

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
  /** daily revenue for the chart (oldest first) and the previous period's total */
  series: { day: string; revenue: number }[];
  previousTotal: number;
  /** last 7 days */
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
