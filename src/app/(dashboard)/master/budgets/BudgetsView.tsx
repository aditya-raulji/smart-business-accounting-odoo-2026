// Budgets list and kanban interactive view for Urban Furniture Accounting System.
// What: Client component managing view toggle (List vs Kanban by status), search filtering, and navigation.
// Why: Provides clear visualization of the Budget lifecycle (Draft, Confirmed, Revised, Cancelled).
// Used by: /master/budgets page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ViewToggle, ViewMode } from "@/components/ui/ViewToggle";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadge } from "@/components/ui/Badge";
import { DollarSign, Calendar, User, TrendingUp } from "lucide-react";
import { BudgetStatus } from "@prisma/client";

interface BudgetRecord {
  id: string;
  name: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  committedAmount: number;
  status: BudgetStatus;
  responsible: { name: string };
  analyticAccount: { name: string; type: string };
  revisionOf?: { name: string } | null;
  revisedBy?: { id: string; name: string } | null;
}

export function BudgetsView({ budgets }: { budgets: BudgetRecord[] }) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  };

  const columns: Column<BudgetRecord>[] = [
    {
      key: "name",
      header: "Budget Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#047857]/10 text-[#047857] flex items-center justify-center font-bold text-xs shrink-0">
            <DollarSign size={15} />
          </div>
          <div>
            <span className="font-semibold text-[#171717]">{row.name}</span>
            {row.revisionOf && (
              <span className="ml-2 text-[10px] text-[#A8A29E]">
                (Rev of {row.revisionOf.name})
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "analyticAccount",
      header: "Analytic Dimension",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-[#171717]">
          <TrendingUp size={13} className="text-[#047857]" />
          <span>{row.analyticAccount.name}</span>
        </div>
      ),
    },
    {
      key: "responsible",
      header: "Responsible",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-[#3D3A36]">
          <User size={13} className="text-[#A8A29E]" />
          <span>{row.responsible.name}</span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-[#3D3A36]">
          <Calendar size={13} className="text-[#A8A29E]" />
          <span>
            {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
          </span>
        </div>
      ),
    },
    {
      key: "committedAmount",
      header: "Committed Amount",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">
          {formatCurrency(row.committedAmount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Lifecycle Status",
      sortable: true,
      render: (row) => {
        const b = statusToBadge(row.status);
        return <Badge variant={b.variant} label={b.label} />;
      },
    },
  ];

  const statusColumns: { key: BudgetStatus; label: string; accent: string }[] = [
    { key: BudgetStatus.DRAFT, label: "Draft", accent: "#3D3A36" },
    { key: BudgetStatus.CONFIRMED, label: "Confirmed", accent: "#047857" },
    { key: BudgetStatus.REVISED, label: "Revised", accent: "#B45309" },
    { key: BudgetStatus.CANCELLED, label: "Cancelled", accent: "#7F1D1D" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <DataTable
          data={budgets}
          columns={columns}
          rowKey={(r) => r.id}
          searchKeys={["name"]}
          searchPlaceholder="Search budgets by name..."
          onRowClick={(r) => router.push(`/master/budgets/${r.id}`)}
          emptyMessage="No budgets recorded. Click '+ New Budget' to initialize a fiscal plan."
        />
      ) : (
        /* Kanban View by Lifecycle Status */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusColumns.map((col) => {
            const colBudgets = budgets.filter((b) => b.status === col.key);
            const totalCommitted = colBudgets.reduce((acc, curr) => acc + curr.committedAmount, 0);

            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2D9CC]">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-[#171717]">
                      {col.label}
                    </h3>
                    <span className="text-[10px] text-[#A8A29E]">
                      {formatCurrency(totalCommitted)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#171717] bg-[#E5DED2] px-2 py-0.5 rounded-sm">
                    {colBudgets.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colBudgets.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#3D3A36] border border-dashed border-[#D4CCC0] rounded bg-[#FFFDF8]">
                      No {col.label.toLowerCase()} budgets
                    </div>
                  ) : (
                    colBudgets.map((b) => (
                      <Card
                        key={b.id}
                        onClick={() => router.push(`/master/budgets/${b.id}`)}
                        className="p-4 cursor-pointer hover:border-[#047857] transition-all hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-semibold text-sm text-[#171717]">{b.name}</span>
                          <span className="text-xs font-bold text-[#171717]">
                            {formatCurrency(b.committedAmount)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#3D3A36] pt-2 border-t border-[#E2D9CC]">
                          <div className="flex items-center gap-1.5 truncate">
                            <TrendingUp size={12} className="text-[#047857] shrink-0" />
                            <span className="truncate">{b.analyticAccount.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <User size={12} className="text-[#A8A29E] shrink-0" />
                            <span className="truncate">{b.responsible.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#A8A29E]">
                            <Calendar size={12} className="shrink-0" />
                            <span>
                              {formatDate(b.periodStart)} – {formatDate(b.periodEnd)}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
