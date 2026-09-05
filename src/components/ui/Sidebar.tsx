// Sidebar navigation component for Urban Furniture Accounting System.
// What: Renders the full sidebar nav with grouped links (Dashboard, Sales, Purchase, Accounting,
//       Reports) for ADMIN/ACCOUNTANT, or a single restricted view for CONTACT_USER. Highlights
//       the active route.
// Why: The sidebar is the primary navigation frame for all authenticated users. Making it
//      role-aware here (instead of per-page) means adding a new role restriction requires
//      changing one file, not every page. Using Next.js usePathname() for active link detection
//      gives real-time highlight without any additional state.
// Why not: A flat list of all links with conditional CSS hiding per role would leak route
//          awareness to the DOM even for users who can't access those routes — better to not
//          render them at all.
// Used by: (dashboard)/layout.tsx which wraps every authenticated page.

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

// Full navigation structure per spec §4 — matches the approved wireframe exactly.
const ADMIN_ACCOUNTANT_NAV: NavGroup[] = [
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
      { label: "Payments", href: "/purchase/payments", icon: Wallet },
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

// Restricted nav for CONTACT_USER — only their own invoices/bills view.
const CONTACT_USER_NAV: NavGroup[] = [
  {
    group: "",
    items: [
      { label: "My Invoices & Bills", href: "/dashboard", icon: Receipt },
    ],
  },
];

interface SidebarProps {
  role: string;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "CONTACT_USER" ? CONTACT_USER_NAV : ADMIN_ACCOUNTANT_NAV;

  // isActive: marks a link active if the current pathname starts with its href,
  // with a special case for /dashboard to avoid matching /dashboard/* as active on child pages.
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
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[2px] text-[#3D3A36]">
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

      {/* User footer */}
      <div className="px-4 py-4 border-t border-[#2a2a2a] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-[#B91C1C] flex items-center justify-center text-[#FFFDF8] text-sm font-bold shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-[#FFFDF8] truncate">{userName}</span>
            <span className="text-[10px] uppercase tracking-[1px] text-[#A8A29E]">{role.replace("_", " ")}</span>
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
