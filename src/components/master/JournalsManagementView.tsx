// Journals Management View Client Component for Urban Furniture Accounting System.
// Yeh Client Component Journals list render karta hai with Edit modal and 1-journal-per-type uniqueness enforcement.
// System Lock: Seeded system journals allow editing Name and Default Account, but lock `Type` to prevent breaking auto-posting lookups.
// Used by: /master/journals/page.tsx.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/ui/DataTable";
import { JournalType } from "@prisma/client";
import { Lock, BookCheck, Edit2, Plus, AlertCircle, X } from "lucide-react";
import {
  createJournal,
  updateJournal,
} from "@/lib/actions/journals.actions";

export interface AccountOption {
  id: string;
  name: string;
  type: string;
}

export interface JournalItem {
  id: string;
  name: string;
  type: JournalType;
  isSystem: boolean;
  defaultAccountId: string;
  defaultAccount: {
    id: string;
    name: string;
    type: string;
  };
  createdAt: string | Date;
}

interface JournalsManagementViewProps {
  journals: JournalItem[];
  accounts: AccountOption[];
}

export function JournalsManagementView({ journals, accounts }: JournalsManagementViewProps) {
  const router = useRouter();

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<JournalItem | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [type, setType] = useState<JournalType>(JournalType.SALES);
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openCreateModal = () => {
    setName("");
    setType(JournalType.SALES);
    setDefaultAccountId(accounts[0]?.id || "");
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (j: JournalItem) => {
    setEditingJournal(j);
    setName(j.name);
    setType(j.type);
    setDefaultAccountId(j.defaultAccountId);
    setErrorMsg(null);
  };

  const closeModal = () => {
    setIsCreateOpen(false);
    setEditingJournal(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (editingJournal) {
        const res = await updateJournal(editingJournal.id, {
          name,
          type,
          defaultAccountId,
        });
        if (res.error) setErrorMsg(res.error);
        else {
          closeModal();
          router.refresh();
        }
      } else {
        const res = await createJournal({
          name,
          type,
          defaultAccountId,
        });
        if (res.error) setErrorMsg(res.error);
        else {
          closeModal();
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save journal.");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<JournalItem>[] = [
    {
      key: "name",
      header: "Journal Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 border border-stone-200 flex items-center justify-center font-bold text-xs shrink-0">
            <BookCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#171717]">
                {row.name}
              </span>
              {row.isSystem && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-900 text-white">
                  <Lock className="w-2.5 h-2.5" />
                  System
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Journal Type",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
          {row.type}
        </span>
      ),
    },
    {
      key: "defaultAccount",
      header: "Default Ledger Account",
      render: (row) => (
        <span className="text-xs text-stone-700 font-medium">
          {row.defaultAccount?.name || "—"} ({row.defaultAccount?.type})
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="Edit journal"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Actions */}
      <div className="flex justify-end bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          + New Journal
        </button>
      </div>

      {/* Journals Table */}
      <DataTable
        data={journals}
        columns={columns}
        rowKey={(r) => r.id}
        searchKeys={["name", "type"]}
        searchPlaceholder="Search journals by name or type..."
        emptyMessage="No journals recorded."
      />

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingJournal) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-lg font-bold text-[#171717]">
                {editingJournal ? "Edit Journal" : "Create New Journal"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Journal Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Journal"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Journal Type *
                  </label>
                  {editingJournal?.isSystem && (
                    <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System Type Locked
                    </span>
                  )}
                </div>
                <select
                  disabled={editingJournal?.isSystem}
                  value={type}
                  onChange={(e) => setType(e.target.value as JournalType)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717] disabled:bg-stone-100 disabled:text-stone-500"
                >
                  {Object.values(JournalType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-400 mt-1">
                  Note: Only one active journal per Type is permitted.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Default Ledger Account *
                </label>
                <select
                  required
                  value={defaultAccountId}
                  onChange={(e) => setDefaultAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#171717] hover:bg-stone-800 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingJournal ? "Update Journal" : "Create Journal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
