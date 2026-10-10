import type { Metadata } from "next";
import { CustomersView } from "../../../components/pages/customers/CustomersView";

export const metadata: Metadata = { title: "Хэрэглэгчид" };

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const { c } = await searchParams;
  return <CustomersView openId={typeof c === "string" ? c : undefined} />;
}
