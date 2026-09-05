// Shared Accounting Calculation Engine for Urban Furniture Accounting System.
// Yeh file posted Double-Entry JournalItem records ko aggregate karke single ya batch accounts ka real-time balance calculate karti hai.
// Math Rules per Spec §2:
// - Permanent Accounts (ASSET, BANK, CASH, LIABILITY, CAPITAL): Cumulative all-time balance up to period end date (asOf/to).
// - Temporary Accounts (INCOME, EXPENSE, OTHER_EXPENSE): Period-only YTD balance (from <= date <= to).
// - Normal Debit (ASSET, BANK, CASH, EXPENSE, OTHER_EXPENSE): balance = SUM(debit) - SUM(credit).
// - Normal Credit (LIABILITY, CAPITAL, INCOME): balance = SUM(credit) - SUM(debit).
// Alternative Rejected: Denormalized running balance on ChartOfAccount table — rejecting because live sum over posted JournalItems prevents drift and ensures 100% ledger consistency.
// Used by: lib/reports/profit-and-loss.ts, lib/reports/balance-sheet.ts, and lib/reports/budget-report.ts.

import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

export type PeriodFilter = {
  from?: Date;
  to?: Date;
  asOf?: Date;
};

/**
 * getAccountBalance: Single ChartOfAccount ka calculated balance return karta hai based on normal debit/credit rules.
 */
export async function getAccountBalance(
  accountId: string,
  period: PeriodFilter
): Promise<number> {
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: accountId },
    select: { id: true, type: true },
  });

  if (!account) return 0;

  // Build date filter clause
  const dateClause: any = {};
  if (period.from) dateClause.gte = period.from;
  if (period.to) dateClause.lte = period.to;
  if (period.asOf && !period.to) dateClause.lte = period.asOf;

  // Query POSTED journal items
  const items = await prisma.journalItem.findMany({
    where: {
      accountId,
      journalEntry: {
        status: "POSTED",
        accountingDate: dateClause,
      },
    },
    select: {
      debit: true,
      credit: true,
    },
  });

  const totalDebit = items.reduce((sum, i) => sum + Number(i.debit), 0);
  const totalCredit = items.reduce((sum, i) => sum + Number(i.credit), 0);

  // Normal Debit vs Normal Credit account types balance formula
  const isNormalCredit =
    account.type === AccountType.LIABILITY ||
    account.type === AccountType.CAPITAL ||
    account.type === AccountType.INCOME;

  return isNormalCredit ? totalCredit - totalDebit : totalDebit - totalCredit;
}

/**
 * getAccountBalancesByTypes: Multiple AccountType categories ke saare active accounts ke balances fetch karta hai optimized batch query se.
 */
export async function getAccountBalancesByTypes(
  types: AccountType[],
  period: PeriodFilter
) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      type: { in: types },
      archived: false,
    },
    orderBy: { name: "asc" },
  });

  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) return [];

  // Build date filter clause
  const dateClause: any = {};
  if (period.from) dateClause.gte = period.from;
  if (period.to) dateClause.lte = period.to;
  if (period.asOf && !period.to) dateClause.lte = period.asOf;

  // Batch query all posted items for these accounts
  const items = await prisma.journalItem.findMany({
    where: {
      accountId: { in: accountIds },
      journalEntry: {
        status: "POSTED",
        accountingDate: dateClause,
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
    },
  });

  // Group sums by accountId
  const sumMap = new Map<string, { debit: number; credit: number }>();
  for (const item of items) {
    const existing = sumMap.get(item.accountId) || { debit: 0, credit: 0 };
    existing.debit += Number(item.debit);
    existing.credit += Number(item.credit);
    sumMap.set(item.accountId, existing);
  }

  return accounts.map((acc) => {
    const sums = sumMap.get(acc.id) || { debit: 0, credit: 0 };
    const isNormalCredit =
      acc.type === AccountType.LIABILITY ||
      acc.type === AccountType.CAPITAL ||
      acc.type === AccountType.INCOME;

    const balance = isNormalCredit
      ? sums.credit - sums.debit
      : sums.debit - sums.credit;

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      isSystem: acc.isSystem,
      balance,
    };
  });
}

/**
 * getAvailableFiscalYears: System me existing posted journal entries se distinct years extract karta hai report year selector populate karne ke liye.
 * Always includes current year.
 */
export async function getAvailableFiscalYears(): Promise<number[]> {
  const currentYear = new Date().getFullYear();

  const oldestEntry = await prisma.journalEntry.findFirst({
    where: { status: "POSTED" },
    orderBy: { accountingDate: "asc" },
    select: { accountingDate: true },
  });

  const startYear = oldestEntry ? oldestEntry.accountingDate.getFullYear() : currentYear;
  const years: number[] = [];

  for (let y = currentYear; y >= Math.min(startYear, currentYear - 2); y--) {
    years.push(y);
  }

  return Array.from(new Set(years)).sort((a, b) => b - a);
}
