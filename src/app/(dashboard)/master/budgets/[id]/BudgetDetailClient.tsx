// Budget Detail and Lifecycle Client Component for Urban Furniture Accounting System.
// What: Interactive component managing Budget state transitions:
//       Draft (edit/confirm/cancel) → Confirmed (locked, revise/cancel) → Revised/Cancelled.
// Why: Enforces the budget state machine per spec §6.6 with revision lineage tracking.
// Used by: /master/budgets/[id] page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadge } from "@/components/ui/Badge";
import {
  updateBudget,
  confirmBudget,
  reviseBudget,
  cancelBudget,
} from "@/lib/actions/budgets.actions";
import { BudgetStatus } from "@prisma/client";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  GitFork,
  XCircle,
  Check,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface BudgetDetailData {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  responsibleId: string;
  analyticAccountId: string;
  committedAmount: number;
  status: BudgetStatus;
  responsible: { name: string };
  analyticAccount: { name: string; type: string };
  revisionOf?: { id: string; name: string } | null;
  revisedBy?: { id: string; name: string } | null;
}

interface OptionItem {
  id: string;
  name: string;
}

export function BudgetDetailClient({
  budget,
  contacts,
  analyticAccounts,
}: {
  budget: BudgetDetailData;
  contacts: OptionItem[];
  analyticAccounts: OptionItem[];
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: budget.name,
    periodStart: budget.periodStart.split("T")[0],
    periodEnd: budget.periodEnd.split("T")[0],
    responsibleId: budget.responsibleId,
    analyticAccountId: budget.analyticAccountId,
    committedAmount: String(budget.committedAmount),
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Revision modal state
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revisedAmount, setRevisedAmount] = useState(String(budget.committedAmount));

  const isDraft = budget.status === BudgetStatus.DRAFT;
  const isConfirmed = budget.status === BudgetStatus.CONFIRMED;
  const isRevised = budget.status === BudgetStatus.REVISED;
  const isCancelled = budget.status === BudgetStatus.CANCELLED;

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!isDraft) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await updateBudget(budget.id, {
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
      setSuccess("Budget updated successfully!");
    }
  }

  async function handleConfirm() {
    if (!confirm("Are you sure you want to CONFIRM this budget? Once confirmed, core parameters are locked.")) return;
    setLoading(true);
    setError(null);
    const res = await confirmBudget(budget.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Budget confirmed!");
      router.refresh();
    }
  }

  async function handleRevise() {
    setLoading(true);
    setError(null);
    const res = await reviseBudget(budget.id, Number(revisedAmount) || undefined);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setShowReviseModal(false);
      // Navigate to the newly spawned revision
      if (res.id) {
        router.push(`/master/budgets/${res.id}`);
      } else {
        router.refresh();
      }
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to CANCEL this budget? This action cannot be undone.")) return;
    setLoading(true);
    setError(null);
    const res = await cancelBudget(budget.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Budget cancelled.");
      router.refresh();
    }
  }

  const badgeInfo = statusToBadge(budget.status);

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-[#FFFDF8] border border-[#E2D9CC] rounded-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#3D3A36]">Status:</span>
          <Badge variant={badgeInfo.variant} label={badgeInfo.label} />

          {budget.revisionOf && (
            <Link
              href={`/master/budgets/${budget.revisionOf.id}`}
              className="text-xs text-[#B91C1C] hover:underline flex items-center gap-1"
            >
              <GitFork size={13} />
              <span>Revision of: {budget.revisionOf.name}</span>
            </Link>
          )}

          {budget.revisedBy && (
            <Link
              href={`/master/budgets/${budget.revisedBy.id}`}
              className="text-xs text-[#B45309] hover:underline flex items-center gap-1"
            >
              <ArrowRight size={13} />
              <span>Superseded by: {budget.revisedBy.name}</span>
            </Link>
          )}
        </div>

        {/* Action buttons based on lifecycle state */}
        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="bg-[#047857] hover:bg-[#065f46]"
              >
                <Check size={14} className="mr-1.5" />
                Confirm Budget
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="text-red-700 hover:bg-red-50"
              >
                <XCircle size={14} className="mr-1.5" />
                Cancel
              </Button>
            </>
          )}

          {isConfirmed && (
            <>
              <Button
                type="button"
                onClick={() => setShowReviseModal(true)}
                disabled={loading}
                className="bg-[#B45309] hover:bg-[#92400e]"
              >
                <GitFork size={14} className="mr-1.5" />
                Revise Budget
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="text-red-700 hover:bg-red-50"
              >
                <XCircle size={14} className="mr-1.5" />
                Cancel Budget
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Budget Card */}
      <Card className="p-8">
        {!isDraft && (
          <div className="mb-6 p-4 rounded bg-[#171717] text-[#FFFDF8] text-xs flex items-center gap-2">
            <Lock size={15} className="text-[#B91C1C] shrink-0" />
            <span>
              {isConfirmed && "This budget is Confirmed. Values are locked to preserve audit consistency. To adjust allocations, click 'Revise Budget'."}
              {isRevised && "This budget was superseded by a newer revision. Records are kept immutable."}
              {isCancelled && "This budget has been Cancelled."}
            </span>
          </div>
        )}

        <form onSubmit={handleSaveDraft} className="space-y-6">
          <Input
            label="Budget Name / Title"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={!isDraft}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Analytic Cost/Profit Dimension"
              value={formData.analyticAccountId}
              onChange={(e) => setFormData({ ...formData, analyticAccountId: e.target.value })}
              disabled={!isDraft}
              options={analyticAccounts.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />

            <Select
              label="Responsible Person"
              value={formData.responsibleId}
              onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
              disabled={!isDraft}
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
              disabled={!isDraft}
              required
            />

            <Input
              label="Period End Date"
              type="date"
              value={formData.periodEnd}
              onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
              disabled={!isDraft}
              required
            />
          </div>

          <Input
            label="Committed Amount (₹)"
            type="number"
            step="0.01"
            min="1"
            value={formData.committedAmount}
            onChange={(e) => setFormData({ ...formData, committedAmount: e.target.value })}
            disabled={!isDraft}
            required
          />

          <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/master/budgets")}
            >
              Back to Budgets
            </Button>

            {isDraft && (
              <Button type="submit" disabled={loading}>
                {loading ? "Saving Draft..." : "Save Draft Changes"}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Revision Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF8] border border-[#D4CCC0] rounded p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-[#171717]">
              <GitFork size={18} className="text-[#B45309]" />
              <h3 className="text-base font-semibold">Revise Budget</h3>
            </div>
            <p className="text-xs text-[#3D3A36]">
              Creating a revision will mark this budget as <strong>REVISED</strong> and create a new linked revision record.
            </p>

            <Input
              label="New Committed Budget Amount (₹)"
              type="number"
              step="0.01"
              value={revisedAmount}
              onChange={(e) => setRevisedAmount(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReviseModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRevise}
                disabled={loading}
                className="bg-[#B45309] hover:bg-[#92400e]"
              >
                {loading ? "Creating Revision..." : "Confirm & Spawn Revision"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
