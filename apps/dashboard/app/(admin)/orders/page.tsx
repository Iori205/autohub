import type { Metadata } from "next";
import { OrdersView } from "../../../components/pages/orders/OrdersView";

export const metadata: Metadata = { title: "Захиалгууд" };

export default function OrdersPage() {
  return <OrdersView />;
}
