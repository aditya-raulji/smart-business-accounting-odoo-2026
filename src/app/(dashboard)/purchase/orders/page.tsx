// Purchase Orders List Page for Urban Furniture Accounting System.
// Yeh page tamam Purchase Orders ki list fetch karta hai aur Client Component PurchaseOrdersTable me pass karta hai.
// Features: PO Number, Vendor, PO Date, Status Badge (Draft/Confirmed/Cancelled) aur Grand Total Display.
// Used by: /purchase/orders route.

import { getPurchaseOrders } from "@/lib/actions/purchase-orders";
import { PageHeader } from "@/components/ui/PageHeader";
import { PurchaseOrdersTable } from "@/components/purchase/PurchaseOrdersTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function PurchaseOrdersPage() {
  const orders = await getPurchaseOrders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage supplier procurement orders committed to timber and hardware vendors."
        action={
          <Link
            href="/purchase/orders/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-[#171717] text-[#FFFDF8] hover:bg-[#262626] transition-colors"
          >
            <Plus size={14} />
            + New PO
          </Link>
        }
      />

      <PurchaseOrdersTable orders={orders} />
    </div>
  );
}
