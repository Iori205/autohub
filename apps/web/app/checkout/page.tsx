import type { Metadata } from "next";
import { CheckoutForm } from "../../components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Захиалгын мэдээлэл" };

export default function CheckoutPage() {
  return <CheckoutForm />;
}
