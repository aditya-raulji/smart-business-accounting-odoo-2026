// Budget Performance Report Client View Component for Urban Furniture Accounting System.
// Yeh Client Component active Confirmed aur Revised budgets ki performance statement summary table render karta hai.
// Spec & Design Rules per Spec §3.3:
// - Columns: Budget Name, Analytic Account, Type, Committed Amount, Achieved Amount, Achieved %, Amount To Achieve.
// - Footer Summary Row: Sum of Committed & Achieved across visible active budgets.
// Used by: /reports/budget-report/page.tsx.

"use client";

import { ReportHeader } from "./ReportHeader";
import { BudgetReportData } from "@/lib/reports/budget-report";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function BudgetReportView({ data }: { data: BudgetReportData }) {
  const formatINR = (val: number) =>
    `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 print:max-w-none print:p-0">
      <ReportHeader
        title="Budget Performance Report"
        subtitle="Performance tracking statement comparing planned committed targets against live achieved bill and invoice line totals."
        selectedYear={data.year}
        availableYears={data.availableYears}
      />

      {/* Main Statement Document Sheet */}
      <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6 print:shadow-none print:border-none print:p-0">
        {/* Printable Letterhead Header */}
        <div className="border-b border-stone-300 pb-4 text-center space-y-1">
          <h2 className="text-xl font-black uppercase tracking-wider text-[#171717]">
            Urban Furniture Accounting System
          </h2>
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-600">
            Budget Performance & Variance Statement
          </h3>
          <p className="text-xs text-stone-500 font-mono">
            Fiscal Year {data.year} (Confirmed & Revised Budgets)
          </p>
        </div>

        {/* Budgets Table */}
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left text-sm text-stone-700">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Budget Title</th>
                <th className="py-3 px-4">Analytic Dimension</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Committed (₹)</th>
                <th className="py-3 px-4 text-right">Achieved (₹)</th>
                <th className="py-3 px-4 text-right">Achieved %</th>
                <th className="py-3 px-4 text-right">To Achieve (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-stone-400 italic">
                    No confirmed or revised budgets active for Fiscal Year {data.year}.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => {
                  const isOver = item.amountToAchieve < 0;
                  return (
                    <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#171717]">
                        <Link
                          href={`/master/budgets/${item.id}`}
                          className="hover:underline inline-flex items-center gap-1 group"
                        >
                          {item.name}
                          <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-stone-700 no-print" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-stone-700">
                        {item.analyticAccountName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                          {item.analyticAccountType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-900 font-semibold">
                        {formatINR(item.committedAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-900 font-semibold">
                        {formatINR(item.achievedAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={isOver ? "text-red-700" : "text-emerald-700"}>
                          {item.achievedPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-semibold ${isOver ? "text-red-700" : "text-stone-900"}`}>
                        {formatINR(item.amountToAchieve)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Summary Row */}
            <tfoot className="bg-stone-100 font-bold text-stone-900 border-t-2 border-stone-900 text-sm">
              <tr>
                <td colSpan={3} className="py-3.5 px-4 text-left text-xs uppercase tracking-wider text-stone-700">
                  Total Summary ({data.items.length} Active Budgets)
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  {formatINR(data.totalCommitted)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  {formatINR(data.totalAchieved)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-base">
                  {data.overallPercentage.toFixed(1)}%
                </td>
                <td className={`py-3.5 px-4 text-right font-mono ${data.totalAmountToAchieve < 0 ? "text-red-700" : ""}`}>
                  {formatINR(data.totalAmountToAchieve)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
