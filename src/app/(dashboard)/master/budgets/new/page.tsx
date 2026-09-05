// New Budget page for Urban Furniture Accounting System.
// What: Server component loading active contacts and analytic accounts to populate BudgetNewForm.
// Why: Provides valid foreign keys for responsible contact and analytic cost dimension.
// Used by: /master/budgets/new route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { BudgetNewForm } from "./BudgetNewForm";

export default async function NewBudgetPage() {
  const [contacts, analyticAccounts] = await Promise.all([
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create Budget"
        subtitle="Initialize a new fiscal budget under Draft status."
      />

      <BudgetNewForm contacts={contacts} analyticAccounts={analyticAccounts} />
    </div>
  );
}
