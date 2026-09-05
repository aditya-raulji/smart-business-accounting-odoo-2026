// Create Journal client form for Urban Furniture Accounting System.
// What: Client form to register a new Journal and map it to a default ledger account.
// Why: Keeps bookkeeping organized by designating default balancing accounts.
// Used by: /master/journals/new page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createJournal } from "@/lib/actions/journals.actions";
import { JournalType } from "@prisma/client";
import { AlertCircle } from "lucide-react";

interface AccountOption {
  id: string;
  name: string;
  type: string;
}

export function JournalNewForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    type: JournalType.BANK as JournalType,
    defaultAccountId: accounts[0]?.id || "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createJournal(formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.push("/master/journals");
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Journal Name"
          placeholder="e.g. HDFC Current Account, Cash Register 2"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            options={[
              { value: JournalType.SALES, label: "Sales Journal" },
              { value: JournalType.PURCHASE, label: "Purchase Journal" },
              { value: JournalType.BANK, label: "Bank Journal" },
              { value: JournalType.CASH, label: "Cash Journal" },
            ]}
          />

          <Select
            label="Default Ledger Account"
            value={formData.defaultAccountId}
            onChange={(e) =>
              setFormData({
                ...formData,
                defaultAccountId: e.target.value,
              })
            }
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
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Journal"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
