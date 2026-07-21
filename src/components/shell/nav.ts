import {
  CalendarDays,
  ChartCandlestick,
  ChartLine,
  ClipboardCheck,
  LayoutGrid,
  NotebookPen,
  Settings,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/trades", label: "Trades", icon: ChartCandlestick },
  { href: "/analytics", label: "Analytics", icon: ChartLine },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/reviews", label: "Reviews", icon: ClipboardCheck },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/setups", label: "Setups", icon: Target },
  { href: "/tags", label: "Tags", icon: Tags },
];

export const SETTINGS_NAV: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

export const ALL_NAV: NavItem[] = [...MAIN_NAV, SETTINGS_NAV];
