// Double-Entry Journal Entries List Page for Urban Furniture Accounting System.
// Yeh page automatic system-posted aur manually created Journal Entries fetch karke JournalEntriesTable Client Component me render karta hai.
// Specification §2.1: Includes "+ New" button for ADMIN/ACCOUNTANT roles, Auto badge for auto-generated entries, and status filters.
// Used by: /accounting/journal-entries route.

import { getJournalEntries } from "@/lib/actions/journal-entries";
import { PageHeader } from "@/components/ui/PageHeader";
import { JournalEntriesTable } from "@/components/accounting/JournalEntriesTable";
import { auth } from "@/lib/auth";

export default async function JournalEntriesPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === "ADMIN" || userRole === "ACCOUNTANT";

  const entries = await getJournalEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        subtitle="Manage manual double-entry accounting vouchers and view auto-generated ledger entries."
      />

      <JournalEntriesTable entries={entries} canCreate={canCreate} />
    </div>
  );
}
