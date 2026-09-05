// Journals interactive table for Urban Furniture Accounting System.
// What: Client component displaying accounting journals with type, default account, and system badges.
// Why: Provides quick navigation to view or edit books of account.
// Used by: /master/journals page.

"use client";

import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/ui/DataTable";
import { JournalType } from "@prisma/client";
import { Building2, Lock } from "lucide-react";

interface JournalItem {
  id: string;
  name: string;
  type: JournalType;
  isSystem: boolean;
  defaultAccount: {
    name: string;
    type: string;
  };
}

export function JournalsTable({ journals }: { journals: JournalItem[] }) {
  const router = useRouter();

  const columns: Column<JournalItem>[] = [
    {
      key: "name",
      header: "Journal Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center font-bold text-xs shrink-0">
            <Building2 size={14} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#171717]">{row.name}</span>
            {row.isSystem && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#171717] text-[#FFFDF8]">
                <Lock size={10} />
                System
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Journal Type",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F7F4EE] text-[#171717] border border-[#E2D9CC]">
          {row.type}
        </span>
      ),
    },
    {
      key: "defaultAccount",
      header: "Default Ledger Account",
      render: (row) => (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-[#171717]">{row.defaultAccount.name}</span>
          <span className="text-[#A8A29E]">({row.defaultAccount.type})</span>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={journals}
      columns={columns}
      rowKey={(r) => r.id}
      searchKeys={["name", "type"]}
      searchPlaceholder="Search journals by name or type..."
      onRowClick={(r) => router.push(`/master/journals/${r.id}`)}
      emptyMessage="No journals defined."
    />
  );
}
