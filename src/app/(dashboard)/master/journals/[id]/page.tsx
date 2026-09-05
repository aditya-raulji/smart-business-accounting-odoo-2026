// Journal edit page for Urban Furniture Accounting System.
// What: Server component fetching journal by ID and active accounts for editing.
// Why: Validates data existence on server and protects system journals.
// Used by: /master/journals/[id] route.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { JournalEditForm } from "./JournalEditForm";

export default async function JournalEditPage({
  params,
}: {
  params: { id: string };
}) {
  const [journal, accounts] = await Promise.all([
    prisma.journal.findUnique({ where: { id: params.id } }),
    prisma.chartOfAccount.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  if (!journal) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={`Journal: ${journal.name}`}
        subtitle="Configure journal parameters, type taxonomy, and default balancing account."
      />

      <JournalEditForm journal={journal} accounts={accounts} />
    </div>
  );
}
