// Journal Entries Server Actions for Urban Furniture Accounting System.
// Yeh file posted Double-Entry Journal Entries aur unki lines (JournalItems) fetch karne ka kaam karti hai.
// Core Feature: Complete double-entry audit trail return karta hai with Debit/Credit totals validation display.
// Read-Only Scope: Phase 2 me manual entry disallowed hai — automatic system-generated entries (Bill confirm, Payment record) hi display hoti hain.
// Used by: /accounting/journal-entries list page aur /accounting/journal-entries/[id] detail page.

"use server";

import { prisma } from "@/lib/prisma";

/**
 * getJournalEntries: Complete journal entry ledger list return karta hai read-only data table display ke liye.
 * Calculates total debit per entry.
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

  // Partner names map batch query optimize karne ke liye
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

    return {
      id: entry.id,
      date: entry.accountingDate,
      number: entry.reference || entry.id.slice(0, 8),
      partnerName,
      journalName: entry.journal.name,
      total: totalDebit,
      status: entry.status,
    };
  });
}

/**
 * getJournalEntryById: Specific Journal Entry ki detail fetch karta hai saare Debit aur Credit legs (JournalItems) ke saath.
 * Validates that sum(debit) equals sum(credit) for display verification.
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

  // Partner names fetch kar rahe hain line items ke liye
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
    accountName: item.account.name,
    accountType: item.account.type,
    partnerName: item.partnerId ? partnerMap.get(item.partnerId) || "—" : "—",
    debit: Number(item.debit),
    credit: Number(item.credit),
  }));

  const totalDebit = formattedItems.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = formattedItems.reduce((sum, item) => sum + item.credit, 0);

  return {
    id: entry.id,
    journalName: entry.journal.name,
    journalType: entry.journal.type,
    accountingDate: entry.accountingDate,
    createdAt: entry.createdAt,
    reference: entry.reference || "—",
    partnerName: entry.partnerId ? partnerMap.get(entry.partnerId) || "—" : "—",
    status: entry.status,
    items: formattedItems,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
  };
}
