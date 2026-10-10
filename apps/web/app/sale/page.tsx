import type { Metadata } from "next";
import { renderShop } from "../../lib/shop-page";

export const metadata: Metadata = { title: "Хямдрал" };

export default async function SalePage(props: PageProps<"/sale">) {
  return renderShop(await props.searchParams, { sale: true });
}
