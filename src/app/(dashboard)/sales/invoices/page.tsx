// Customer Invoices List Page for Urban Furniture Accounting System.
// What: Server Component that fetches Customer Invoices (scoped by session for CONTACT_USER) and renders CustomerInvoicesTable.
// Why: Provides real-time view of customer billing, overdue statuses, received payments, and amount due balances.
// Why not alternative: Client-side fetching could expose other customers' invoices to a CONTACT_USER.
// Where used: /sales/invoices route.

import { auth } from "@/lib/auth";
import { getCustomerInvoices } from "@/lib/actions/customer-invoices";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomerInvoicesTable } from "@/components/sales/CustomerInvoicesTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CustomerInvoicesPage() {
  const session = await auth();
  const role = (session?.user as any)?.role || "ACCOUNTANT";
  const contactId = (session?.user as any)?.contactId;

  const isContactUser = role === "CONTACT_USER";
  const filterContactId = isContactUser && contactId ? contactId : undefined;

  const invoices = await getCustomerInvoices(filterContactId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isContactUser ? "My Invoices" : "Customer Invoices"}
        subtitle={
          isContactUser
            ? "View your invoices, check outstanding balances, and pay online."
            : "Manage customer sales invoices, track receivables, and review payment settlements."
        }
        action={
          !isContactUser ? (
            <Link
              href="/sales/invoices/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-[#171717] text-[#FFFDF8] hover:bg-[#262626] transition-colors"
            >
              <Plus size={14} />
              + New Invoice
            </Link>
          ) : undefined
        }
      />

      <CustomerInvoicesTable
        invoices={invoices}
        isCustomerPortal={isContactUser}
      />
    </div>
  );
}
