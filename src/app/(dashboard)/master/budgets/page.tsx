// Budgets master list page for Urban Furniture Accounting System.
// What: Server component loading all budgets, relating them to contacts, analytic accounts, and revisions.
// Why: Provides full lifecycle oversight of operational and capital budgets.
// Used by: /master/budgets route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { BudgetsView } from "./BudgetsView";

export default async function BudgetsPage() {
  const budgets = await prisma.budget.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      responsible: {
        select: { name: true },
      },
      analyticAccount: {
        select: { name: true, type: true },
      },
      revisionOf: {
        select: { name: true },
      },
      revisedBy: {
        select: { id: true, name: true },
      },
    },
  });

  const serialized = budgets.map((b) => ({
    ...b,
    committedAmount: Number(b.committedAmount),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytic Budgets"
        subtitle="Manage fiscal budgets with strict state progression (Draft → Confirmed → Revised → Cancelled)."
        action={{
          label: "+ New Budget",
          href: "/master/budgets/new",
        }}
      />

      <BudgetsView budgets={serialized} />
    </div>
  );
}
