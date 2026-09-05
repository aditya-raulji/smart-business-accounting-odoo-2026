// Customer Invoices Table Client Component for Urban Furniture Accounting System.
// What: Interactive DataTable listing all Customer Invoices with payment statuses, tax details, and source SO links.
// Why: Provides clear visibility into Accounts Receivable, overdue invoices, partial payments, and double-entry status.
// Why not alternative: Single client table handles dynamic status badges and row routing without server roundtrips.
// Where used: /sales/invoices/page.tsx and Customer Portal view.

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  invoiceReference?: string | null;
  invoiceDate: Date | string;
  dueDate: Date | string;
  status: string;
  untaxedTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  amountDue: number;
  paidViaCash: number;
  paidViaBank: number;
  sourceSOId: string | null;
  sourceSONumber: string | null;
}

interface CustomerInvoicesTableProps {
  invoices: InvoiceItem[];
  isCustomerPortal?: boolean;
}

export function CustomerInvoicesTable({
  invoices,
  isCustomerPortal = false,
}: CustomerInvoicesTableProps) {
  const router = useRouter();

  const columns: Column<InvoiceItem>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice No.",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">{row.invoiceNumber}</span>
      ),
    },
    ...(!isCustomerPortal
      ? [
          {
            key: "customerName" as keyof InvoiceItem,
            header: "Customer",
            sortable: true,
            render: (row: InvoiceItem) => (
              <div>
                <div className="font-medium text-[#171717]">{row.customerName}</div>
                {row.customerEmail && (
                  <div className="text-xs text-[#78716C]">{row.customerEmail}</div>
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      key: "invoiceDate",
      header: "Invoice Date",
      sortable: true,
      render: (row) => new Date(row.invoiceDate).toLocaleDateString("en-IN"),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (row) => (
        <span
          className={
            new Date(row.dueDate) < new Date() && row.amountDue > 0
              ? "text-red-600 font-semibold"
              : "text-[#3D3A36]"
          }
        >
          {new Date(row.dueDate).toLocaleDateString("en-IN")}
        </span>
      ),
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
      header: "Grand Total",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">
          ₹{row.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "paidAmount",
      header: "Paid",
      sortable: true,
      render: (row) => (
        <span className="text-green-700 font-medium">
          ₹{row.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            row.amountDue > 0 ? "text-[#B91C1C]" : "text-green-700"
          }`}
        >
          ₹{row.amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "sourceSONumber",
      header: "Source SO",
      render: (row) =>
        row.sourceSOId ? (
          <Link
            href={`/sales/orders/${row.sourceSOId}`}
            className="text-xs font-semibold text-[#B91C1C] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.sourceSONumber} →
          </Link>
        ) : (
          <span className="text-[#A8A29E] text-xs">—</span>
        ),
    },
  ];

  return (
    <DataTable
      data={invoices}
      columns={columns}
      rowKey={(row) => row.id}
      searchKeys={["invoiceNumber", "customerName", "sourceSONumber"]}
      searchPlaceholder="Search invoice number, customer, or source SO..."
      onRowClick={(row) => router.push(`/sales/invoices/${row.id}`)}
      emptyMessage="No Customer Invoices found. Invoices can be created directly or from Confirmed Sales Orders."
    />
  );
}
