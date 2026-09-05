// Sales Orders List Page for Urban Furniture Accounting System.
// What: Server Component that fetches all Sales Orders and displays them via SalesOrdersTable client component.
// Why: Provides a unified view of customer quotations and confirmed orders with itemized tax breakdowns and linked invoice shortcuts.
// Why not alternative: Direct client queries risk leaking database credentials and bypass server caching.
// Where used: /sales/orders route.

import { getSalesOrders } from "@/lib/actions/sales-orders";
import { PageHeader } from "@/components/ui/PageHeader";
import { SalesOrdersTable } from "@/components/sales/SalesOrdersTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function SalesOrdersPage() {
  const orders = await getSalesOrders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        subtitle="Manage customer sales quotations, confirmed orders, and tax breakdowns."
        action={
          <Link
            href="/sales/orders/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-[#171717] text-[#FFFDF8] hover:bg-[#262626] transition-colors"
          >
            <Plus size={14} />
            + New SO
          </Link>
        }
      />

      <SalesOrdersTable orders={orders} />
    </div>
  );
}
