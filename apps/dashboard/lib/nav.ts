import {
  CarFront,
  ChartLine,
  LayoutDashboard,
  Megaphone,
  Package,
  ReceiptText,
  Settings,
  Shapes,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** «Боловсруулах» тоог харуулах */
  badge?: "orders";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Борлуулалт",
    items: [
      { href: "/", label: "Хянах самбар", icon: LayoutDashboard },
      { href: "/orders", label: "Захиалгууд", icon: ReceiptText, badge: "orders" },
      { href: "/reports", label: "Тайлан", icon: ChartLine },
    ],
  },
  {
    label: "Каталог",
    items: [
      { href: "/products", label: "Бараа", icon: Package },
      { href: "/catalog", label: "Ангилал & Брэнд", icon: Shapes },
      { href: "/vehicles", label: "Машины сан", icon: CarFront },
      { href: "/inventory", label: "Нөөц", icon: Warehouse },
    ],
  },
  {
    label: "Маркетинг",
    items: [
      { href: "/customers", label: "Хэрэглэгчид", icon: Users },
      { href: "/promos", label: "Баннер & Хямдрал", icon: Megaphone },
    ],
  },
  {
    label: "Систем",
    items: [{ href: "/settings", label: "Тохиргоо", icon: Settings }],
  },
];

export const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
