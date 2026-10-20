// Seed-ийн mock өгөгдөл (ямар ч апп импортлохгүй).
/* ---------- Дэлгүүрийн бүтэц (apps/web/lib/types.ts-тэй ижил) ---------- */

export type CategoryKey =
  | "engine"
  | "brake"
  | "susp"
  | "filter"
  | "oil"
  | "elec"
  | "battery"
  | "wheel"
  | "body"
  | "interior"
  | "acc";

export interface StoreCategory {
  key: CategoryKey;
  name: string;
  countLabel: string;
}

export interface VehicleModel {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  engines: string[];
}

export interface StoreProduct {
  id: number;
  name: string;
  brand: string;
  category: CategoryKey;
  oem: string;
  price: number;
  oldPrice?: number;
  stock: number;
  genuine: boolean;
  fits: string[];
  fitUnknown?: boolean;
  specs: [string, string][];
  crossRefs: string[];
  images?: string[];
}

/* ---------- Админ домэйн ---------- */

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
  /** Дэлгүүрийн URL slug ч мөн: /shop/{key} */
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
  /** «2015» эсвэл «2008–2021» хүрээ */
  years: string;
  /** "" = тухайн загварын бүх хөдөлгүүр */
  engine: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  /** Эхнийх нь үндсэн OEM дугаар, бусад нь хөндлөн лавлагаа */
  oem: string[];
  price: number;
  oldPrice: number | null;
  stock: number;
  /** Нөөц багассаны босго */
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
}

export interface CustomerCar {
  make: string;
  model: string;
  year: string;
  engine: string;
}

export interface Customer {
  id: string;
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
  productId: number;
  /** Захиалгын үеийн хуулбар */
  name: string;
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
  /** YYYY-MM-DD HH:mm (Улаанбаатарын цаг) */
  createdAt: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  delivery: DeliveryKind;
  address: string;
  status: OrderStatus;
  /** Мөнгө орсон (буцаалттай цуцлалтын дараа ч true хэвээр) */
  paid: boolean;
  invoiceId: string;
  paymentId: string | null;
  /** Төлөв бүрт хүрсэн цаг, YYYY-MM-DD HH:mm */
  times: Partial<Record<OrderStatus, string>>;
  notes: OrderNote[];
}

export interface StockMove {
  id: string;
  /** YYYY-MM-DD HH:mm */
  at: string;
  productId: number;
  delta: number;
  reason: string;
  by: string;
  after: number;
}

export interface Banner {
  id: string;
  title: string;
  sub: string;
  link: string;
  order: number;
  active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  pct: number;
  /** «Бүх бараа» | «Ангилал: …» | «Брэнд: …» */
  target: string;
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

export interface QPaySettings {
  username: string;
  password: string;
  invoiceCode: string;
  env: "sandbox" | "production";
  demo: boolean;
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
