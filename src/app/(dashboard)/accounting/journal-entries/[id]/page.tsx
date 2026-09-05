// Journal Entry Detail / Edit Page for Urban Furniture Accounting System.
// Yeh page specific Double-Entry Journal Entry fetch karke JournalEntryForm component me render karta hai.
// Auto-generated entries are rendered strictly read-only with a direct source document link banner.
// Manual entries support posting, cancelling, and resetting to draft based on status.
// Used by: /accounting/journal-entries/[id] route.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getJournalEntryById } from "@/lib/actions/journal-entries";
import { getJournals } from "@/lib/actions/journals.actions";
import { getAccounts } from "@/lib/actions/accounts.actions";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JournalEntryDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [entry, journals, accounts, contacts] = await Promise.all([
    getJournalEntryById(id),
    getJournals(),
    getAccounts({ includeArchived: true }),
    prisma.contact.findMany({
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!entry) {
    notFound();
  }

  return (
    <JournalEntryForm
      mode="detail"
      journals={journals.map((j) => ({ id: j.id, name: j.name, type: j.type }))}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
      contacts={contacts.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
      initialData={{
        id: entry.id,
        journalId: entry.journalId,
        journalName: entry.journalName,
        journalType: entry.journalType,
        accountingDate: entry.accountingDate,
        reference: entry.reference,
        partnerId: entry.partnerId,
        partnerName: entry.partnerName,
        status: entry.status as "DRAFT" | "POSTED" | "CANCELLED",
        items: entry.items,
        isAuto: entry.isAuto,
        sourceDocLink: entry.sourceDocLink,
        sourceDocNumber: entry.sourceDocNumber,
        sourceDocType: entry.sourceDocType,
      }}
    />
  );
}
