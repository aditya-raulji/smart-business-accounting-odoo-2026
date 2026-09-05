// Dashboard page for Urban Furniture Accounting System.
// What: Role-aware landing view displaying operational metrics (contacts, products, budgets, journals)
//       for Admin & Accountant roles, or a personal portal for Contact users.
// Why: Provides immediate visibility into system state and quick entry points to core master data modules.
// Why not: Showing the full financial stats to Contact users would leak confidential company numbers.
// Used by: /dashboard route.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Users, Package, DollarSign, BookOpen, Building2, ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BudgetStatus, ContactType } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  const role = (session?.user as any)?.role || "ACCOUNTANT";
  const userName = session?.user?.name || "Team Member";
  const contactId = (session?.user as any)?.contactId;

  // Render Contact User Portal
  if (role === "CONTACT_USER") {
    const contact = contactId
      ? await prisma.contact.findUnique({ where: { id: contactId } })
      : null;

    const pendingInvoices = contactId
      ? await prisma.customerInvoice.findMany({
          where: {
            customerId: contactId,
            status: { in: ["CONFIRMED", "PARTIALLY_PAID"] },
          },
          include: { lines: true },
        })
      : [];

    let totalDue = 0;
    for (const inv of pendingInvoices) {
      const invTotal = inv.lines.reduce((s, l) => {
        const sub = Number(l.qty) * Number(l.unitPrice);
        return s + sub + sub * (Number((l as any).taxRate ?? 18) / 100);
      }, 0);
      totalDue += Math.max(0, invTotal - Number(inv.paidAmount));
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${userName}`}
          subtitle="Your personal Urban Furniture customer and vendor portal."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center font-bold">
                {userName.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#171717]">{contact?.name || userName}</h3>
                <p className="text-xs text-[#3D3A36]">{contact?.email || session?.user?.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#3D3A36] pt-3 border-t border-[#E2D9CC]">
              <div className="flex justify-between">
                <span>Account Type:</span>
                <span className="font-semibold text-[#171717]">{contact?.type || "Customer/Vendor"}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span className="font-medium text-[#171717]">{contact?.phone || "Not provided"}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-medium text-[#171717]">{contact?.city || "Registered Office"}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-[#FFFDF8]">
            <h3 className="text-sm font-semibold text-[#171717] mb-2 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#B91C1C]" />
              Invoices & Transaction Status
            </h3>
            <p className="text-xs text-[#3D3A36] leading-relaxed mb-4">
              Your billing and transaction statements are tracked here with real-time audit lineage.
            </p>
            {pendingInvoices.length > 0 ? (
              <div className="p-4 rounded bg-[#FFF8EE] border border-[#E2D9CC] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Outstanding Invoices:</span>
                  <span className="font-bold text-[#171717]">{pendingInvoices.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Total Amount Due:</span>
                  <span className="font-bold text-[#B91C1C] text-sm">
                    ₹{totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <Link
                  href="/sales/invoices"
                  className="inline-flex items-center justify-center w-full px-3 py-2 bg-[#B91C1C] text-white text-xs font-semibold rounded hover:bg-[#991B1B] transition-colors"
                >
                  View & Pay Invoices →
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded border border-dashed border-[#D4CCC0] text-center text-xs text-[#3D3A36]">
                No pending invoices or outstanding balances found for your account.
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Admin and Accountant Metrics
  const [
    totalContacts,
    customerCount,
    vendorCount,
    totalProducts,
    totalBudgets,
    confirmedBudgets,
    draftBudgets,
    totalAccounts,
    totalJournals,
    recentContacts,
  ] = await Promise.all([
    prisma.contact.count({ where: { archived: false } }),
    prisma.contact.count({
      where: {
        archived: false,
        OR: [{ type: ContactType.CUSTOMER }, { type: ContactType.BOTH }],
      },
    }),
    prisma.contact.count({
      where: {
        archived: false,
        OR: [{ type: ContactType.VENDOR }, { type: ContactType.BOTH }],
      },
    }),
    prisma.product.count({ where: { archived: false } }),
    prisma.budget.count(),
    prisma.budget.count({ where: { status: BudgetStatus.CONFIRMED } }),
    prisma.budget.count({ where: { status: BudgetStatus.DRAFT } }),
    prisma.chartOfAccount.count({ where: { archived: false } }),
    prisma.journal.count(),
    prisma.contact.findMany({
      where: { archived: false },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of business operations, master catalogs, and fiscal budgets."
        action={
          role === "ADMIN"
            ? {
                label: "+ New User",
                href: "/users/new",
              }
            : undefined
        }
      />

      {/* Primary Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Active Contacts"
          value={totalContacts}
          icon={<Users size={18} style={{ color: "#B91C1C" }} />}
          subStats={[
            { label: "Customers", value: customerCount },
            { label: "Vendors", value: vendorCount },
          ]}
          accentColor="#B91C1C"
        />

        <StatCard
          label="Product Catalog"
          value={totalProducts}
          icon={<Package size={18} style={{ color: "#1E3A8A" }} />}
          subStats={[{ label: "Active Items", value: totalProducts }]}
          accentColor="#1E3A8A"
        />

        <StatCard
          label="Fiscal Budgets"
          value={totalBudgets}
          icon={<DollarSign size={18} style={{ color: "#047857" }} />}
          subStats={[
            { label: "Confirmed", value: confirmedBudgets },
            { label: "Drafts", value: draftBudgets },
          ]}
          accentColor="#047857"
        />

        <StatCard
          label="Ledger Setup"
          value={totalAccounts}
          icon={<BookOpen size={18} style={{ color: "#B45309" }} />}
          subStats={[{ label: "Journals", value: totalJournals }]}
          accentColor="#B45309"
        />
      </div>

      {/* Quick Navigation & Recent Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Master Data Quick Access */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[1.5px] text-[#3D3A36] mb-4">
              Master Data Modules
            </h2>
            <div className="space-y-2">
              {[
                { name: "Contacts Master", href: "/master/contacts", desc: "Manage customers, vendors & auto-portal accounts" },
                { name: "Product Catalog", href: "/master/products", desc: "Goods & services with sales price and cost" },
                { name: "Analytic Budgets", href: "/master/budgets", desc: "Draft, confirm, revise, and track budgets" },
                { name: "Chart of Accounts", href: "/master/chart-of-accounts", desc: "Ledger structure with system protection" },
                { name: "Journals", href: "/master/journals", desc: "Books of accounts: Sales, Purchase, Bank, Cash" },
                { name: "Analytic Accounts", href: "/master/analytic-accounts", desc: "Cost centres and financial dimensions" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between p-3 rounded hover:bg-[#F7F4EE] transition-colors group"
                >
                  <div>
                    <span className="text-sm font-semibold text-[#171717] group-hover:text-[#B91C1C] transition-colors">
                      {item.name}
                    </span>
                    <p className="text-xs text-[#3D3A36]">{item.desc}</p>
                  </div>
                  <ArrowUpRight size={16} className="text-[#A8A29E] group-hover:text-[#B91C1C] transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Master Records */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[1.5px] text-[#3D3A36]">
                Recent Contacts
              </h2>
              <Link
                href="/master/contacts"
                className="text-xs font-semibold text-[#B91C1C] hover:underline"
              >
                View all →
              </Link>
            </div>

            {recentContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#3D3A36] border border-dashed border-[#D4CCC0] rounded">
                No contacts registered yet. Click &quot;Contacts Master&quot; to create your first customer or vendor.
              </div>
            ) : (
              <div className="divide-y divide-[#E2D9CC]">
                {recentContacts.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link
                        href={`/master/contacts/${c.id}`}
                        className="text-sm font-medium text-[#171717] hover:text-[#B91C1C]"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-[#3D3A36]">
                        {c.email || "No email"} • {c.city || "No city"}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#171717]/5 text-[#171717]">
                      {c.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
