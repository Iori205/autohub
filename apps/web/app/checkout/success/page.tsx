import type { Metadata } from "next";
import { SuccessView } from "../../../components/checkout/SuccessView";

export const metadata: Metadata = { title: "Амжилттай" };

export default async function SuccessPage(props: PageProps<"/checkout/success">) {
  const { order } = await props.searchParams;
  const no = (Array.isArray(order) ? order[0] : order) ?? "";
  return <SuccessView key={no} orderNo={no} />;
}
