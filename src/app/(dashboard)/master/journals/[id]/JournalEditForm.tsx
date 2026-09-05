// Journal Edit Form client component for Urban Furniture Accounting System.
// What: Client component for editing custom journals or displaying system journal locks.
// Why: Enforces spec §6.4: System journals (Sales, Purchase, Bank, Cash) cannot be deleted or modified.
// Used by: /master/journals/[id] page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { updateJournal } from "@/lib/actions/journals.actions";
import { JournalType } from "@prisma/client";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";

interface JournalData {
  id: string;
  name: string;
  type: JournalType;
  defaultAccountId: string;
  isSystem: boolean;
}

interface AccountOption {
  id: string;
  name: string;
  type: string;
}

export function JournalEditForm({
  journal,
  accounts,
}: {
  journal: JournalData;
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: journal.name,
    type: journal.type,
    defaultAccountId: journal.defaultAccountId,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (journal.isSystem) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await updateJournal(journal.id, formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Journal updated successfully!");
    }
  }

  return (
    <Card className="p-8">
      {journal.isSystem && (
        <div className="mb-6 p-4 rounded bg-[#171717] text-[#FFFDF8] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-[#B91C1C]" />
            <span>
              <strong>System Journal:</strong> This is a core operational journal. Modifying its name,
              type, or default account is restricted to preserve automated document flows.
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
          label="Journal Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={journal.isSystem}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Journal Type"
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as JournalType,
              })
            }
            disabled={journal.isSystem}
            options={[
              { value: JournalType.SALES, label: "Sales Journal" },
              { value: JournalType.PURCHASE, label: "Purchase Journal" },
              { value: JournalType.BANK, label: "Bank Journal" },
              { value: JournalType.CASH, label: "Cash Journal" },
            ]}
          />

          <Select
            label="Default Balancing Account"
            value={formData.defaultAccountId}
            onChange={(e) =>
              setFormData({
                ...formData,
                defaultAccountId: e.target.value,
              })
            }
            disabled={journal.isSystem}
            options={accounts.map((a) => ({
              value: a.id,
              label: `${a.name} (${a.type})`,
            }))}
          />
        </div>

        <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/master/journals")}
            disabled={loading}
          >
            {journal.isSystem ? "Back to Journals" : "Cancel"}
          </Button>
          {!journal.isSystem && (
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
