// Budget Report Server Action for Urban Furniture Accounting System.
// Yeh file selected fiscal year me active Confirmed aur Revised Budgets ke performance metrics (Committed vs Achieved) aggregate karti hai.
// Spec §3.3 Compliance:
// - Excludes DRAFT and CANCELLED budgets.
// - Reuses getBudgetAchievedAmount formula from Prompt 4 for live Achieved Amount calculation.
// - Returns summary table rows with overall Total Committed, Total Achieved, and Overall Achieved %.
// Used by: /reports/budget-report page and BudgetReportView client component.

"use server";

import { prisma } from "@/lib/prisma";
import { getBudgetAchievedAmount } from "@/lib/actions/budgets.actions";
import { getAvailableFiscalYears } from "./account-balance";
import { BudgetStatus } from "@prisma/client";

export interface BudgetReportRow {
  id: string;
  name: string;
  analyticAccountName: string;
  analyticAccountType: string;
  periodStart: string;
  periodEnd: string;
  committedAmount: number;
  achievedAmount: number;
  achievedPercentage: number;
  amountToAchieve: number;
  status: string;
}

export interface BudgetReportData {
  year: number;
  items: BudgetReportRow[];
  totalCommitted: number;
  totalAchieved: number;
  totalAmountToAchieve: number;
  overallPercentage: number;
  availableYears: number[];
}

/**
 * getBudgetReport: Selected year ke overlapping active budgets ki detailed performance summary report fetch karta hai.
 */
export async function getBudgetReport(selectedYear?: number): Promise<BudgetReportData> {
  const currentYear = new Date().getFullYear();
  const year = selectedYear || currentYear;

  const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  // Fetch confirmed & revised budgets overlapping the selected year
  const budgets = await prisma.budget.findMany({
    where: {
      status: { in: [BudgetStatus.CONFIRMED, BudgetStatus.REVISED] },
      periodStart: { lte: yearEnd },
      periodEnd: { gte: yearStart },
    },
    include: {
      analyticAccount: { select: { name: true, type: true } },
    },
    orderBy: { periodStart: "asc" },
  });

  const availableYears = await getAvailableFiscalYears();

  // Compute live achieved amount for each budget using Prompt 4 server action
  const items: BudgetReportRow[] = await Promise.all(
    budgets.map(async (b) => {
      const metrics = await getBudgetAchievedAmount(b.id);
      return {
        id: b.id,
        name: b.name,
        analyticAccountName: b.analyticAccount.name,
        analyticAccountType: b.analyticAccount.type,
        periodStart: b.periodStart.toISOString(),
        periodEnd: b.periodEnd.toISOString(),
        committedAmount: Number(b.committedAmount),
        achievedAmount: metrics.achievedAmount,
        achievedPercentage: metrics.achievedPercentage,
        amountToAchieve: metrics.amountToAchieve,
        status: b.status,
      };
    })
  );

  const totalCommitted = items.reduce((sum, item) => sum + item.committedAmount, 0);
  const totalAchieved = items.reduce((sum, item) => sum + item.achievedAmount, 0);
  const totalAmountToAchieve = totalCommitted - totalAchieved;
  const overallPercentage = totalCommitted > 0 ? (totalAchieved / totalCommitted) * 100 : 0;

  return {
    year,
    items,
    totalCommitted,
    totalAchieved,
    totalAmountToAchieve,
    overallPercentage,
    availableYears,
  };
}
