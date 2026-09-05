// Purchase Orders Table Client Component for Urban Furniture Accounting System.
// Yeh Client Component DataTable primitive use karke Purchase Orders render karta hai.
// RSC Serialization Fix: Server Component se raw serializable JSON data pass hota hai, aur React node render functions Client Component me compile hote hain.
// Used by: /purchase/orders/page.tsx

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface POItem {
  id: string;
  poNumber: string;
  vendorName: string;
  poDate: Date | string;
  status: string;
  total: number;
  billId: string | null;
  billNumber: string | null;
}

interface PurchaseOrdersTableProps {
  orders: POItem[];
}

export function PurchaseOrdersTable({ orders }: PurchaseOrdersTableProps) {
  const router = useRouter();

  const columns: Column<POItem>[] = [
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">{row.poNumber}</span>
      ),
    },
    {
      key: "vendorName",
      header: "Vendor",
      sortable: true,
    },
    {
      key: "poDate",
      header: "PO Date",
      sortable: true,
      render: (row) => new Date(row.poDate).toLocaleDateString("en-IN"),
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
      key: "total",
      header: "Total",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">
          ₹{row.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "billNumber",
      header: "Linked Bill",
      render: (row) =>
        row.billId ? (
          <Link
            href={`/purchase/bills/${row.billId}`}
            className="text-xs font-semibold text-[#B91C1C] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.billNumber} →
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
      searchKeys={["poNumber", "vendorName"]}
      searchPlaceholder="Search PO number or vendor name..."
      onRowClick={(row) => router.push(`/purchase/orders/${row.id}`)}
      emptyMessage="No Purchase Orders found. Click '+ New PO' to create your first supplier procurement order."
    />
  );
}
