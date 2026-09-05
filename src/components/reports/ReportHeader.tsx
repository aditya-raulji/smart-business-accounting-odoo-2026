// Shared Financial Report Header Client Component for Urban Furniture Accounting System.
// Yeh component saare financial report pages (/reports/*) par top header, Fiscal Year dropdown filter, Print button, aur Back button render karta hai.
// Print Feature: 'Print' button calling window.print() triggers browser print dialog. Controls are wrapped in 'no-print' class to hide during PDF printing.
// Used by: ProfitAndLossView, BalanceSheetView, and BudgetReportView components.

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Calendar } from "lucide-react";

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  selectedYear: number;
  availableYears: number[];
}

export function ReportHeader({
  title,
  subtitle,
  selectedYear,
  availableYears,
}: ReportHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleYearChange = (newYear: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", newYear);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4 no-print">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">{title}</h1>
          <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Fiscal Year Selector */}
        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-300">
          <Calendar className="w-4 h-4 text-stone-500" />
          <span className="text-xs font-semibold uppercase text-stone-600">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="bg-transparent text-sm font-bold text-stone-900 focus:outline-none cursor-pointer"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                FY {y}
              </option>
            ))}
          </select>
        </div>

        {/* Print Button */}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Print Statement
        </button>
      </div>
    </div>
  );
}
