// Vendor Bills List Page for Urban Furniture Accounting System.
// Yeh page tamam Vendor Bills fetch karke VendorBillsTable Client Component me render karta hai.
// Specification §2.3 Columns: Bill No., Vendor, Bill Date, Due Date, Status (Draft/Confirmed/Partially Paid/Paid/Cancelled), Total, Amount Due.
// RBAC Rule: CONTACT_USER vendor role ke liye list automatically filter karke unki apni bills hi dikhati hai aur `+ New` button hide kar deti hai.
// Used by: /purchase/bills route.

import { auth } from "@/lib/auth";
import { getVendorBills } from "@/lib/actions/vendor-bills";
import { PageHeader } from "@/components/ui/PageHeader";
import { VendorBillsTable } from "@/components/purchase/VendorBillsTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function VendorBillsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role || "ACCOUNTANT";
  const contactId = (session?.user as any)?.contactId;

  const isContactUser = role === "CONTACT_USER";
  const filterContactId = isContactUser && contactId ? contactId : undefined;

  const bills = await getVendorBills(filterContactId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Bills"
        subtitle="Manage vendor incoming invoices, track payment status, and review amount due balance."
        action={
          !isContactUser ? (
            <Link
              href="/purchase/bills/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-[#171717] text-[#FFFDF8] hover:bg-[#262626] transition-colors"
            >
              <Plus size={14} />
              + New Bill
            </Link>
          ) : undefined
        }
      />

      <VendorBillsTable bills={bills} isContactUser={isContactUser} />
    </div>
  );
}
