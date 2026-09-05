// Journals Master Management Page for Urban Furniture Accounting System.
// What: Server component fetching all journals along with default linked accounts.
// Specification §2.4: Provides Edit capabilities, 1-journal-per-type uniqueness enforcement, and system journal type locks.
// Used by: /master/journals route.

import { getJournals } from "@/lib/actions/journals.actions";
import { getAccounts } from "@/lib/actions/accounts.actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { JournalsManagementView } from "@/components/master/JournalsManagementView";

export default async function JournalsPage() {
  const [journals, accounts] = await Promise.all([
    getJournals(),
    getAccounts({ includeArchived: false }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journals"
        subtitle="Manage transactional journals representing distinct financial books of accounts."
      />

      <JournalsManagementView
        journals={journals.map((j) => ({
          id: j.id,
          name: j.name,
          type: j.type,
          isSystem: j.isSystem,
          defaultAccountId: j.defaultAccountId,
          defaultAccount: j.defaultAccount,
          createdAt: j.createdAt,
        }))}
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
        }))}
      />
    </div>
  );
}
