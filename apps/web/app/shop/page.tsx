import type { Metadata } from "next";
import { renderShop } from "../../lib/shop-page";

export const metadata: Metadata = { title: "Дэлгүүр" };

export default async function ShopPage(props: PageProps<"/shop">) {
  return renderShop(await props.searchParams);
}
