// Create Budget client form for Urban Furniture Accounting System.
// What: Client form to initiate a new Budget in DRAFT status.
// Why: Enforces start/end period chronological validity and positive committed financial amount.
// Used by: /master/budgets/new page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createBudget } from "@/lib/actions/budgets.actions";
import { AlertCircle } from "lucide-react";

interface OptionItem {
  id: string;
  name: string;
}

export function BudgetNewForm({
  contacts,
  analyticAccounts,
}: {
  contacts: OptionItem[];
  analyticAccounts: OptionItem[];
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    periodStart: new Date().toISOString().split("T")[0],
    periodEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    responsibleId: contacts[0]?.id || "",
    analyticAccountId: analyticAccounts[0]?.id || "",
    committedAmount: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createBudget({
      name: formData.name,
      periodStart: new Date(formData.periodStart),
      periodEnd: new Date(formData.periodEnd),
      responsibleId: formData.responsibleId,
      analyticAccountId: formData.analyticAccountId,
      committedAmount: Number(formData.committedAmount) || 0,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/budgets");
    }
  }

  return (
    <Card className="p-8">
      {error && (
        <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {contacts.length === 0 || analyticAccounts.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#3D3A36] space-y-3">
          <p>
            You need at least one Contact and one Analytic Account before you can configure a budget.
          </p>
          <div className="flex justify-center gap-3">
            {contacts.length === 0 && (
              <Button onClick={() => router.push("/master/contacts/new")}>
                + Create Contact
              </Button>
            )}
            {analyticAccounts.length === 0 && (
              <Button onClick={() => router.push("/master/analytic-accounts/new")}>
                + Create Analytic Account
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Budget Name / Title"
            placeholder="e.g. Q1 2026 Raw Materials Procurement"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Analytic Cost/Profit Dimension"
              value={formData.analyticAccountId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  analyticAccountId: e.target.value,
                })
              }
              options={analyticAccounts.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />

            <Select
              label="Responsible Person / Contact"
              value={formData.responsibleId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  responsibleId: e.target.value,
                })
              }
              options={contacts.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Period Start Date"
              type="date"
              value={formData.periodStart}
              onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
              required
            />

            <Input
              label="Period End Date"
              type="date"
              value={formData.periodEnd}
              onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
              required
            />
          </div>

          <Input
            label="Committed Budget Amount (₹)"
            type="number"
            step="0.01"
            min="1"
            placeholder="500000"
            value={formData.committedAmount}
            onChange={(e) => setFormData({ ...formData, committedAmount: e.target.value })}
            helperText="Total financial ceiling allocated to this analytic dimension"
            required
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
              {loading ? "Creating Draft..." : "Create Budget (Draft)"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
