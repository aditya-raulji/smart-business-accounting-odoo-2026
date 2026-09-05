// Vendor Bills Table Client Component for Urban Furniture Accounting System.
// Yeh Client Component DataTable primitive use karke Vendor Bills render karta hai.
// Specification §2.3 Columns: Bill No., Vendor, Bill Date, Due Date, Status (Draft/Confirmed/Partially Paid/Paid/Cancelled), Total, Amount Due.
// Used by: /purchase/bills/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface BillItem {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  billReference?: string | null;
  billDate: Date | string;
  dueDate: Date | string;
  status: string;
  total: number;
  paidAmount: number;
  amountDue: number;
}

interface VendorBillsTableProps {
  bills: BillItem[];
  isContactUser?: boolean;
}

export function VendorBillsTable({ bills, isContactUser = false }: VendorBillsTableProps) {
  const router = useRouter();

  const columns: Column<BillItem>[] = [
    {
      key: "billNumber",
      header: "Bill No.",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">{row.billNumber}</span>
      ),
    },
    {
      key: "vendorName",
      header: "Vendor",
      sortable: true,
    },
    {
      key: "billDate",
      header: "Bill Date",
      sortable: true,
      render: (row) => new Date(row.billDate).toLocaleDateString("en-IN"),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (row) => new Date(row.dueDate).toLocaleDateString("en-IN"),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === "PAID"
              ? "success"
              : row.status === "PARTIALLY_PAID"
              ? "warning"
              : row.status === "CONFIRMED"
              ? "primary"
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
        <span className="font-medium text-[#171717]">
          ₹{row.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "amountDue",
      header: "Amount Due",
      sortable: true,
      render: (row) => (
        <span
          className={`font-semibold ${
            row.amountDue > 0 ? "text-[#B91C1C]" : "text-emerald-700"
          }`}
        >
          ₹{row.amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={bills}
      columns={columns}
      rowKey={(row) => row.id}
      searchKeys={["billNumber", "vendorName", "billReference"]}
      searchPlaceholder="Search bill number, vendor, or reference..."
      onRowClick={(row) => router.push(`/purchase/bills/${row.id}`)}
      emptyMessage={
        isContactUser
          ? "No vendor bills have been registered for your account yet."
          : "No Vendor Bills found. Click '+ New Bill' to register a new vendor bill."
      }
    />
  );
}
