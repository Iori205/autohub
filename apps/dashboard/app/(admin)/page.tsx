import type { Metadata } from "next";
import { DashboardView } from "../../components/pages/dashboard/DashboardView";

export const metadata: Metadata = { title: "Хянах самбар" };

export default function DashboardPage() {
  return <DashboardView />;
}
