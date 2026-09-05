// Budget Achieved Drilldown Modal Client Component for Urban Furniture Accounting System.
// Yeh modal budget achieved amount me contribute karne wale saare individual VendorBill / CustomerInvoice line items list karta hai.
// Columns per wireframe: Document No., Date, Product, Amount with direct link to source bill/invoice.
// Used by: BudgetDetailClient on /master/budgets/[id] page.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink, FileText, Loader2 } from "lucide-react";
import { getBudgetAchievedLines } from "@/lib/actions/budgets.actions";

export interface AchievedLineItem {
  id: string;
  docNumber: string;
  docDate: Date | string;
  docLink: string;
  productName: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface BudgetAchievedDrilldownModalProps {
  budgetId: string;
  budgetName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BudgetAchievedDrilldownModal({
  budgetId,
  budgetName,
  isOpen,
  onClose,
}: BudgetAchievedDrilldownModalProps) {
  const [lines, setLines] = useState<AchievedLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    getBudgetAchievedLines(budgetId)
      .then((data) => {
        if (isMounted) setLines(data);
      })
      .catch((err) => {
        console.error("Failed to load budget achieved lines:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [budgetId, isOpen]);

  if (!isOpen) return null;

  const totalAchieved = lines.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-700" />
              <h3 className="text-lg font-bold text-[#171717]">
                Budget Achieved Drill-Down
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Contributing line items for <span className="font-semibold text-stone-700">{budgetName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lines Table Section */}
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-stone-700" />
              <p className="text-sm font-medium">Calculating contributing document lines...</p>
            </div>
          ) : lines.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-1">
              <p className="text-sm font-semibold">No Contributing Lines Found</p>
              <p className="text-xs">
                No confirmed vendor bills or customer invoices tag this analytic account within the budget date range yet.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase font-semibold border-b border-stone-200 sticky top-0">
                <tr>
                  <th className="py-3 px-4">Document No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product / Item</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Line Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {lines.map((line) => (
                  <tr key={line.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={line.docLink}
                        className="inline-flex items-center gap-1 font-semibold text-stone-900 hover:text-amber-800 hover:underline"
                      >
                        {line.docNumber}
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-500">
                      {new Date(line.docDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      {line.productName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-stone-600">
                      {line.qty}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-stone-600">
                      ₹{line.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold font-mono text-stone-900">
                      ₹{line.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-stone-100 font-bold text-stone-900 border-t border-stone-300 sticky bottom-0">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-stone-600">
                    Total Achieved Sum
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-[#171717]">
                    ₹{totalAchieved.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-stone-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-[#171717] hover:bg-stone-800 rounded-lg shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
