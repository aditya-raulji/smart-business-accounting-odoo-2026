// Journal Entries Server Actions for Urban Furniture Accounting System.
// Yeh file manual aur auto-generated Double-Entry Journal Entries ko create, post, cancel, reset aur fetch karne ka kaam karti hai.
// Core Feature: Balanced debit/credit validation, manual entry lifecycle management (Draft -> Posted -> Cancelled), aur auto-generated entry immutability enforcement.
// Used by: /accounting/journal-entries list page, /accounting/journal-entries/new creation page, aur /accounting/journal-entries/[id] detail/edit page.

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type JournalEntryItemInput = {
  accountId: string;
  partnerId?: string | null;
  debit: number;
  credit: number;
};

/**
 * getJournalEntries: Complete journal entry ledger list return karta hai with isAuto detection.
 * Used by: /accounting/journal-entries/page.tsx
 */
export async function getJournalEntries() {
  const entries = await prisma.journalEntry.findMany({
    include: {
      journal: { select: { id: true, name: true, type: true } },
      items: {
        select: { debit: true, credit: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const entryIds = entries.map((e) => e.id);

  // Batch query linked auto-generated documents by journalEntryId
  const [bills, invoices, payments] = await Promise.all([
    prisma.vendorBill.findMany({
      where: { journalEntryId: { in: entryIds } },
      select: { journalEntryId: true },
    }),
    prisma.customerInvoice.findMany({
      where: { journalEntryId: { in: entryIds } },
      select: { journalEntryId: true },
    }),
    prisma.payment.findMany({
      where: { journalEntryId: { in: entryIds } },
      select: { journalEntryId: true },
    }),
  ]);

  const autoEntryIds = new Set([
    ...bills.map((b) => b.journalEntryId).filter((id): id is string => Boolean(id)),
    ...invoices.map((i) => i.journalEntryId).filter((id): id is string => Boolean(id)),
    ...payments.map((p) => p.journalEntryId).filter((id): id is string => Boolean(id)),
  ]);

  const partnerIds = Array.from(
    new Set(entries.map((e) => e.partnerId).filter((id): id is string => Boolean(id)))
  );

  const partners = await prisma.contact.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true },
  });

  const partnerMap = new Map(partners.map((p) => [p.id, p.name]));

  return entries.map((entry) => {
    const totalDebit = entry.items.reduce((sum, item) => sum + Number(item.debit), 0);
    const partnerName = entry.partnerId ? partnerMap.get(entry.partnerId) || "—" : "—";
    const isAuto = autoEntryIds.has(entry.id);

    return {
      id: entry.id,
      date: entry.accountingDate,
      number: entry.reference || entry.id.slice(0, 8),
      partnerName,
      journalName: entry.journal.name,
      total: totalDebit,
      status: entry.status,
      isAuto,
    };
  });
}

/**
 * getJournalEntryById: Specific Journal Entry ki detail fetch karta hai with auto-source document link identification.
 * Used by: /accounting/journal-entries/[id]/page.tsx
 */
export async function getJournalEntryById(id: string) {
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: {
      journal: { select: { id: true, name: true, type: true } },
      items: {
        include: {
          account: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!entry) return null;

  // Query linked auto-generated source document metadata
  const [bill, invoice, payment] = await Promise.all([
    prisma.vendorBill.findUnique({
      where: { journalEntryId: id },
      select: { id: true, billNumber: true },
    }),
    prisma.customerInvoice.findUnique({
      where: { journalEntryId: id },
      select: { id: true, invoiceNumber: true },
    }),
    prisma.payment.findUnique({
      where: { journalEntryId: id },
      select: { id: true },
    }),
  ]);

  let isAuto = false;
  let sourceDocLink: string | null = null;
  let sourceDocNumber: string | null = null;
  let sourceDocType: string | null = null;

  if (bill) {
    isAuto = true;
    sourceDocType = "Bill";
    sourceDocNumber = bill.billNumber;
    sourceDocLink = `/purchase/bills/${bill.id}`;
  } else if (invoice) {
    isAuto = true;
    sourceDocType = "Invoice";
    sourceDocNumber = invoice.invoiceNumber;
    sourceDocLink = `/sales/invoices/${invoice.id}`;
  } else if (payment) {
    isAuto = true;
    sourceDocType = "Payment";
    sourceDocNumber = payment.id.slice(0, 8);
    sourceDocLink = `/payments`;
  }

  // Fetch partner names
  const partnerIds = Array.from(
    new Set([
      entry.partnerId,
      ...entry.items.map((i) => i.partnerId),
    ].filter((id): id is string => Boolean(id)))
  );

  const partners = await prisma.contact.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true },
  });

  const partnerMap = new Map(partners.map((p) => [p.id, p.name]));

  const formattedItems = entry.items.map((item) => ({
    id: item.id,
    accountId: item.accountId,
    accountName: item.account.name,
    accountType: item.account.type,
    partnerId: item.partnerId || null,
    partnerName: item.partnerId ? partnerMap.get(item.partnerId) || "—" : "—",
    debit: Number(item.debit),
    credit: Number(item.credit),
  }));

  const totalDebit = formattedItems.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = formattedItems.reduce((sum, item) => sum + item.credit, 0);

  return {
    id: entry.id,
    journalId: entry.journalId,
    journalName: entry.journal.name,
    journalType: entry.journal.type,
    accountingDate: entry.accountingDate,
    createdAt: entry.createdAt,
    reference: entry.reference || "—",
    partnerId: entry.partnerId,
    partnerName: entry.partnerId ? partnerMap.get(entry.partnerId) || "—" : "—",
    status: entry.status,
    items: formattedItems,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
    isAuto,
    sourceDocLink,
    sourceDocNumber,
    sourceDocType,
  };
}

/**
 * createManualJournalEntry: Admin ya Accountant dwara new manual Journal Entry in DRAFT status create karta hai.
 * Used by: /accounting/journal-entries/new/page.tsx
 */
export async function createManualJournalEntry(data: {
  journalId: string;
  accountingDate: Date;
  reference: string;
  partnerId?: string | null;
  items: JournalEntryItemInput[];
}) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized: Only Admin or Accountant can create manual journal entries.");
  }

  if (!data.journalId) throw new Error("Journal is required.");
  if (!data.accountingDate) throw new Error("Accounting Date is required.");
  if (!data.items || data.items.length < 2) {
    throw new Error("At least 2 lines (1 Debit and 1 Credit) are required for a double-entry journal.");
  }

  const entry = await prisma.journalEntry.create({
    data: {
      journalId: data.journalId,
      accountingDate: new Date(data.accountingDate),
      reference: data.reference,
      partnerId: data.partnerId || null,
      status: "DRAFT",
      items: {
        create: data.items.map((item) => ({
          accountId: item.accountId,
          partnerId: item.partnerId || null,
          debit: item.debit,
          credit: item.credit,
        })),
      },
    },
  });

  revalidatePath("/accounting/journal-entries");
  return { success: true, id: entry.id };
}

/**
 * postJournalEntry: DRAFT manual journal entry ko validate karke POSTED status me transition karta hai.
 * Used by: JournalEntryForm client component on 'Post' action.
 */
export async function postJournalEntry(id: string) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized: Only Admin or Accountant can post journal entries.");
  }

  const entry = await getJournalEntryById(id);
  if (!entry) throw new Error("Journal entry not found.");
  if (entry.isAuto) throw new Error("Auto-generated journal entries cannot be edited or posted manually.");
  if (entry.status !== "DRAFT") throw new Error("Only DRAFT journal entries can be posted.");

  if (!entry.isBalanced || entry.totalDebit <= 0) {
    throw new Error(`Cannot post unbalanced entry. Debit (₹${entry.totalDebit.toLocaleString()}) ≠ Credit (₹${entry.totalCredit.toLocaleString()}).`);
  }

  for (const item of entry.items) {
    const hasDebit = item.debit > 0;
    const hasCredit = item.credit > 0;
    if ((hasDebit && hasCredit) || (!hasDebit && !hasCredit)) {
      throw new Error(`Every line item must have either Debit or Credit specified, but not both and not zero.`);
    }
  }

  await prisma.journalEntry.update({
    where: { id },
    data: { status: "POSTED" },
  });

  revalidatePath("/accounting/journal-entries");
  revalidatePath(`/accounting/journal-entries/${id}`);
  return { success: true };
}

/**
 * cancelJournalEntry: DRAFT ya POSTED manual journal entry ko CANCELLED status me change karta hai.
 * Used by: JournalEntryForm client component on 'Cancel' action.
 */
export async function cancelJournalEntry(id: string) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized: Only Admin or Accountant can cancel journal entries.");
  }

  const entry = await getJournalEntryById(id);
  if (!entry) throw new Error("Journal entry not found.");
  if (entry.isAuto) throw new Error("Auto-generated journal entries cannot be cancelled directly. Cancel the source document instead.");

  await prisma.journalEntry.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/accounting/journal-entries");
  revalidatePath(`/accounting/journal-entries/${id}`);
  return { success: true };
}

/**
 * resetJournalEntryToDraft: POSTED manual journal entry ko DRAFT status me revert karta hai.
 * Used by: JournalEntryForm client component on 'Reset to Draft' action.
 */
export async function resetJournalEntryToDraft(id: string) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized: Only Admin or Accountant can reset journal entries.");
  }

  const entry = await getJournalEntryById(id);
  if (!entry) throw new Error("Journal entry not found.");
  if (entry.isAuto) throw new Error("Auto-generated journal entries cannot be reset to draft.");
  if (entry.status !== "POSTED") throw new Error("Only POSTED journal entries can be reset to DRAFT.");

  await prisma.journalEntry.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  revalidatePath("/accounting/journal-entries");
  revalidatePath(`/accounting/journal-entries/${id}`);
  return { success: true };
}
