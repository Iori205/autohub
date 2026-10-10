import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductEditView } from "../../../../components/pages/products/ProductEditView";

export const metadata: Metadata = { title: "Бараа засах" };

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ProductEditView id={id} />;
}
