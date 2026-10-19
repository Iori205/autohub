/* ---------- Admin domain ---------- */

export type IconKey =
  | "cog"
  | "disc"
  | "wrench"
  | "filter"
  | "droplet"
  | "lightbulb"
  | "battery"
  | "wheel"
  | "car"
  | "armchair"
  | "package"
  | "snowflake"
  | "fuel"
  | "zap";

export interface Category {
  id: string;
  /** Also the storefront URL slug: /shop/{key} */
  key: string;
  name: string;
  icon: IconKey;
}

export type BrandKind = "oem" | "aftermarket";

export interface Brand {
  id: string;
  name: string;
  country: string;
  kind: BrandKind;
}

export interface Spec {
  k: string;
  v: string;
}

export interface Fitment {
  make: string;
  model: string;
  /** "2015" or a range "2008–2021" */
  years: string;
  /** "" = every engine of that model */
  engine: string;
  /** set for fitments loaded from the API (picker rows get it on save) */
  vehicleId?: string;
  yearFrom?: number;
  yearTo?: number;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  /** First is the primary OEM number, the rest are cross-references */
  oem: string[];
  price: number;
  oldPrice: number | null;
  stock: number;
  /** Low-stock threshold */
  threshold: number;
  genuine: boolean;
  active: boolean;
  description: string;
  specs: Spec[];
  fits: Fitment[];
  images: string[];
}

export type Fuel = "Бензин" | "Дизель" | "Хайбрид" | "Цахилгаан";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  gen: string;
  yearFrom: number;
  yearTo: number;
  engine: string;
  fuel: Fuel;
  /** products that list this vehicle as a fitment */
  productCount: number;
}

export interface CustomerCar {
  make: string;
  model: string;
  year: string;
  engine: string;
}

export interface Customer {
  id: string;
  /** checked out without an account */
  isGuest: boolean;
  name: string;
  phone: string;
  email: string;
  /** YYYY-MM-DD */
  registeredAt: string;
  address: string;
  cars: CustomerCar[];
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "expired";

export type DeliveryKind = "ub" | "pickup" | "country";

export interface OrderItem {
  /** 0 when the product was deleted later */
  productId: number;
  /** Snapshot at order time */
  name: string;
  oem: string | null;
  price: number;
  qty: number;
}

export interface OrderNote {
  text: string;
  by: string;
  /** YYYY-MM-DD HH:mm */
  at: string;
}

export interface Order {
  id: string;
  /** YYYY-MM-DD HH:mm (Ulaanbaatar local time) */
  createdAt: string;
  customerId: string;
  /** contact details as entered at checkout */
  customer: { name: string; phone: string; email: string | null };
  /** car chosen on the storefront ("Toyota Prius 2014 · 2ZR-FXE") */
  car: string | null;
  /** customer's note at checkout */
  note: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  delivery: DeliveryKind;
  address: string;
  status: OrderStatus;
  /** Money was received (stays true after a refund-cancel) */
  paid: boolean;
  invoiceId: string | null;
  paymentId: string | null;
  cancelReason: string | null;
  /** When each status was reached, YYYY-MM-DD HH:mm */
  times: Partial<Record<OrderStatus, string>>;
  notes: OrderNote[];
}

export interface StockMove {
  id: string;
  /** YYYY-MM-DD HH:mm */
  at: string;
  productId: number;
  productName: string;
  delta: number;
  reason: string;
  by: string;
  after: number;
}

export interface Banner {
  id: string;
  /** small label above the title on the home hero ("Хямдрал −20%") */
  eyebrow: string;
  title: string;
  sub: string;
  /** button text on the hero */
  cta: string;
  link: string;
  order: number;
  active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  pct: number;
  /** "Бүх бараа" | "Ангилал: …" | "Брэнд: …" */
  target: string;
  categoryId: string | null;
  brandId: string | null;
  from: string;
  to: string;
  active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  eta: string;
  active: boolean;
}

export interface StoreSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
}

/** Read-only: merchant credentials, environment and DEMO_MODE come from the service's .env */
export interface QPaySettings {
  invoiceCode: string;
  env: "sandbox" | "production";
  demo: boolean;
  callbackUrl: string;
  merchantConfigured: boolean;
}

export interface Settings {
  store: StoreSettings;
  zones: DeliveryZone[];
  freeOver: number;
  qpay: QPaySettings;
}

export type AdminRole = "admin" | "operator";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastSeen: string;
}

export interface Db {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  vehicles: Vehicle[];
  customers: Customer[];
  orders: Order[];
  stockLog: StockMove[];
  banners: Banner[];
  campaigns: Campaign[];
  settings: Settings;
  admins: AdminUser[];
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
}
