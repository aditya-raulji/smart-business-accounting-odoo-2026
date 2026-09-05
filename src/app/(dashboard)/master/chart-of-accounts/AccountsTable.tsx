// Chart of Accounts interactive table for Urban Furniture Accounting System.
// What: Client component displaying the chart of accounts table with sorting, search, and navigation.
// Why: Provides clear distinction between system-seeded accounts and custom user-defined ledger accounts.
// Used by: /master/chart-of-accounts page.

"use client";

import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AccountType } from "@prisma/client";
import { Lock, BookOpen } from "lucide-react";

interface AccountItem {
  id: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
  createdAt: string | Date;
}

export function AccountsTable({ accounts }: { accounts: AccountItem[] }) {
  const router = useRouter();

  const columns: Column<AccountItem>[] = [
    {
      key: "name",
      header: "Account Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#B45309]/10 text-[#B45309] flex items-center justify-center font-bold text-xs shrink-0">
            <BookOpen size={14} />
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
      header: "Account Category / Type",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F7F4EE] text-[#171717] border border-[#E2D9CC]">
          {row.type}
        </span>
      ),
    },
    {
      key: "status",
      header: "Governance",
      render: (row) => (
        <span className="text-xs text-[#3D3A36]">
          {row.isSystem ? "Protected default ledger" : "Custom user-defined account"}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={accounts}
      columns={columns}
      rowKey={(r) => r.id}
      searchKeys={["name", "type"]}
      searchPlaceholder="Search accounts by name or type..."
      onRowClick={(r) => router.push(`/master/chart-of-accounts/${r.id}`)}
      emptyMessage="No accounts found in the Chart of Accounts."
    />
  );
}
