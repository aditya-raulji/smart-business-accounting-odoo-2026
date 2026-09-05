// Chart of Account edit page for Urban Furniture Accounting System.
// What: Server component loading account by ID and rendering AccountEditForm.
// Why: Validates account existence on server and protects system-flagged records.
// Used by: /master/chart-of-accounts/[id] route.

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountEditForm } from "./AccountEditForm";

export default async function ChartOfAccountEditPage({
  params,
}: {
  params: { id: string };
}) {
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: params.id },
  });

  if (!account) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={`Account: ${account.name}`}
        subtitle="Review account properties, category alignment, and system restrictions."
      />

      <AccountEditForm account={account} />
    </div>
  );
}
