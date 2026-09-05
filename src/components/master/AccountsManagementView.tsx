// Chart of Accounts Management View Client Component for Urban Furniture Accounting System.
// Yeh Client Component Chart of Accounts list render karta hai with "Show archived" filter, Edit modal, and Archive/Unarchive actions.
// System Lock: Seeded system accounts (isSystem = true) me Edit aur Archive buttons greyed out hote hain with lock icon & tooltip: "System account — used by the accounting engine, cannot be changed."
// Used by: /master/chart-of-accounts/page.tsx.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AccountType } from "@prisma/client";
import { Lock, BookOpen, Edit2, Archive, RefreshCw, Plus, AlertCircle, X } from "lucide-react";
import {
  createAccount,
  updateAccount,
  archiveAccount,
  unarchiveAccount,
} from "@/lib/actions/accounts.actions";

export interface AccountItem {
  id: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
  archived: boolean;
  createdAt: string | Date;
}

interface AccountsManagementViewProps {
  accounts: AccountItem[];
}

export function AccountsManagementView({ accounts }: AccountsManagementViewProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>(AccountType.EXPENSE);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter accounts based on archived toggle
  const filteredAccounts = accounts.filter((acc) => (showArchived ? true : !acc.archived));

  const openCreateModal = () => {
    setName("");
    setType(AccountType.EXPENSE);
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (acc: AccountItem) => {
    if (acc.isSystem) return;
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setErrorMsg(null);
  };

  const closeModal = () => {
    setIsCreateOpen(false);
    setEditingAccount(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (editingAccount) {
        const res = await updateAccount(editingAccount.id, { name, type });
        if (res.error) setErrorMsg(res.error);
        else {
          closeModal();
          router.refresh();
        }
      } else {
        const res = await createAccount({ name, type });
        if (res.error) setErrorMsg(res.error);
        else {
          closeModal();
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save account.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this account?")) return;
    setLoading(true);
    try {
      const res = await archiveAccount(id);
      if (res.error) alert(res.error);
      else router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to archive account.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (id: string) => {
    setLoading(true);
    try {
      const res = await unarchiveAccount(id);
      if (res.error) alert(res.error);
      else router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to unarchive account.");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<AccountItem>[] = [
    {
      key: "name",
      header: "Account Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${row.archived ? "line-through text-stone-400" : "text-[#171717]"}`}>
                {row.name}
              </span>
              {row.isSystem && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-900 text-white">
                  <Lock className="w-2.5 h-2.5" />
                  System
                </span>
              )}
              {row.archived && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">
                  Archived
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-100 text-stone-800 border border-stone-200">
          {row.type}
        </span>
      ),
    },
    {
      key: "status",
      header: "Governance",
      render: (row) => (
        <span className="text-xs text-stone-500">
          {row.isSystem ? "Protected default ledger" : "Custom ledger account"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {row.isSystem ? (
            <div className="relative group">
              <button
                disabled
                className="p-1.5 text-stone-300 bg-stone-100 rounded-lg cursor-not-allowed flex items-center gap-1 text-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                Locked
              </button>

              <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-20 w-56 p-2 text-[11px] bg-stone-900 text-white rounded-lg shadow-lg">
                System account — used by the accounting engine, cannot be changed.
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => openEditModal(row)}
                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                title="Edit account"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {row.archived ? (
                <button
                  onClick={() => handleUnarchive(row.id)}
                  disabled={loading}
                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                  title="Unarchive account"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Unarchive
                </button>
              ) : (
                <button
                  onClick={() => handleArchive(row.id)}
                  disabled={loading}
                  className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Archive account"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Actions & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-stone-700 font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900 border-stone-300"
          />
          Show archived accounts
        </label>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          + New Account
        </button>
      </div>

      {/* Accounts Table */}
      <DataTable
        data={filteredAccounts}
        columns={columns}
        rowKey={(r) => r.id}
        searchKeys={["name", "type"]}
        searchPlaceholder="Search accounts by name or type..."
        emptyMessage="No accounts match the current filter criteria."
      />

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingAccount) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-lg font-bold text-[#171717]">
                {editingAccount ? "Edit Account" : "Create New Account"}
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
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Office Equipment"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Account Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                >
                  {Object.values(AccountType).map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                  {loading ? "Saving..." : editingAccount ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
