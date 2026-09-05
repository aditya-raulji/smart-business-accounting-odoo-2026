// Budget detail and edit page for Urban Furniture Accounting System.
// What: Server component loading budget record, live Achieved Amount metrics, and rendering BudgetDetailClient.
// Specification §2.5 & §3: Passes live Achieved Amount, Achieved %, and Amount To Achieve to BudgetDetailClient.
// Used by: /master/budgets/[id] route.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getBudgetAchievedAmount } from "@/lib/actions/budgets.actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { BudgetDetailClient } from "./BudgetDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BudgetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [budget, achievedMetrics, contacts, analyticAccounts] = await Promise.all([
    prisma.budget.findUnique({
      where: { id },
      include: {
        responsible: { select: { name: true } },
        analyticAccount: { select: { name: true, type: true } },
        revisionOf: { select: { id: true, name: true } },
        revisedBy: { select: { id: true, name: true } },
      },
    }),
    getBudgetAchievedAmount(id),
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
    <div className="max-[#4xl] max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={budget.name}
        subtitle="Fiscal budget parameters and live performance tracking."
      />

      <BudgetDetailClient
        budget={serialized}
        achievedMetrics={achievedMetrics}
        contacts={contacts}
        analyticAccounts={analyticAccounts}
      />
    </div>
  );
}
