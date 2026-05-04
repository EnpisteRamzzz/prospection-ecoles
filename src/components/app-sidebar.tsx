"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Building2,
  Layers,
  BarChart3,
  GitBranch,
  Upload,
  Settings2,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/aujourdhui", label: "Aujourd'hui", icon: CalendarDays },
  { href: "/etablissements", label: "Établissements", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: Layers },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/sequences", label: "Séquences", icon: GitBranch },
];

const bottomNav = [
  { href: "/import", label: "Importer CSV", icon: Upload },
  { href: "/parametres/donnees", label: "Paramètres", icon: Settings2 },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[0.8125rem] font-medium transition-all duration-150 select-none",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
      )}
    >
      <Icon className="size-[1.0625rem] shrink-0" />
      {label}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border z-30">
      {/* Logo */}
      <div className="px-4 h-14 flex items-center gap-3 border-b border-sidebar-border">
        <div className="size-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <GraduationCap className="size-[1.0625rem] text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[0.8125rem] font-semibold tracking-tight">Prospection</span>
          <span className="text-[0.6875rem] text-muted-foreground">Écoles privées</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
        <p className="px-3 mb-1.5 text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Navigation
        </p>
        {mainNav.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-sidebar-border flex flex-col gap-0.5">
        {bottomNav.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </aside>
  );
}
