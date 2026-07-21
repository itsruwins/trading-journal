"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/src/components/logo";
import { MAIN_NAV, SETTINGS_NAV, type NavItem } from "./nav";

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
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
      className={`flex h-9 items-center gap-3 rounded-md px-3 text-[14px] transition-colors duration-150 ease-out ${
        active
          ? "bg-white/10 font-medium text-ink"
          : "text-muted hover:bg-white/5 hover:text-ink"
      }`}
    >
      <Icon
        className={`size-4 ${active ? "text-accent" : "text-faint"}`}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav
        aria-label="Main"
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
      >
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="border-t border-edge p-3">
        <NavLink item={SETTINGS_NAV} onNavigate={onNavigate} />
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-edge bg-shell lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-edge px-5">
        <Logo />
      </div>
      <NavLinks />
    </aside>
  );
}
