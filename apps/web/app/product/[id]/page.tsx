import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "../../../components/product/ProductDetail";
import { ProductGrid } from "../../../components/product/ProductGrid";
import {
  categoryName,
  getCategories,
  getProduct,
  getProducts,
  getRelatedProducts,
  getVehicles,
} from "../../../lib/api/catalog";
import styles from "./page.module.css";

export async function generateMetadata(props: PageProps<"/product/[id]">): Promise<Metadata> {
  const p = await getProduct(Number((await props.params).id));
  return { title: p?.name ?? "Бараа" };
}

export default async function ProductPage(props: PageProps<"/product/[id]">) {
  const id = Number((await props.params).id);
  const [product, categories, vehicles, related] = await Promise.all([
    getProduct(id),
    getCategories(),
    getVehicles(),
    getRelatedProducts(id),
  ]);
  if (!product) notFound();

  const fitRows = product.fits
    .map((m) => vehicles.find((v) => v.model === m))
    .filter((v) => !!v);

  return (
    <main className={`container ${styles.page}`}>
      <ProductDetail
        key={product.id}
        product={product}
        categoryName={categoryName(categories, product.category)}
        fitRows={fitRows}
      />
      <section>
        <h2 className="section-title" style={{ marginBottom: 18 }}>
          Хамт авдаг бараа
        </h2>
        <ProductGrid products={related} />
      </section>
    </main>
  );
}
