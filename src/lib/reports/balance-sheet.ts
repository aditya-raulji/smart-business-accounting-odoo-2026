// Balance Sheet Financial Statement Server Action for Urban Furniture Accounting System.
// Yeh file selected fiscal year end ("as of 31 Dec {year}") par Total Assets, Total Liabilities, Total Capital, aur synthetic Retained Earnings compute karti hai.
// Math & Accounting Rules per Spec §3.2 & §5:
// - Permanent accounts (ASSET, BANK, CASH, LIABILITY, CAPITAL): Cumulative balance all-time up to 31 Dec {year}.
// - Synthetic "Retained Earnings" row: Cumulative all-time Net Income (Income - Expenses) up to 31 Dec {year}.
// - Fundamental Accounting Equation Verification: Total Assets === Total Liabilities + Total Capital (with Retained Earnings).
// Alternative Rejected: Retained Earnings row replace/omit karna — rejecting because without synthetic retained earnings, unclosed revenue/expense balances cause Assets != Liabilities + Equity, violating double-entry laws.
// Used by: /reports/balance-sheet page and BalanceSheetView client component.

"use server";

import { AccountType } from "@prisma/client";
import {
  getAccountBalancesByTypes,
  getAvailableFiscalYears,
} from "./account-balance";

export interface BalanceSheetRow {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface BalanceSheetData {
  year: number;
  asOfDate: string;
  assetItems: BalanceSheetRow[];
  totalAssets: number;
  liabilityItems: BalanceSheetRow[];
  totalLiabilities: number;
  capitalItems: BalanceSheetRow[];
  retainedEarnings: number;
  totalCapital: number;
  totalLiabilitiesAndCapital: number;
  isBalanced: boolean;
  availableYears: number[];
}

/**
 * getBalanceSheetReport: Selected year ke snapshot date par complete Balance Sheet statement compute karke return karta hai.
 */
export async function getBalanceSheetReport(selectedYear?: number): Promise<BalanceSheetData> {
  const currentYear = new Date().getFullYear();
  const year = selectedYear || currentYear;

  const asOf = new Date(year, 11, 31, 23, 59, 59, 999); // 31 Dec of selected year

  const [assetAccounts, liabilityAccounts, capitalAccounts, incomeAccountsAllTime, expenseAccountsAllTime, availableYears] = await Promise.all([
    getAccountBalancesByTypes([AccountType.ASSET, AccountType.BANK, AccountType.CASH], { asOf }),
    getAccountBalancesByTypes([AccountType.LIABILITY], { asOf }),
    getAccountBalancesByTypes([AccountType.CAPITAL], { asOf }),
    getAccountBalancesByTypes([AccountType.INCOME], { asOf }),
    getAccountBalancesByTypes([AccountType.EXPENSE, AccountType.OTHER_EXPENSE], { asOf }),
    getAvailableFiscalYears(),
  ]);

  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, l) => sum + l.balance, 0);
  const baseCapital = capitalAccounts.reduce((sum, c) => sum + c.balance, 0);

  // Compute synthetic Retained Earnings (Cumulative Net Income up to asOf date)
  const cumulativeIncome = incomeAccountsAllTime.reduce((sum, i) => sum + i.balance, 0);
  const cumulativeExpenses = expenseAccountsAllTime.reduce((sum, e) => sum + e.balance, 0);
  const retainedEarnings = cumulativeIncome - cumulativeExpenses;

  const totalCapital = baseCapital + retainedEarnings;
  const totalLiabilitiesAndCapital = totalLiabilities + totalCapital;

  // Accounting equation balance check: Assets === Liabilities + Capital
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndCapital) < 0.01;

  return {
    year,
    asOfDate: asOf.toISOString(),
    assetItems: assetAccounts,
    totalAssets,
    liabilityItems: liabilityAccounts,
    totalLiabilities,
    capitalItems: capitalAccounts,
    retainedEarnings,
    totalCapital,
    totalLiabilitiesAndCapital,
    isBalanced,
    availableYears,
  };
}
