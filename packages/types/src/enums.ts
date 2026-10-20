// packages/db-ийн Prisma enum-ийн хуулбар (frontend-д Prisma клиент хэрэггүй байхын тулд
// энгийн union хэлбэрээр).

export const ROLES = ["CUSTOMER", "OPERATOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export type StaffRole = Exclude<Role, "CUSTOMER">;

export const PRODUCT_TYPES = ["ORIGINAL", "AFTERMARKET"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const FUELS = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const;
export type Fuel = (typeof FUELS)[number];

export const DELIVERY_METHODS = ["UB", "PICKUP", "COUNTRY"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "CANCELLED", "EXPIRED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_STATUSES = ["NONE", "PREPARING", "SHIPPING", "DELIVERED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const CAMPAIGN_TARGETS = ["ALL", "CATEGORY", "BRAND"] as const;
export type CampaignTarget = (typeof CAMPAIGN_TARGETS)[number];

export const SETTING_KEYS = ["store", "delivery", "qpay"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * Самбарын нэгдсэн захиалгын төлөв, төлбөр + хүргэлтээс гаргана:
 * pending, paid (хүлээж буй), preparing, shipping, delivered, cancelled, expired.
 */
export const ORDER_STAGES = ["pending", "paid", "preparing", "shipping", "delivered", "cancelled", "expired"] as const;
export type OrderStage = (typeof ORDER_STAGES)[number];

export function orderStage(o: { paymentStatus: PaymentStatus; deliveryStatus: DeliveryStatus }): OrderStage {
  if (o.paymentStatus === "PENDING") return "pending";
  if (o.paymentStatus === "CANCELLED") return "cancelled";
  if (o.paymentStatus === "EXPIRED") return "expired";
  if (o.deliveryStatus === "PREPARING") return "preparing";
  if (o.deliveryStatus === "SHIPPING") return "shipping";
  if (o.deliveryStatus === "DELIVERED") return "delivered";
  return "paid";
}
