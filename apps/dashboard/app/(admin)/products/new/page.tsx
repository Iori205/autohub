import type { Metadata } from "next";
import { ProductEditView } from "../../../../components/pages/products/ProductEditView";

export const metadata: Metadata = { title: "Шинэ бараа" };

export default function NewProductPage() {
  return <ProductEditView />;
}
