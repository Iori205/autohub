import type { Metadata } from "next";
import { OrdersView } from "../../../components/orders/OrdersView";

export const metadata: Metadata = { title: "Миний захиалгууд" };

export default async function OrdersPage(props: PageProps<"/account/orders">) {
  const { order } = await props.searchParams;
  const no = Array.isArray(order) ? order[0] : order;
  return <OrdersView key={no ?? ""} initialNo={no} />;
}
