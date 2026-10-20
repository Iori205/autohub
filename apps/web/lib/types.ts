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

export interface Category {
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

/** Хэрэглэгчийн сонгосон машин (машин сонгогчоос). */
export interface Car {
  make: string;
  model: string;
  year: string;
  engine: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: CategoryKey;
  oem: string;
  price: number;
  oldPrice?: number;
  stock: number;
  /** true = OEM оригинал, false = аналог */
  genuine: boolean;
  /** Энэ сэлбэг тохирох машины загварууд */
  fits: string[];
  /** Тохирол баталгаажаагүй */
  fitUnknown?: boolean;
  specs: [string, string][];
  crossRefs: string[];
  /** Барааны зураг; байхгүй бол орлуулга зурна. */
  images?: string[];
}

export type FitStatus = "yes" | "no" | "unknown";

export type ProductType = "all" | "orig" | "analog";
export type SortKey = "rec" | "asc" | "desc" | "stock";

export interface ProductFilter {
  q?: string;
  categories?: CategoryKey[];
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  type?: ProductType;
  inStock?: boolean;
  /** Зөвхөн энэ загварт тохирох сэлбэг */
  fitModel?: string;
  sale?: boolean;
}

export interface CartLine {
  product: Product;
  qty: number;
}

export type DeliveryMethod = "ship" | "pickup";
export type PayStatus = "pending" | "paid" | "cancelled" | "expired";
/** 0 = эхлээгүй, 1 төлөгдсөн, 2 бэлтгэж байна, 3 хүргэлтэнд / бэлэн, 4 хүргэгдсэн / хүлээлгэн өгсөн */
export type OrderStage = 0 | 1 | 2 | 3 | 4;

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
}

export interface Invoice {
  id: string;
  created: number;
  expires: number;
}

export interface Order {
  no: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  name: string;
  phone: string;
  email?: string;
  note?: string;
  delivery: DeliveryMethod;
  address: string;
  created: number;
  payStatus: PayStatus;
  stage: OrderStage;
  invoice: Invoice;
  paidAt?: number;
  txn?: string;
}

export interface CheckoutForm {
  name: string;
  phone: string;
  email: string;
  district: string;
  khoroo: string;
  addr: string;
  note: string;
}
