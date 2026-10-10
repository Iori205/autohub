import type { Metadata } from "next";
import { ProductsView } from "../../../components/pages/products/ProductsView";

export const metadata: Metadata = { title: "Бараа" };

export default function ProductsPage() {
  return <ProductsView />;
}
