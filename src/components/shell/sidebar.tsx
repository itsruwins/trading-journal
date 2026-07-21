"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/src/components/logo";
import { MAIN_NAV, type NavItem } from "./nav";

/* Collapse choreography: the rail width animates on an expo-out curve while
   icons keep a fixed x-position (identical padding in both states, so the
   64px rail centers them by geometry, not by re-alignment). Labels fade out
   immediately on collapse and fade back in only after the width has opened
   (transition-delay), never reflowing mid-flight. */

const LABEL_FADE = "whitespace-nowrap transition-opacity duration-150 ease-out motion-reduce:transition-none";

function labelState(collapsed: boolean): string {
  return collapsed ? "opacity-0" : "opacity-100 delay-100";
}

function NavLink({
  item,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`flex h-9 items-center gap-3 rounded-md px-3 text-[14px] transition-colors duration-150 ease-out ${
        active
          ? "bg-selected font-medium text-ink"
          : "text-muted hover:bg-hover hover:text-ink"
      }`}
    >
      <Icon
        className={`size-4 shrink-0 ${active ? "text-ink" : "text-faint"}`}
        aria-hidden="true"
      />
      <span className={`${LABEL_FADE} ${labelState(collapsed)}`}>
        {item.label}
      </span>
    </Link>
  );
}

export function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="Main"
      className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
    >
      {MAIN_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-edge bg-shell transition-[width] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:flex ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-edge px-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-10 items-center gap-2.5 rounded-md px-1.5 transition-[background-color,transform] duration-150 ease-out hover:bg-hover active:scale-[0.98]"
        >
          <Logo compact />
          <span
            className={`text-[15px] font-semibold tracking-[-0.01em] text-ink ${LABEL_FADE} ${labelState(
              collapsed,
            )}`}
          >
            Trading Journal
          </span>
        </button>
      </div>
      <NavLinks collapsed={collapsed} />
    </aside>
  );
}
