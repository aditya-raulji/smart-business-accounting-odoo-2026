// Sidebar navigation component for Urban Furniture Accounting System.
// Yeh component left-hand navigation sidebar render karta hai role-based filtering ke saath.
// ADMIN & ACCOUNTANT Nav: Full access to Dashboard, Sales, Purchase, Accounting, Reports.
// CONTACT_USER Nav: Restricted view with access to Portal Dashboard and My Vendor Bills list (/purchase/bills).
// Used by: (dashboard)/layout.tsx wrapping all dashboard views.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Wallet,
  Package,
  Users,
  BookOpen,
  PieChart,
  FileText,
  BarChart3,
  CreditCard,
  Building2,
  TrendingUp,
  Layers,
  DollarSign,
  LogOut,
  UserPlus,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

// Nav items shared between Admin and Accountant
const SHARED_NAV: NavGroup[] = [
  {
    group: "Dashboard",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Sales Orders", href: "/sales/orders", icon: ShoppingCart },
      { label: "Customer Invoices", href: "/sales/invoices", icon: Receipt },
      { label: "Receipts", href: "/payments", icon: CreditCard },
    ],
  },
  {
    group: "Purchase",
    items: [
      { label: "Purchase Orders", href: "/purchase/orders", icon: Package },
      { label: "Vendor Bills", href: "/purchase/bills", icon: FileText },
      { label: "Payments", href: "/payments", icon: Wallet },
    ],
  },
  {
    group: "Accounting",
    items: [
      { label: "Contacts", href: "/master/contacts", icon: Users },
      { label: "Products", href: "/master/products", icon: Layers },
      { label: "Analytic Accounts", href: "/master/analytic-accounts", icon: TrendingUp },
      { label: "Analytic Budgets", href: "/master/budgets", icon: DollarSign },
      { label: "Chart of Accounts", href: "/master/chart-of-accounts", icon: BookOpen },
      { label: "Journals", href: "/master/journals", icon: Building2 },
      { label: "Journal Entries", href: "/accounting/journal-entries", icon: FileText },
    ],
  },
  {
    group: "Reports",
    items: [
      { label: "Balance Sheet", href: "/reports/balance-sheet", icon: BarChart3 },
      { label: "Profit & Loss", href: "/reports/profit-and-loss", icon: PieChart },
      { label: "Budget Report", href: "/reports/budget-report", icon: TrendingUp },
    ],
  },
];

// Admin-only nav group for team & user administration
const ADMIN_NAV_GROUP: NavGroup = {
  group: "Administration",
  items: [
    { label: "User Management", href: "/users/new", icon: UserPlus },
  ],
};

// Restricted nav for CONTACT_USER — vendor/customer self-service portal
const CONTACT_USER_NAV: NavGroup[] = [
  {
    group: "Portal",
    items: [
      { label: "My Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "My Invoices", href: "/sales/invoices", icon: Receipt },
      { label: "My Vendor Bills", href: "/purchase/bills", icon: FileText },
    ],
  },
];

interface SidebarProps {
  role: string;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();

  let nav: NavGroup[];
  if (role === "CONTACT_USER") {
    nav = CONTACT_USER_NAV;
  } else if (role === "ADMIN") {
    nav = [...SHARED_NAV, ADMIN_NAV_GROUP];
  } else {
    // ACCOUNTANT: no administration section
    nav = SHARED_NAV;
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-64 min-h-screen bg-[#171717] flex flex-col shrink-0">
      {/* Brand header */}
      <div className="px-6 py-6 border-b border-[#2a2a2a]">
        <div
          className="text-xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", color: "#FFFDF8" }}
        >
          Urban Furniture
        </div>
        <div className="text-[10px] uppercase tracking-[2px] text-[#D4CCC0] mt-1">
          Accounting System
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map((group) => (
          <div key={group.group} className="mb-4">
            {group.group && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[2px] text-[#A8A29E]">
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium",
                    "transition-all duration-150",
                    active
                      ? "bg-[#B91C1C] text-[#FFFDF8]"
                      : "text-[#D4CCC0] hover:bg-[#262626] hover:text-[#FFFDF8]",
                  ].join(" ")}
                >
                  <item.icon size={16} className="shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer with clear role badge */}
      <div className="px-4 py-4 border-t border-[#2a2a2a] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-[#B91C1C] flex items-center justify-center text-[#FFFDF8] text-sm font-bold shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-[#FFFDF8] truncate">{userName}</span>
            <div className="mt-0.5">
              {role === "ADMIN" && (
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase bg-[#B91C1C] text-white">
                  Admin
                </span>
              )}
              {role === "ACCOUNTANT" && (
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Accountant
                </span>
              )}
              {role === "CONTACT_USER" && (
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Portal Partner
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign Out"
          className="p-1.5 rounded text-[#A8A29E] hover:text-[#FFFDF8] hover:bg-[#262626] transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
