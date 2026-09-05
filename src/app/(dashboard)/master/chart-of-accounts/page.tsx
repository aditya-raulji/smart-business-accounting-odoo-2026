// Chart of Accounts Master Management Page for Urban Furniture Accounting System.
// What: Server component loading active and archived Chart of Accounts entries from PostgreSQL and rendering AccountsManagementView.
// Specification §2.3: Provides Edit & Archive capabilities for custom accounts with strict locks on seeded system accounts.
// Used by: /master/chart-of-accounts route.

import { getAccounts } from "@/lib/actions/accounts.actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountsManagementView } from "@/components/master/AccountsManagementView";

export default async function ChartOfAccountsPage() {
  const accounts = await getAccounts({ includeArchived: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage foundational ledger accounts governing assets, liabilities, equity, revenues, and expenses."
      />

      <AccountsManagementView accounts={accounts} />
    </div>
  );
}
