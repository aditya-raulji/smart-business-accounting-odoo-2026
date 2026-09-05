// Unified Journal Entry Form Client Component for Urban Furniture Accounting System.
// Yeh component manual entry creation (/accounting/journal-entries/new) aur detail/edit view (/accounting/journal-entries/[id]) render karta hai.
// Core Feature: Real-time running Debit & Credit totals calculation, inline mismatch validation for Post button, system auto-entry lock with source document navigation link.
// Alternative Rejected: Auto-generated entries ko editable form me open karne dena — rejecting because modifying auto entries corrupts ledger consistency with original source documents.
// Used by: /accounting/journal-entries/new/page.tsx and /accounting/journal-entries/[id]/page.tsx.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, Plus, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  createManualJournalEntry,
  postJournalEntry,
  cancelJournalEntry,
  resetJournalEntryToDraft,
  JournalEntryItemInput,
} from "@/lib/actions/journal-entries";

export interface AccountOption {
  id: string;
  name: string;
  code?: string | null;
  type: string;
}

export interface JournalOption {
  id: string;
  name: string;
  type: string;
}

export interface ContactOption {
  id: string;
  name: string;
  type: string;
}

export interface JournalEntryFormProps {
  mode: "create" | "detail";
  journals: JournalOption[];
  accounts: AccountOption[];
  contacts: ContactOption[];
  defaultReference?: string;
  initialData?: {
    id: string;
    journalId: string;
    journalName: string;
    journalType: string;
    accountingDate: string | Date;
    reference: string;
    partnerId?: string | null;
    partnerName?: string;
    status: "DRAFT" | "POSTED" | "CANCELLED";
    items: Array<{
      id?: string;
      accountId: string;
      accountName?: string;
      accountCode?: string;
      partnerId?: string | null;
      partnerName?: string;
      debit: number;
      credit: number;
    }>;
    isAuto: boolean;
    sourceDocLink?: string | null;
    sourceDocNumber?: string | null;
    sourceDocType?: string | null;
  };
}

export function JournalEntryForm({
  mode,
  journals,
  accounts,
  contacts,
  defaultReference = "JE-00001",
  initialData,
}: JournalEntryFormProps) {
  const router = useRouter();

  // State management
  const [journalId, setJournalId] = useState<string>(
    initialData?.journalId || (journals[0]?.id ?? "")
  );
  const [accountingDate, setAccountingDate] = useState<string>(
    initialData?.accountingDate
      ? new Date(initialData.accountingDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [reference, setReference] = useState<string>(
    initialData?.reference || defaultReference
  );
  const [partnerId, setPartnerId] = useState<string>(initialData?.partnerId || "");

  // Line items state
  const [items, setItems] = useState<JournalEntryItemInput[]>(
    initialData?.items
      ? initialData.items.map((i) => ({
          accountId: i.accountId,
          partnerId: i.partnerId || undefined,
          debit: Number(i.debit) || 0,
          credit: Number(i.credit) || 0,
        }))
      : [
          { accountId: accounts[0]?.id || "", debit: 0, credit: 0 },
          { accountId: accounts[1]?.id || accounts[0]?.id || "", debit: 0, credit: 0 },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAuto = initialData?.isAuto ?? false;
  const status = initialData?.status ?? "DRAFT";
  const isReadOnly = isAuto || (mode === "detail" && status !== "DRAFT");

  // Calculate live running totals
  const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const isBalanced = Math.abs(diff) < 0.01 && totalDebit > 0;

  // Line level validation check
  const areLinesValid = items.every((item) => {
    const d = Number(item.debit) || 0;
    const c = Number(item.credit) || 0;
    return Boolean(item.accountId) && ((d > 0 && c === 0) || (c > 0 && d === 0));
  });

  const canPost = isBalanced && areLinesValid && !loading;

  // Add line item row
  const addRow = () => {
    if (isReadOnly) return;
    setItems([...items, { accountId: accounts[0]?.id || "", debit: 0, credit: 0 }]);
  };

  // Remove line item row
  const removeRow = (index: number) => {
    if (isReadOnly || items.length <= 2) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Update line item field
  const updateItem = (
    index: number,
    field: keyof JournalEntryItemInput,
    value: string | number
  ) => {
    if (isReadOnly) return;
    const newItems = [...items];
    if (field === "debit") {
      const numVal = Math.max(0, Number(value) || 0);
      newItems[index] = { ...newItems[index], debit: numVal, credit: numVal > 0 ? 0 : newItems[index].credit };
    } else if (field === "credit") {
      const numVal = Math.max(0, Number(value) || 0);
      newItems[index] = { ...newItems[index], credit: numVal, debit: numVal > 0 ? 0 : newItems[index].debit };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  // Handle Create Draft / Save action
  const handleSaveDraft = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "create") {
        const res = await createManualJournalEntry({
          journalId,
          accountingDate: new Date(accountingDate),
          reference,
          partnerId: partnerId || null,
          items,
        });

        if (res.success && res.id) {
          router.push(`/accounting/journal-entries/${res.id}`);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save journal entry.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Post action
  const handlePost = async () => {
    if (!initialData?.id && mode === "create") {
      setErrorMsg(null);
      setLoading(true);
      try {
        const createRes = await createManualJournalEntry({
          journalId,
          accountingDate: new Date(accountingDate),
          reference,
          partnerId: partnerId || null,
          items,
        });

        if (createRes.success && createRes.id) {
          await postJournalEntry(createRes.id);
          router.push(`/accounting/journal-entries/${createRes.id}`);
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to post entry.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (initialData?.id) {
      setErrorMsg(null);
      setLoading(true);
      try {
        await postJournalEntry(initialData.id);
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to post entry.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Cancel action
  const handleCancel = async () => {
    if (!initialData?.id) return;
    if (!confirm("Are you sure you want to cancel this manual journal entry?")) return;

    setErrorMsg(null);
    setLoading(true);
    try {
      await cancelJournalEntry(initialData.id);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to cancel entry.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset to Draft action
  const handleResetToDraft = async () => {
    if (!initialData?.id) return;

    setErrorMsg(null);
    setLoading(true);
    try {
      await resetJournalEntryToDraft(initialData.id);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to reset entry to draft.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/accounting/journal-entries")}
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="Back to Journal Entries"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#171717]">
                {mode === "create" ? "New Journal Entry" : reference}
              </h1>
              {mode === "detail" && (
                <Badge
                  variant={
                    status === "POSTED"
                      ? "success"
                      : status === "DRAFT"
                      ? "warning"
                      : "danger"
                  }
                >
                  {status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-stone-500 mt-0.5">
              {mode === "create"
                ? "Create a manual double-entry voucher"
                : `Journal Entry details (${isAuto ? "Auto-Generated System Entry" : "Manual Entry"})`}
            </p>
          </div>
        </div>

        {/* Action Buttons based on state & permissions */}
        <div className="flex items-center gap-2">
          {isAuto ? (
            <Link
              href={initialData?.sourceDocLink || "#"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
            >
              View source: {initialData?.sourceDocType} {initialData?.sourceDocNumber}
              <ExternalLink className="w-4 h-4" />
            </Link>
          ) : (
            <>
              {mode === "create" && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={loading}
                    className="px-4 py-2 border border-stone-300 text-stone-700 bg-white text-sm font-medium rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={handlePost}
                    disabled={!canPost}
                    className="px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Post
                  </button>
                </>
              )}

              {mode === "detail" && status === "DRAFT" && (
                <>
                  <button
                    onClick={handlePost}
                    disabled={!canPost}
                    className="px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Post
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-4 py-2 border border-red-300 text-red-700 bg-white text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}

              {mode === "detail" && status === "POSTED" && (
                <>
                  <button
                    onClick={handleResetToDraft}
                    disabled={loading}
                    className="px-4 py-2 border border-stone-300 text-stone-800 bg-white text-sm font-medium rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors"
                  >
                    Reset to Draft
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-4 py-2 border border-red-300 text-red-700 bg-white text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel Entry
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Auto-generated banner notice */}
      {isAuto && (
        <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl flex items-center justify-between gap-4 text-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-200 text-stone-700 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Auto-Generated Entry (Read-Only)</p>
              <p className="text-xs text-stone-600">
                This entry was automatically posted by {initialData?.sourceDocType} #{initialData?.sourceDocNumber}.
                Auto-generated entries are read-only to preserve ledger integrity.
              </p>
            </div>
          </div>
          {initialData?.sourceDocLink && (
            <Link
              href={initialData.sourceDocLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-stone-900 border border-stone-300 text-xs font-semibold rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap"
            >
              View source {initialData.sourceDocType} →
            </Link>
          )}
        </div>
      )}

      {/* Error message alert */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Header Fields Section */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Accounting Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Accounting Date *
            </label>
            <input
              type="date"
              disabled={isReadOnly}
              value={accountingDate}
              onChange={(e) => setAccountingDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717] disabled:bg-stone-100 disabled:text-stone-500"
            />
          </div>

          {/* Journal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Journal *
            </label>
            <select
              disabled={isReadOnly}
              value={journalId}
              onChange={(e) => setJournalId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717] disabled:bg-stone-100 disabled:text-stone-500"
            >
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} ({j.type})
                </option>
              ))}
            </select>
          </div>

          {/* Reference / Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Reference / Number *
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. JE-00001"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717] disabled:bg-stone-100 disabled:text-stone-500"
            />
          </div>
        </div>

        {/* Optional Partner header */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
            Partner (Optional Header Partner)
          </label>
          <select
            disabled={isReadOnly}
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full md:w-1/3 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717] disabled:bg-stone-100 disabled:text-stone-500"
          >
            <option value="">-- None --</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h2 className="text-sm font-semibold text-[#171717]">Journal Items (Double Entry Lines)</h2>
          {!isReadOnly && (
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-800 hover:bg-stone-200 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Line
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-700">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[220px]">Account *</th>
                <th className="py-3 px-4 min-w-[180px]">Partner (Optional)</th>
                <th className="py-3 px-4 w-40 text-right">Debit (₹)</th>
                <th className="py-3 px-4 w-40 text-right">Credit (₹)</th>
                {!isReadOnly && <th className="py-3 px-4 w-12 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50">
                  <td className="py-3 px-4 text-center text-xs text-stone-400 font-medium">
                    {idx + 1}
                  </td>
                  {/* Account select */}
                  <td className="py-3 px-4">
                    {isReadOnly ? (
                      <span className="font-medium text-stone-900">
                        {accounts.find((a) => a.id === item.accountId)?.name || item.accountId}
                      </span>
                    ) : (
                      <select
                        value={item.accountId}
                        onChange={(e) => updateItem(idx, "accountId", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Partner select */}
                  <td className="py-3 px-4">
                    {isReadOnly ? (
                      <span className="text-stone-600">
                        {contacts.find((c) => c.id === item.partnerId)?.name || "—"}
                      </span>
                    ) : (
                      <select
                        value={item.partnerId || ""}
                        onChange={(e) => updateItem(idx, "partnerId", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                      >
                        <option value="">— None —</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Debit Input */}
                  <td className="py-3 px-4 text-right">
                    {isReadOnly ? (
                      <span className="font-mono text-stone-900 font-medium">
                        {item.debit > 0
                          ? `₹${item.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.debit || ""}
                        onChange={(e) => updateItem(idx, "debit", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-sm text-right font-mono border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                      />
                    )}
                  </td>

                  {/* Credit Input */}
                  <td className="py-3 px-4 text-right">
                    {isReadOnly ? (
                      <span className="font-mono text-stone-900 font-medium">
                        {item.credit > 0
                          ? `₹${item.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.credit || ""}
                        onChange={(e) => updateItem(idx, "credit", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-sm text-right font-mono border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                      />
                    )}
                  </td>

                  {/* Remove Row Button */}
                  {!isReadOnly && (
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={items.length <= 2}
                        className="p-1 text-stone-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                        title="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>

            {/* Running Column Totals Footer */}
            <tfoot className="bg-stone-100 font-semibold text-stone-900 border-t border-stone-300">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-stone-600">
                  Total
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-[#171717]">
                  ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-[#171717]">
                  ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                {!isReadOnly && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Validation Mismatch Live Indicator (Manual mode only) */}
      {!isReadOnly && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            isBalanced && areLinesValid
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {isBalanced && areLinesValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {isBalanced && areLinesValid
                  ? "Journal Entry is Balanced and Ready to Post"
                  : "Double-Entry Validation Warning"}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {!isBalanced
                  ? `Debit ₹${totalDebit.toLocaleString("en-IN")} ≠ Credit ₹${totalCredit.toLocaleString("en-IN")} (Difference: ₹${Math.abs(diff).toLocaleString("en-IN")})`
                  : !areLinesValid
                  ? "Every line must specify either Debit or Credit (not both and not zero)."
                  : "Debit and Credit totals match exactly."}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-xs">
            {isBalanced && areLinesValid ? "BALANCED" : "UNBALANCED"}
          </span>
        </div>
      )}
    </div>
  );
}
