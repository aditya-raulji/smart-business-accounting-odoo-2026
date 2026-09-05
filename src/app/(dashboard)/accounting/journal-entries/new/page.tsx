// New Manual Journal Entry Page for Urban Furniture Accounting System.
// Yeh page active journals, chart of accounts, contacts, aur next sequential JE number (JE-00001) load karke JournalEntryForm render karta hai.
// RBAC: Only ADMIN and ACCOUNTANT roles can access this page.
// Used by: /accounting/journal-entries/new route.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJournals } from "@/lib/actions/journals.actions";
import { getAccounts } from "@/lib/actions/accounts.actions";
import { nextJeNumber } from "@/lib/sequence";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";

export default async function NewJournalEntryPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    redirect("/accounting/journal-entries");
  }

  const [journals, accounts, contacts, defaultReference] = await Promise.all([
    getJournals(),
    getAccounts({ includeArchived: false }),
    prisma.contact.findMany({
      where: { archived: false },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    nextJeNumber(),
  ]);

  return (
    <JournalEntryForm
      mode="create"
      journals={journals.map((j) => ({ id: j.id, name: j.name, type: j.type }))}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
      contacts={contacts.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
      defaultReference={defaultReference}
    />
  );
}
