"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "../../lib/api/auth";
import { setSidebarCollapsed, useSidebarCollapsed } from "../../lib/prefs";
import { LOGIN_PATH } from "../../lib/session";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import styles from "./Shell.module.css";

const DESKTOP = "(min-width: 1180px)";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const collapsed = useSidebarCollapsed();
  // Tablet/mobile: the sidebar opens temporarily and closes on navigation.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  // Client-side half of the auth guard (proxy.ts handles the request side).
  useEffect(() => {
    if (session === null) router.replace(`${LOGIN_PATH}?next=${encodeURIComponent(pathname)}`);
  }, [session, pathname, router]);

  const toggleSidebar = () => {
    if (window.matchMedia(DESKTOP).matches) setSidebarCollapsed(!collapsed);
    else setOpenOn(open ? null : pathname);
  };

  if (!session) return null;

  return (
    <div className={styles.shell} data-collapsed={collapsed} data-open={open}>
      <Sidebar onToggle={toggleSidebar} collapsed={collapsed} open={open} />
      {open && <div className={styles.scrim} onClick={() => setOpenOn(null)} />}
      <div className={styles.main}>
        <Header session={session} onMenu={toggleSidebar} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
