import type { Metadata } from "next";
import { PaymentView } from "../../../components/checkout/PaymentView";

export const metadata: Metadata = { title: "Төлбөр төлөх" };

export default async function PaymentPage(props: PageProps<"/checkout/payment">) {
  const { order } = await props.searchParams;
  const no = (Array.isArray(order) ? order[0] : order) ?? "";
  return <PaymentView key={no} orderNo={no} />;
}
