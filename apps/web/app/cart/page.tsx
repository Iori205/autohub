import type { Metadata } from "next";
import { CartView } from "../../components/checkout/CartView";

export const metadata: Metadata = { title: "Миний сагс" };

export default function CartPage() {
  return <CartView />;
}
