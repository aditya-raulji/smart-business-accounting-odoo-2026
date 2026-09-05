// Analytic Accounts master list page for Urban Furniture Accounting System.
// What: Server component fetching all analytic accounts and rendering AnalyticAccountsTable.
// Why: Enables cost and profit center management independently of statutory CoA.
// Used by: /master/analytic-accounts route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnalyticAccountsTable } from "./AnalyticAccountsTable";

export default async function AnalyticAccountsPage() {
  const accounts = await prisma.analyticAccount.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { budgets: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytic Accounts"
        subtitle="Manage cost and profit centers used for budgeting, project tracking, and departmental performance."
        action={{
          label: "+ New Analytic Account",
          href: "/master/analytic-accounts/new",
        }}
      />

      <AnalyticAccountsTable accounts={accounts} />
    </div>
  );
}
