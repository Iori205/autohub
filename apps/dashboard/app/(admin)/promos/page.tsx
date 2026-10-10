import type { Metadata } from "next";
import { PromosView } from "../../../components/pages/promos/PromosView";

export const metadata: Metadata = { title: "Баннер & Хямдрал" };

export default function Page() {
  return <PromosView />;
}
