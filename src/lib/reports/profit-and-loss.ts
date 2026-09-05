// Profit & Loss Financial Statement Server Action for Urban Furniture Accounting System.
// Yeh file selected fiscal year (1 Jan - 31 Dec) ke liye Total Income, Total Expenses, aur Net Income Statement compute karti hai.
// Math Rules per Spec §3.1:
// - Income accounts: balance = sum(credit) - sum(debit) for selected year.
// - Expense & Other Expense accounts: balance = sum(debit) - sum(credit) for selected year.
// - Net Income = Total Income - Total Expenses.
// Alternative Rejected: Multi-year YTD cumulative addition — rejecting because P&L accounts are temporary accounts that reset every fiscal year.
// Used by: /reports/profit-and-loss page and ProfitAndLossView client component.

"use server";

import { AccountType } from "@prisma/client";
import {
  getAccountBalancesByTypes,
  getAvailableFiscalYears,
} from "./account-balance";

export interface StatementRow {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface ProfitAndLossData {
  year: number;
  from: string;
  to: string;
  incomeItems: StatementRow[];
  totalIncome: number;
  expenseItems: StatementRow[];
  totalExpenses: number;
  netIncome: number;
  isNetLoss: boolean;
  availableYears: number[];
}

/**
 * getProfitAndLossReport: Selected year ke liye complete Profit & Loss statement compute karke return karta hai.
 */
export async function getProfitAndLossReport(selectedYear?: number): Promise<ProfitAndLossData> {
  const currentYear = new Date().getFullYear();
  const year = selectedYear || currentYear;

  const from = new Date(year, 0, 1, 0, 0, 0, 0); // 1 Jan
  const to = new Date(year, 11, 31, 23, 59, 59, 999); // 31 Dec

  const [incomeAccounts, expenseAccounts, availableYears] = await Promise.all([
    getAccountBalancesByTypes([AccountType.INCOME], { from, to }),
    getAccountBalancesByTypes([AccountType.EXPENSE, AccountType.OTHER_EXPENSE], { from, to }),
    getAvailableFiscalYears(),
  ]);

  const totalIncome = incomeAccounts.reduce((sum, item) => sum + item.balance, 0);
  const totalExpenses = expenseAccounts.reduce((sum, item) => sum + item.balance, 0);
  const netIncome = totalIncome - totalExpenses;

  return {
    year,
    from: from.toISOString(),
    to: to.toISOString(),
    incomeItems: incomeAccounts,
    totalIncome,
    expenseItems: expenseAccounts,
    totalExpenses,
    netIncome,
    isNetLoss: netIncome < 0,
    availableYears,
  };
}
