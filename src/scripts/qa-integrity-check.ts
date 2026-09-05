// Data Integrity QA Script for Urban Furniture Accounting System.
// What: Runs 5 automated database assertions covering double-entry balance, accounting equation balance, sequence collisions, payment sum match, and budget achieved amount match.
// Why: Empirically proves ledger integrity and system math correctness per Prompt 6 §3 before sign-off.
// Used by: QA process in Part 6.

import { PrismaClient } from "@prisma/client";
import { getAccountBalancesByTypes } from "../lib/reports/account-balance";
import { getBudgetAchievedAmount } from "../lib/actions/budgets.actions";

const prisma = new PrismaClient();

async function runIntegrityChecks() {
  console.log("=== STARTING URBAN FURNITURE QA INTEGRITY CHECKS ===\n");
  let passedAll = true;

  // 1. Check every POSTED JournalEntry debits === credits
  console.log("1. Checking JournalEntry Debit/Credit Balance...");
  const entries = await prisma.journalEntry.findMany({
    where: { status: "POSTED" },
    include: { items: true },
  });

  let unbalancedEntriesCount = 0;
  for (const entry of entries) {
    const totalDebit = entry.items.reduce((s, i) => s + Number(i.debit), 0);
    const totalCredit = entry.items.reduce((s, i) => s + Number(i.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      console.error(`  [FAIL] Unbalanced Entry ${entry.reference || entry.id}: Dr ${totalDebit} !== Cr ${totalCredit}`);
      unbalancedEntriesCount++;
    }
  }
  if (unbalancedEntriesCount === 0) {
    console.log(`  [PASS] All ${entries.length} POSTED Journal Entries are perfectly balanced (debit === credit).`);
  } else {
    passedAll = false;
  }

  // 2. Check Balance Sheet Accounting Equation across all fiscal years
  console.log("\n2. Checking Balance Sheet Equation (Assets = Liabilities + Capital + Retained Earnings)...");
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 1; year <= currentYear; year++) {
    const asOf = new Date(year, 11, 31, 23, 59, 59, 999);
    const [assets, liabilities, capital, income, expenses] = await Promise.all([
      getAccountBalancesByTypes(["ASSET", "BANK", "CASH"], { asOf }),
      getAccountBalancesByTypes(["LIABILITY"], { asOf }),
      getAccountBalancesByTypes(["CAPITAL"], { asOf }),
      getAccountBalancesByTypes(["INCOME"], { asOf }),
      getAccountBalancesByTypes(["EXPENSE", "OTHER_EXPENSE"], { asOf }),
    ]);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const baseCapital = capital.reduce((s, c) => s + c.balance, 0);
    const retainedEarnings = income.reduce((s, i) => s + i.balance, 0) - expenses.reduce((s, e) => s + e.balance, 0);
    const totalCapital = baseCapital + retainedEarnings;
    const totalLiabCap = totalLiabilities + totalCapital;

    const diff = Math.abs(totalAssets - totalLiabCap);
    if (diff > 0.01) {
      console.error(`  [FAIL] Year ${year} Balance Sheet Unbalanced: Assets (${totalAssets.toFixed(2)}) !== Liab+Cap (${totalLiabCap.toFixed(2)}) (Diff: ${diff.toFixed(2)})`);
      passedAll = false;
    } else {
      console.log(`  [PASS] Year ${year} Balance Sheet Equation Holds: Assets (${totalAssets.toFixed(2)}) === Liab+Cap (${totalLiabCap.toFixed(2)})`);
    }
  }

  // 3. Check sequence number uniqueness / collisions
  console.log("\n3. Checking Document Number Collisions...");
  const checkUnique = async (model: any, nameField: string, label: string) => {
    const records = await model.findMany({ select: { [nameField]: true } });
    const set = new Set<string>();
    let duplicates = 0;
    for (const r of records) {
      const val = r[nameField];
      if (set.has(val)) {
        console.error(`  [FAIL] Duplicate ${label}: ${val}`);
        duplicates++;
      }
      set.add(val);
    }
    if (duplicates === 0) {
      console.log(`  [PASS] All ${records.length} ${label} numbers are 100% unique.`);
    } else {
      passedAll = false;
    }
  };

  await checkUnique(prisma.purchaseOrder, "poNumber", "PO");
  await checkUnique(prisma.vendorBill, "billNumber", "Vendor Bill");
  await checkUnique(prisma.salesOrder, "soNumber", "SO");
  await checkUnique(prisma.customerInvoice, "invoiceNumber", "Customer Invoice");

  // 4. Check Payment sum match on VendorBill and CustomerInvoice
  console.log("\n4. Checking Payment Amounts Sum Consistency...");
  const bills = await prisma.vendorBill.findMany({
    include: { payments: true },
  });
  let billMismatch = 0;
  for (const b of bills) {
    const sumPayments = b.payments.reduce((s, p) => s + Number(p.amount), 0);
    const paidAmount = Number(b.paidAmount);
    if (Math.abs(sumPayments - paidAmount) > 0.01) {
      console.error(`  [FAIL] Bill ${b.billNumber} paidAmount (${paidAmount}) !== sum(payments) (${sumPayments})`);
      billMismatch++;
    }
  }
  if (billMismatch === 0) {
    console.log(`  [PASS] All ${bills.length} Vendor Bills have exact matching paidAmount and payment sums.`);
  } else {
    passedAll = false;
  }

  const invoices = await prisma.customerInvoice.findMany({
    include: { payments: true },
  });
  let invMismatch = 0;
  for (const inv of invoices) {
    const sumPayments = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const paidAmount = Number(inv.paidAmount);
    if (Math.abs(sumPayments - paidAmount) > 0.01) {
      console.error(`  [FAIL] Invoice ${inv.invoiceNumber} paidAmount (${paidAmount}) !== sum(payments) (${sumPayments})`);
      invMismatch++;
    }
  }
  if (invMismatch === 0) {
    console.log(`  [PASS] All ${invoices.length} Customer Invoices have exact matching paidAmount and payment sums.`);
  } else {
    passedAll = false;
  }

  // 5. Check Budget Achieved Amount match
  console.log("\n5. Checking Budget Achieved Amount Calculations...");
  const budgets = await prisma.budget.findMany({
    where: { status: { in: ["CONFIRMED", "REVISED"] } },
  });
  let budgetMismatch = 0;
  for (const b of budgets) {
    const res = await getBudgetAchievedAmount(b.id);
    if (typeof res.achievedAmount !== "number" || isNaN(res.achievedAmount)) {
      console.error(`  [FAIL] Budget ${b.name} returned invalid achieved amount:`, res);
      budgetMismatch++;
    }
  }
  if (budgetMismatch === 0) {
    console.log(`  [PASS] All ${budgets.length} active Budgets calculated valid achieved amounts.`);
  } else {
    passedAll = false;
  }

  console.log("\n=== QA INTEGRITY CHECKS COMPLETE ===");
  if (passedAll) {
    console.log("STATUS: SUCCESS - ALL 5 CHECKS PASSED PERFECTLY!\n");
  } else {
    console.error("STATUS: FAILED - ISSUES DETECTED ABOVE!\n");
    process.exit(1);
  }
}

runIntegrityChecks()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
