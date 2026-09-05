// Journal Entries Table Client Component for Urban Furniture Accounting System.
// Yeh Client Component DataTable primitive use karke Journal Entries list render karta hai.
// Specification §2.7 Columns: Date, Number (Bill number / reference), Partner, Journal Name, Total Amount, Status (Posted).
// Used by: /accounting/journal-entries/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface JournalEntryItem {
  id: string;
  date: Date | string;
  number: string;
  partnerName: string;
  journalName: string;
  total: number;
  status: string;
}

interface JournalEntriesTableProps {
  entries: JournalEntryItem[];
}

export function JournalEntriesTable({ entries }: JournalEntriesTableProps) {
  const router = useRouter();

  const columns: Column<JournalEntryItem>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => new Date(row.date).toLocaleDateString("en-IN"),
    },
    {
      key: "number",
      header: "Number / Ref",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">{row.number}</span>
      ),
    },
    {
      key: "partnerName",
      header: "Partner",
      sortable: true,
    },
    {
      key: "journalName",
      header: "Journal",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-[#3D3A36]">{row.journalName}</span>
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
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant="success">
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      data={entries}
      columns={columns}
      rowKey={(row) => row.id}
      searchKeys={["number", "partnerName", "journalName"]}
      searchPlaceholder="Search entry number, reference, partner, or journal..."
      onRowClick={(row) => router.push(`/accounting/journal-entries/${row.id}`)}
      emptyMessage="No Journal Entries posted yet. Journal entries are automatically created when Vendor Bills are confirmed or Payments are recorded."
    />
  );
}
