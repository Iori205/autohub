import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategory } from "../../../lib/api/catalog";
import { renderShop } from "../../../lib/shop-page";

export async function generateMetadata(props: PageProps<"/shop/[category]">): Promise<Metadata> {
  const cat = await getCategory((await props.params).category);
  return { title: cat?.name ?? "Дэлгүүр" };
}

export default async function CategoryPage(props: PageProps<"/shop/[category]">) {
  const cat = await getCategory((await props.params).category);
  if (!cat) notFound();
  return renderShop(await props.searchParams, { cat: cat.key });
}
