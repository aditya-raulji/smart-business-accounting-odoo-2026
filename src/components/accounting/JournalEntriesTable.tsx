// Journal Entries Table Client Component for Urban Furniture Accounting System.
// Yeh Client Component DataTable primitive use karke Journal Entries list render karta hai.
// Specification §2.1 Columns: Date, Number (Bill number / reference), Partner, Journal Name, Total Amount, Status (Draft, Posted, Cancelled) with "Auto" badge for system-generated entries.
// Used by: /accounting/journal-entries/page.tsx

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Plus } from "lucide-react";

interface JournalEntryItem {
  id: string;
  date: Date | string;
  number: string;
  partnerName: string;
  journalName: string;
  total: number;
  status: string;
  isAuto?: boolean;
}

interface JournalEntriesTableProps {
  entries: JournalEntryItem[];
  canCreate?: boolean;
}

export function JournalEntriesTable({ entries, canCreate = true }: JournalEntriesTableProps) {
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
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#171717]">{row.number}</span>
          {row.isAuto && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              Auto
            </span>
          )}
        </div>
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
      render: (row) => {
        let variant: "success" | "warning" | "danger" | "info" = "info";
        if (row.status === "POSTED") variant = "success";
        else if (row.status === "DRAFT") variant = "warning";
        else if (row.status === "CANCELLED") variant = "danger";

        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Link
            href="/accounting/journal-entries/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            + New Journal Entry
          </Link>
        </div>
      )}

      <DataTable
        data={entries}
        columns={columns}
        rowKey={(row) => row.id}
        searchKeys={["number", "partnerName", "journalName"]}
        searchPlaceholder="Search entry number, reference, partner, or journal..."
        onRowClick={(row) => router.push(`/accounting/journal-entries/${row.id}`)}
        emptyMessage="No Journal Entries found. Click '+ New Journal Entry' to create a manual entry or confirm Vendor Bills/Invoices to auto-generate entries."
      />
    </div>
  );
}
