// Payments Table Client Component for Urban Furniture Accounting System.
// Yeh Client Component DataTable primitive use karke Payment Register list render karta hai.
// Specification §2.6 Columns: Date, Partner, Direction (Send/Receive badge), Method (Cash/Bank), Amount, Against Document link.
// Used by: /payments/page.tsx

"use client";

import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface PaymentItem {
  id: string;
  date: Date | string;
  partnerName: string;
  direction: string;
  method: string;
  amount: number;
  note?: string | null;
  againstDocNumber: string;
  againstDocLink?: string | null;
}

interface PaymentsTableProps {
  payments: PaymentItem[];
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const columns: Column<PaymentItem>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => new Date(row.date).toLocaleDateString("en-IN"),
    },
    {
      key: "partnerName",
      header: "Partner",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">{row.partnerName}</span>
      ),
    },
    {
      key: "direction",
      header: "Direction",
      sortable: true,
      render: (row) => (
        <Badge variant={row.direction === "SEND" ? "danger" : "success"}>
          {row.direction === "SEND" ? "Outgoing (Send)" : "Incoming (Receive)"}
        </Badge>
      ),
    },
    {
      key: "method",
      header: "Method",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-[#3D3A36]">
          {row.method === "BANK" ? "Bank Transfer" : "Cash Payment"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (row) => (
        <span className="font-bold text-[#171717]">
          ₹{row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "againstDocNumber",
      header: "Against Document",
      render: (row) =>
        row.againstDocLink ? (
          <Link
            href={row.againstDocLink}
            className="text-xs font-semibold text-[#B91C1C] hover:underline"
          >
            {row.againstDocNumber} →
          </Link>
        ) : (
          <span className="text-[#A8A29E] text-xs">{row.againstDocNumber}</span>
        ),
    },
  ];

  return (
    <DataTable
      data={payments}
      columns={columns}
      rowKey={(row) => row.id}
      searchKeys={["partnerName", "againstDocNumber", "method"]}
      searchPlaceholder="Search partner name, payment method, or document number..."
      emptyMessage="No Payments recorded yet. Payments are automatically logged when you click 'Pay' on confirmed Vendor Bills or Invoices."
    />
  );
}
