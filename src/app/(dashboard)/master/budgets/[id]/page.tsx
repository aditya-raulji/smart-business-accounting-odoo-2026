// Budget detail and edit page for Urban Furniture Accounting System.
// What: Server component loading budget record, related options, and rendering BudgetDetailClient.
// Why: Enforces authorization, serializes Decimal figures, and resolves revision lineage.
// Used by: /master/budgets/[id] route.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BudgetDetailClient } from "./BudgetDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BudgetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [budget, contacts, analyticAccounts] = await Promise.all([
    prisma.budget.findUnique({
      where: { id },
      include: {
        responsible: { select: { name: true } },
        analyticAccount: { select: { name: true, type: true } },
        revisionOf: { select: { id: true, name: true } },
        revisedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.contact.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.analyticAccount.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!budget) {
    notFound();
  }

  const serialized = {
    ...budget,
    periodStart: budget.periodStart.toISOString(),
    periodEnd: budget.periodEnd.toISOString(),
    committedAmount: Number(budget.committedAmount),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={budget.name}
        subtitle="Fiscal budget parameters and lifecycle status tracking."
      />

      <BudgetDetailClient
        budget={serialized}
        contacts={contacts}
        analyticAccounts={analyticAccounts}
      />
    </div>
  );
}
