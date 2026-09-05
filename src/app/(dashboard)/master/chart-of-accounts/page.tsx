// Chart of Accounts master list page for Urban Furniture Accounting System.
// What: Server component loading active Chart of Accounts entries from PostgreSQL and rendering AccountsTable.
// Why: Provides direct view of foundational double-entry ledger accounts.
// Used by: /master/chart-of-accounts route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountsTable } from "./AccountsTable";

export default async function ChartOfAccountsPage() {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { archived: false },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage foundational ledger accounts governing assets, liabilities, equity, revenues, and expenses."
        action={{
          label: "+ New Account",
          href: "/master/chart-of-accounts/new",
        }}
      />

      <AccountsTable accounts={accounts} />
    </div>
  );
}
