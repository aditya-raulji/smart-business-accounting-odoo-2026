// Balance Sheet Financial Statement Client View Component for Urban Furniture Accounting System.
// Yeh Client Component Balance Sheet statement display karta hai with Assets, Liabilities, Capital, synthetic Retained Earnings, and double-entry equation balance verification.
// Spec & Accounting Equation Rules per Spec §3.2:
// - Assets section (Bank, Cash, Debtors) with Total Assets subtotal.
// - Liabilities section (Creditors, Tax Payable) with Total Liabilities subtotal.
// - Capital section with Owner's Capital and synthetic "Retained Earnings" (cumulative all-time Net Income).
// - Verification Footer: Total Assets == Total Liabilities + Total Capital with green ✓ check badge.
// Used by: /reports/balance-sheet/page.tsx.

"use client";

import { ReportHeader } from "./ReportHeader";
import { BalanceSheetData } from "@/lib/reports/balance-sheet";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function BalanceSheetView({ data }: { data: BalanceSheetData }) {
  const formatINR = (val: number) =>
    `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 print:max-w-none print:p-0">
      <ReportHeader
        title="Balance Sheet"
        subtitle="Financial position statement reporting permanent assets, liabilities, and owner's equity as of year-end."
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
            Statement of Financial Position (Balance Sheet)
          </h3>
          <p className="text-xs text-stone-500 font-mono">
            As of 31 December {data.year}
          </p>
        </div>

        {/* 1. ASSETS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-stone-900 pb-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
              1. Assets (Bank, Cash & Receivables)
            </h4>
            <span className="text-xs font-semibold text-stone-500 uppercase">Balance (₹)</span>
          </div>

          <div className="divide-y divide-stone-100 pl-2">
            {data.assetItems.length === 0 ? (
              <p className="py-2 text-xs text-stone-400 italic">No active asset accounts found.</p>
            ) : (
              data.assetItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">
                    {item.name} <span className="text-xs text-stone-400 font-normal">({item.type})</span>
                  </span>
                  <span className="font-mono text-stone-900 font-semibold">{formatINR(item.balance)}</span>
                </div>
              ))
            )}
          </div>

          {/* Total Assets Subtotal */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-stone-900 font-bold text-sm text-[#171717] bg-stone-50 p-3 rounded-lg print:bg-transparent print:p-0">
            <span>Total Assets (A)</span>
            <span className="font-mono text-base">{formatINR(data.totalAssets)}</span>
          </div>
        </div>

        {/* 2. LIABILITIES SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-stone-900 pb-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
              2. Liabilities (Creditors & Taxes Owed)
            </h4>
            <span className="text-xs font-semibold text-stone-500 uppercase">Balance (₹)</span>
          </div>

          <div className="divide-y divide-stone-100 pl-2">
            {data.liabilityItems.length === 0 ? (
              <p className="py-2 text-xs text-stone-400 italic">No active liability accounts found.</p>
            ) : (
              data.liabilityItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">{item.name}</span>
                  <span className="font-mono text-stone-900 font-semibold">{formatINR(item.balance)}</span>
                </div>
              ))
            )}
          </div>

          {/* Total Liabilities Subtotal */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-stone-900 font-bold text-sm text-[#171717] bg-stone-50 p-3 rounded-lg print:bg-transparent print:p-0">
            <span>Total Liabilities (B)</span>
            <span className="font-mono text-base">{formatINR(data.totalLiabilities)}</span>
          </div>
        </div>

        {/* 3. CAPITAL & EQUITY SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-stone-900 pb-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
              3. Capital & Retained Equity
            </h4>
            <span className="text-xs font-semibold text-stone-500 uppercase">Balance (₹)</span>
          </div>

          <div className="divide-y divide-stone-100 pl-2">
            {data.capitalItems.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-medium text-stone-800">{item.name}</span>
                <span className="font-mono text-stone-900 font-semibold">{formatINR(item.balance)}</span>
              </div>
            ))}

            {/* Synthetic Retained Earnings Line */}
            <div className="py-2.5 flex items-center justify-between text-sm bg-amber-50/50 px-2 rounded print:bg-transparent print:p-0">
              <div>
                <span className="font-semibold text-amber-900">Retained Earnings</span>
                <p className="text-[11px] text-stone-500">Cumulative all-time net operational profit</p>
              </div>
              <span className="font-mono text-amber-900 font-bold">{formatINR(data.retainedEarnings)}</span>
            </div>
          </div>

          {/* Total Capital Subtotal */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-stone-900 font-bold text-sm text-[#171717] bg-stone-50 p-3 rounded-lg print:bg-transparent print:p-0">
            <span>Total Equity & Capital (C)</span>
            <span className="font-mono text-base">{formatINR(data.totalCapital)}</span>
          </div>
        </div>

        {/* 4. FOOTER DOUBLE-ENTRY BALANCE EQUATION VERIFICATION */}
        <div
          className={`p-4 rounded-xl border-2 space-y-3 ${
            data.isBalanced
              ? "bg-emerald-50 border-emerald-300 text-stone-900"
              : "bg-red-50 border-red-300 text-red-900"
          } print:border-stone-900 print:bg-transparent`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.isBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="font-bold text-sm uppercase tracking-wider">
                {data.isBalanced
                  ? "Fundamental Accounting Equation Verified (Balanced)"
                  : "Warning: Balance Sheet Unbalanced"}
              </span>
            </div>
            <span className="font-mono font-bold text-xs uppercase px-2 py-0.5 rounded bg-white border border-stone-200">
              {data.isBalanced ? "✓ BALANCED" : "✗ UNBALANCED"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-300 text-sm">
            <div>
              <span className="text-xs text-stone-500 font-medium">Total Assets (A):</span>
              <p className="font-mono text-lg font-bold text-[#171717]">{formatINR(data.totalAssets)}</p>
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium">Total Liabilities + Capital (B + C):</span>
              <p className="font-mono text-lg font-bold text-[#171717]">{formatINR(data.totalLiabilitiesAndCapital)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
