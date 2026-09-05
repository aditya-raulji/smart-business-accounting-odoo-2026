// Journal Entry Read-Only Detail View Page for Urban Furniture Accounting System.
// Yeh page specific Double-Entry Journal Entry ki saari legs (JournalItems) display karta hai.
// Audit Proof: Footer me Sum of Debits aur Sum of Credits ka exact match (e.g. ₹10,000 = ₹10,000) proof ke roop me dikhaya jata hai.
// Specification §2.7 Compliance: Header metadata (Accounting Date, Journal, Reference, Partner) + Table (Account | Partner | Debit | Credit).
// Used by: /accounting/journal-entries/[id] route.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getJournalEntryById } from "@/lib/actions/journal-entries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JournalEntryDetailPage({ params }: PageProps) {
  const { id } = await params;

  const entry = await getJournalEntryById(id);
  if (!entry) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Journal Entry ${entry.reference}`}
        subtitle={`System auto-generated double-entry record for ${entry.journalName} journal.`}
        action={
          <Link
            href="/accounting/journal-entries"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-white border border-[#E2D9CC] text-[#171717] hover:bg-[#F7F4EE]"
          >
            <ArrowLeft size={14} />
            Back to Journal Entries
          </Link>
        }
      />

      {/* Header Info Card */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
              Document Reference
            </label>
            <span className="text-sm font-bold text-[#171717]">{entry.reference}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
              Journal Book
            </label>
            <span className="text-sm font-medium text-[#171717]">
              {entry.journalName} ({entry.journalType})
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
              Accounting Date
            </label>
            <span className="text-sm font-medium text-[#171717]">
              {new Date(entry.accountingDate).toLocaleDateString("en-IN")}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
              Partner
            </label>
            <span className="text-sm font-medium text-[#171717]">{entry.partnerName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E2D9CC] mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#3D3A36]">Status:</span>
            <Badge variant="success">{entry.status}</Badge>
          </div>

          {entry.isBalanced ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <CheckCircle size={14} className="text-emerald-600" />
              Double-Entry Balanced: Debit = Credit
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-50 text-red-800 border border-red-200 text-xs font-semibold">
              <AlertTriangle size={14} className="text-red-600" />
              Warning: Unbalanced Entry
            </div>
          )}
        </div>

        {/* Journal Items Table */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#171717]">Ledger Debit & Credit Items</h3>

          <div className="overflow-x-auto border border-[#E2D9CC] rounded-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFDF8] border-b border-[#E2D9CC] text-[#3D3A36] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Account Type</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3 text-right w-36">Debit (₹)</th>
                  <th className="px-4 py-3 text-right w-36">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D9CC]">
                {entry.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FFFDF8]">
                    <td className="px-4 py-3 font-semibold text-[#171717]">
                      {item.accountName}
                    </td>
                    <td className="px-4 py-3 text-[#3D3A36]">
                      <span className="px-2 py-0.5 rounded bg-[#171717]/5 font-mono text-[11px]">
                        {item.accountType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#3D3A36]">{item.partnerName}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#171717]">
                      {item.debit > 0
                        ? `₹${item.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#171717]">
                      {item.credit > 0
                        ? `₹${item.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer with Column Totals Matching Proof */}
              <tfoot className="bg-[#FFFDF8] border-t-2 border-[#171717] font-bold text-xs">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-[#171717] uppercase tracking-wider">
                    Total Audit Ledger Sum:
                  </td>
                  <td className="px-4 py-3 text-right text-[#B91C1C]">
                    ₹{entry.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-[#B91C1C]">
                    ₹{entry.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
