// Analytic Accounts interactive table for Urban Furniture Accounting System.
// What: Client component displaying cost/profit centres used for analytic tracking and budgets.
// Why: Provides sorting, search, and navigation across analytic cost centres.
// Used by: /master/analytic-accounts page.

"use client";

import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AnalyticType } from "@prisma/client";
import { TrendingUp, PieChart } from "lucide-react";

interface AnalyticItem {
  id: string;
  name: string;
  type: AnalyticType;
  _count?: {
    budgets: number;
  };
}

export function AnalyticAccountsTable({ accounts }: { accounts: AnalyticItem[] }) {
  const router = useRouter();

  const columns: Column<AnalyticItem>[] = [
    {
      key: "name",
      header: "Dimension / Account Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#047857]/10 text-[#047857] flex items-center justify-center font-bold text-xs shrink-0">
            <TrendingUp size={14} />
          </div>
          <div>
            <span className="font-semibold text-[#171717]">{row.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Financial Dimension",
      sortable: true,
      render: (row) => (
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded border ${
            row.type === AnalyticType.INCOME
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: "budgets",
      header: "Active Budgets Linked",
      render: (row) => (
        <span className="text-xs text-[#3D3A36]">
          {row._count?.budgets ?? 0} budget line(s)
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
      searchPlaceholder="Search analytic accounts..."
      emptyMessage="No analytic accounts created. Click '+ New Analytic Account' to define cost/profit centres."
    />
  );
}
