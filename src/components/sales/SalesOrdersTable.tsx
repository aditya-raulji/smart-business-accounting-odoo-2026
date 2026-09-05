// Sales Orders Table Client Component for Urban Furniture Accounting System.
// What: Renders a searchable, sortable list of Sales Orders using DataTable primitive.
// Why: Displays real-time sales order status, customer names, untaxed amounts, tax totals, grand totals, and linked customer invoices.
// Why not alternative: Client component avoids serialization issues with JSX/functions while server components fetch pure JSON data.
// Where used: /sales/orders/page.tsx

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

export interface SOItem {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  soDate: Date | string;
  status: string;
  untaxedTotal: number;
  taxTotal: number;
  total: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
}

interface SalesOrdersTableProps {
  orders: SOItem[];
}

export function SalesOrdersTable({ orders }: SalesOrdersTableProps) {
  const router = useRouter();

  const columns: Column<SOItem>[] = [
    {
      key: "soNumber",
      header: "SO No.",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">{row.soNumber}</span>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-[#171717]">{row.customerName}</div>
          {row.customerEmail && (
            <div className="text-xs text-[#78716C]">{row.customerEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: "soDate",
      header: "Order Date",
      sortable: true,
      render: (row) => new Date(row.soDate).toLocaleDateString("en-IN"),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === "CONFIRMED"
              ? "success"
              : row.status === "DRAFT"
              ? "warning"
              : "danger"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "untaxedTotal",
      header: "Untaxed",
      sortable: true,
      render: (row) => (
        <span className="text-[#3D3A36]">
          ₹{row.untaxedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "taxTotal",
      header: "Tax",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[#78716C]">
          ₹{row.taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total (Grand)",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">
          ₹{row.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "invoiceNumber",
      header: "Linked Invoice",
      render: (row) =>
        row.invoiceId ? (
          <Link
            href={`/sales/invoices/${row.invoiceId}`}
            className="text-xs font-semibold text-[#B91C1C] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.invoiceNumber} →
          </Link>
        ) : (
          <span className="text-[#A8A29E] text-xs">—</span>
        ),
    },
  ];

  return (
    <DataTable
      data={orders}
      columns={columns}
      rowKey={(row) => row.id}
      searchKeys={["soNumber", "customerName"]}
      searchPlaceholder="Search SO number or customer..."
      onRowClick={(row) => router.push(`/sales/orders/${row.id}`)}
      emptyMessage="No Sales Orders found. Click '+ New SO' to create your first customer quotation or sales order."
    />
  );
}
