// Chart of Account Edit Form client component for Urban Furniture Accounting System.
// What: Client component for editing non-system accounts and archiving accounts (system or custom).
// Why: Enforces rule §6.3: isSystem accounts can never have their name changed or be deleted,
//      protecting financial integrity across journals.
// Used by: /master/chart-of-accounts/[id] page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { updateAccount, archiveAccount } from "@/lib/actions/accounts.actions";
import { AccountType } from "@prisma/client";
import { AlertCircle, CheckCircle2, Lock, Trash2 } from "lucide-react";

interface AccountData {
  id: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
}

export function AccountEditForm({ account }: { account: AccountData }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: account.name,
    type: account.type,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (account.isSystem) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await updateAccount(account.id, formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Account updated successfully!");
    }
  }

  async function handleArchive() {
    if (!confirm(`Are you sure you want to archive ${account.name}?`)) return;
    setArchiving(true);
    const res = await archiveAccount(account.id);
    setArchiving(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/chart-of-accounts");
    }
  }

  return (
    <Card className="p-8">
      {account.isSystem && (
        <div className="mb-6 p-4 rounded bg-[#171717] text-[#FFFDF8] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-[#B91C1C]" />
            <span>
              <strong>System Account:</strong> This account is a protected core ledger element.
              Modifications to its name or type are locked to maintain double-entry integrity.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Account Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={account.isSystem}
          required
        />

        <Select
          label="Account Classification"
          value={formData.type}
          onChange={(e) =>
            setFormData({
              ...formData,
              type: e.target.value as AccountType,
            })
          }
          disabled={account.isSystem}
          options={[
            { value: AccountType.CASH, label: "Cash" },
            { value: AccountType.BANK, label: "Bank" },
            { value: AccountType.ASSET, label: "Asset" },
            { value: AccountType.LIABILITY, label: "Liability" },
            { value: AccountType.CAPITAL, label: "Capital / Equity" },
            { value: AccountType.INCOME, label: "Income / Revenue" },
            { value: AccountType.EXPENSE, label: "Expense" },
          ]}
        />

        <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleArchive}
            disabled={loading || archiving}
            className="text-red-700 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 size={14} className="mr-1.5" />
            {archiving ? "Archiving..." : "Archive Account"}
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/master/chart-of-accounts")}
              disabled={loading}
            >
              Back
            </Button>
            {!account.isSystem && (
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
}
