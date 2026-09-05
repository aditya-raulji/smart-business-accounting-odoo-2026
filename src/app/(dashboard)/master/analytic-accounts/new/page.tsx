// Create Analytic Account page for Urban Furniture Accounting System.
// What: Interactive form to create a cost or profit center analytic dimension.
// Why: Enables departmental and project-level budgeting.
// Used by: /master/analytic-accounts/new route.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createAnalyticAccount } from "@/lib/actions/analytic.actions";
import { AnalyticType } from "@prisma/client";
import { AlertCircle } from "lucide-react";

export default function NewAnalyticAccountPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    type: AnalyticType.EXPENSE as AnalyticType,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createAnalyticAccount(formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/analytic-accounts");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create Analytic Account"
        subtitle="Define a new cost center or revenue category for financial budgeting."
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
            label="Analytic Account Name"
            placeholder="e.g. Workshop Manufacturing, Marketing 2026, Retail Showroom"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Select
            label="Analytic Dimension Type"
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as AnalyticType,
              })
            }
            options={[
              { value: AnalyticType.EXPENSE, label: "Expense / Cost Center" },
              { value: AnalyticType.INCOME, label: "Income / Profit Center" },
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
              {loading ? "Creating..." : "Create Analytic Dimension"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
