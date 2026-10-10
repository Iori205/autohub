import type { Metadata } from "next";
import { OrderDetailView } from "../../../../components/pages/orders/OrderDetailView";

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Захиалга #${id}` };
}

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  return <OrderDetailView id={decodeURIComponent(id)} />;
}
