import type { Metadata } from "next";
import { VehiclesView } from "../../../components/pages/catalog/VehiclesView";

export const metadata: Metadata = { title: "Машины сан" };

export default function Page() {
  return <VehiclesView />;
}
