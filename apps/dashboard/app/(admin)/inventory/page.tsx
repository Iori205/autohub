import type { Metadata } from "next";
import { InventoryView } from "../../../components/pages/inventory/InventoryView";

export const metadata: Metadata = { title: "Нөөц" };

export default function Page() {
  return <InventoryView />;
}
