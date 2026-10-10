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

/** The customer's selected car (from the vehicle finder). */
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
  /** true = OEM original, false = aftermarket analog */
  genuine: boolean;
  /** Vehicle model names this part fits */
  fits: string[];
  /** Fitment not verified */
  fitUnknown?: boolean;
  specs: [string, string][];
  crossRefs: string[];
  /** Real product images arrive with the API; placeholders are drawn until then. */
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
  /** Only parts that fit this model */
  fitModel?: string;
  sale?: boolean;
}

export interface CartLine {
  product: Product;
  qty: number;
}

export type DeliveryMethod = "ship" | "pickup";
export type PayStatus = "pending" | "paid" | "cancelled" | "expired";
/** 0 = not started, 1 paid, 2 preparing, 3 out for delivery / ready, 4 delivered / handed over */
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
