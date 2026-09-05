// Double-Entry Journal Entries List Page for Urban Furniture Accounting System.
// Yeh page automatic system-posted Journal Entries fetch karke JournalEntriesTable Client Component me render karta hai.
// Specification §2.7 Columns: Date, Number (Bill number / reference), Partner, Journal Name, Total Amount, Status (Posted).
// Used by: /accounting/journal-entries route.

import { getJournalEntries } from "@/lib/actions/journal-entries";
import { PageHeader } from "@/components/ui/PageHeader";
import { JournalEntriesTable } from "@/components/accounting/JournalEntriesTable";

export default async function JournalEntriesPage() {
  const entries = await getJournalEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        subtitle="Read-only double-entry general ledger records auto-posted by vendor bills and payments."
      />

      <JournalEntriesTable entries={entries} />
    </div>
  );
}
