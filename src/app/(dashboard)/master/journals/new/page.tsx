// New Journal page for Urban Furniture Accounting System.
// What: Server component loading active ledger accounts to populate JournalNewForm.
// Why: Enforces valid foreign key references when defining journals.
// Used by: /master/journals/new route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { JournalNewForm } from "./JournalNewForm";

export default async function NewJournalPage() {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create Journal"
        subtitle="Establish a new ledger journal book with default account reconciliation."
      />

      <JournalNewForm accounts={accounts} />
    </div>
  );
}
