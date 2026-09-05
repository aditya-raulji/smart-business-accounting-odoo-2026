// Journals master list page for Urban Furniture Accounting System.
// What: Server component fetching all journals along with their default linked accounts.
// Why: Provides access to standard transactional journals (Sales, Purchase, Bank, Cash, etc.).
// Used by: /master/journals route.

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { JournalsTable } from "./JournalsTable";

export default async function JournalsPage() {
  const journals = await prisma.journal.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      defaultAccount: {
        select: { name: true, type: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journals"
        subtitle="Manage transactional journals representing distinct financial books of accounts."
        action={{
          label: "+ New Journal",
          href: "/master/journals/new",
        }}
      />

      <JournalsTable journals={journals} />
    </div>
  );
}
