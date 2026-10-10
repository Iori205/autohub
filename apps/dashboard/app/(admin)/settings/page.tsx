import type { Metadata } from "next";
import { SettingsView } from "../../../components/pages/settings/SettingsView";
import { isSettingsTab } from "../../../lib/settings-tabs";

export const metadata: Metadata = { title: "Тохиргоо" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { tab } = await searchParams;
  return <SettingsView tab={isSettingsTab(tab) ? tab : "store"} />;
}
