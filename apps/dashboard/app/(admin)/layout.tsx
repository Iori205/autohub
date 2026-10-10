import { AdminShell } from "../../components/shell/AdminShell";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <AdminShell>{children}</AdminShell>;
}
