// Create Ledger Account page for Urban Furniture Accounting System.
// What: Interactive form to create a new Chart of Accounts ledger entry.
// Why: Enables accountants and administrators to expand the chart of accounts as business needs evolve.
// Used by: /master/chart-of-accounts/new route.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createAccount } from "@/lib/actions/accounts.actions";
import { AccountType } from "@prisma/client";
import { AlertCircle } from "lucide-react";

export default function NewAccountPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    type: AccountType.EXPENSE as AccountType,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createAccount(formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/chart-of-accounts");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create Account"
        subtitle="Define a new account category in the General Ledger."
      />

      <Card className="p-8">
        {error && (
          <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Account Name"
            placeholder="e.g. Office Rent, Marketing Expense, Equipment"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            options={[
              { value: AccountType.CASH, label: "Cash (Liquid Current Asset)" },
              { value: AccountType.BANK, label: "Bank (Checking & Savings)" },
              { value: AccountType.ASSET, label: "Asset (Receivables, Inventory, Property)" },
              { value: AccountType.LIABILITY, label: "Liability (Payables, Loans)" },
              { value: AccountType.CAPITAL, label: "Capital / Equity (Owner equity, retained earnings)" },
              { value: AccountType.INCOME, label: "Income / Revenue (Sales, interest, fees)" },
              { value: AccountType.EXPENSE, label: "Expense (Operating costs, purchases, overhead)" },
            ]}
          />

          <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
