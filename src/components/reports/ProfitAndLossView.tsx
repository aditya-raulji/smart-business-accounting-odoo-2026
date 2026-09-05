// Profit & Loss Statement Client View Component for Urban Furniture Accounting System.
// Yeh Client Component Profit & Loss statement display karta hai with Income section, Expenses section, and Net Income / Loss calculation.
// Design & Styling Rules per Spec §3.1:
// - Income accounts list with Total Income subtotal.
// - Expenses & Other Expenses list with Total Expenses subtotal.
// - Net Income bottom row highlighted in red only if it represents a Net Loss (negative value).
// Used by: /reports/profit-and-loss/page.tsx.

"use client";

import { ReportHeader } from "./ReportHeader";
import { ProfitAndLossData } from "@/lib/reports/profit-and-loss";

export function ProfitAndLossView({ data }: { data: ProfitAndLossData }) {
  const formatINR = (val: number) =>
    `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 print:max-w-none print:p-0">
      <ReportHeader
        title="Profit & Loss Statement"
        subtitle="Income statement summarizing revenue, operating expenses, and net profit performance."
        selectedYear={data.year}
        availableYears={data.availableYears}
      />

      {/* Main Statement Document Sheet */}
      <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-8 print:shadow-none print:border-none print:p-0">
        {/* Printable Letterhead Header */}
        <div className="border-b border-stone-300 pb-4 text-center space-y-1">
          <h2 className="text-xl font-black uppercase tracking-wider text-[#171717]">
            Urban Furniture Accounting System
          </h2>
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-600">
            Statement of Profit & Loss (Income Statement)
          </h3>
          <p className="text-xs text-stone-500 font-mono">
            For the Fiscal Year Ended 31 December {data.year}
          </p>
        </div>

        {/* 1. REVENUE / INCOME SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-stone-900 pb-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
              1. Revenue & Income
            </h4>
            <span className="text-xs font-semibold text-stone-500 uppercase">Amount (₹)</span>
          </div>

          <div className="divide-y divide-stone-100 pl-2">
            {data.incomeItems.length === 0 ? (
              <p className="py-2 text-xs text-stone-400 italic">No revenue recorded in this fiscal year.</p>
            ) : (
              data.incomeItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">{item.name}</span>
                  <span className="font-mono text-stone-900 font-semibold">{formatINR(item.balance)}</span>
                </div>
              ))
            )}
          </div>

          {/* Total Income Subtotal */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-stone-900 font-bold text-sm text-[#171717] bg-stone-50 p-3 rounded-lg print:bg-transparent print:p-0">
            <span>Total Income (A)</span>
            <span className="font-mono text-base">{formatINR(data.totalIncome)}</span>
          </div>
        </div>

        {/* 2. OPERATING EXPENSES SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-stone-900 pb-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
              2. Cost & Operating Expenses
            </h4>
            <span className="text-xs font-semibold text-stone-500 uppercase">Amount (₹)</span>
          </div>

          <div className="divide-y divide-stone-100 pl-2">
            {data.expenseItems.length === 0 ? (
              <p className="py-2 text-xs text-stone-400 italic">No operating expenses recorded in this fiscal year.</p>
            ) : (
              data.expenseItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">
                    {item.name} <span className="text-xs text-stone-400 font-normal">({item.type})</span>
                  </span>
                  <span className="font-mono text-stone-900 font-semibold">{formatINR(item.balance)}</span>
                </div>
              ))
            )}
          </div>

          {/* Total Expenses Subtotal */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-stone-900 font-bold text-sm text-[#171717] bg-stone-50 p-3 rounded-lg print:bg-transparent print:p-0">
            <span>Total Operating Expenses (B)</span>
            <span className="font-mono text-base">{formatINR(data.totalExpenses)}</span>
          </div>
        </div>

        {/* 3. NET INCOME / LOSS SUMMARY BOTTOM ROW */}
        <div
          className={`p-4 rounded-xl border-2 flex items-center justify-between text-base font-black ${
            data.isNetLoss
              ? "bg-red-50 border-red-300 text-red-700"
              : "bg-emerald-50 border-emerald-300 text-[#171717]"
          } print:border-stone-900 print:bg-transparent`}
        >
          <span className="uppercase tracking-wider">
            {data.isNetLoss ? "Net Operational Loss (A - B)" : "Net Profit / Income (A - B)"}
          </span>
          <span className="font-mono text-xl">
            {formatINR(data.netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}
