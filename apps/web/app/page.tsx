import { BrandStrip } from "../components/home/BrandStrip";
import { CategoryGrid } from "../components/home/CategoryGrid";
import { Hero } from "../components/home/Hero";
import { VehicleFinder } from "../components/home/VehicleFinder";
import { ProductGrid } from "../components/product/ProductGrid";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  getBrands,
  getCategories,
  getFeaturedProducts,
  getProducts,
  getVehicles,
} from "../lib/api/catalog";
import { shopHref } from "../lib/site";
import styles from "./page.module.css";

export default async function HomePage() {
  const [vehicles, categories, brands, featured, products] = await Promise.all([
    getVehicles(),
    getCategories(),
    getBrands(),
    getFeaturedProducts(),
    getProducts(),
  ]);

  const fitCounts = Object.fromEntries(
    vehicles.map((v) => [v.model, products.filter((p) => p.fits.includes(v.model)).length]),
  );

  return (
    <main className={`container ${styles.home}`}>
      <VehicleFinder vehicles={vehicles} fitCounts={fitCounts} />
      <Hero />
      <section>
        <SectionHeader title="Ангилал" href={shopHref()} />
        <CategoryGrid categories={categories} />
      </section>
      <section>
        <SectionHeader
          title="Онцлох брэндүүд"
          aside="Албан ёсны дистрибьютор, баталгаат нийлүүлэлт"
        />
        <BrandStrip brands={brands} />
      </section>
      <section>
        <SectionHeader title="Онцлох бараа" href={shopHref()} />
        <ProductGrid products={featured} />
      </section>
    </main>
  );
}
