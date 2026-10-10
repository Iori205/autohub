import type { Metadata } from "next";
import { CatalogView } from "../../../components/pages/catalog/CatalogView";

export const metadata: Metadata = { title: "Ангилал & Брэнд" };

export default function Page() {
  return <CatalogView />;
}
