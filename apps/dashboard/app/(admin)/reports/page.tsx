import type { Metadata } from "next";
import { ReportsView } from "../../../components/pages/reports/ReportsView";

export const metadata: Metadata = { title: "Тайлан" };

export default function Page() {
  return <ReportsView />;
}
