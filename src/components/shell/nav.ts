import {
  ChartCandlestick,
  LayoutGrid,
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

/* Nav is ordered by how often a destination is opened, not by feature weight.
   Dashboard/Trades/Accounts are daily; Setups and Tags are vocabulary you
   define once and then consume inside the trade form, so they live one level
   down under "More" rather than competing for a top-level slot. */

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/trades", label: "Trades", icon: ChartCandlestick },
  { href: "/accounts", label: "Accounts", icon: Wallet },
];

export const MORE_NAV: NavItem[] = [
  { href: "/setups", label: "Setups", icon: Target },
  { href: "/tags", label: "Tags", icon: Tags },
];

export const SETTINGS_NAV: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

/** Every routable destination — the Topbar resolves its title from this. */
export const ALL_NAV: NavItem[] = [...MAIN_NAV, ...MORE_NAV, SETTINGS_NAV];

/** A nav item owns its own sub-routes, so /trades/[id] still lights up Trades. */
export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
