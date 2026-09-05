// Auto-numbering sequence helper for Urban Furniture Accounting System.
// Yeh file purchase orders (P00001) aur vendor bills (Bill/2026/0001) ke unique sequential document numbers generate karne ka kaam karti hai.
// Primary Mechanism: Database se current maximum document number padha jata hai, usme 1 add karke zero-padding (5 digits for PO, 4 digits for Bill) ke saath return kiya jata hai.
// Alternative Rejected: Postgres SEQUENCE ya Counter Table — basharta concurrency scalability ho, lekin demo app aur simple transaction boundary ke liye Max+1 simple aur robust solution hai bina extra schema complexity ke.
// Used by: lib/actions/purchase-orders.ts and lib/actions/vendor-bills.ts inside creation transactions.

import { prisma } from "@/lib/prisma";

/**
 * nextPoNumber: Purchase Order ke liye next sequential number generate karta hai.
 * Format: P00001, P00002, P00003... (P prefix ke saath 5-digit zero padded number).
 * Yeh function existing max number search karta hai, numeric part extract karke +1 increment karta hai.
 * Used by: Purchase Order creation action (createPurchaseOrder).
 */
export async function nextPoNumber(): Promise<string> {
  // Query to get the latest Purchase Order ordered by poNumber descending
  const lastPo = await prisma.purchaseOrder.findFirst({
    where: {
      poNumber: {
        startsWith: "P",
      },
    },
    orderBy: {
      poNumber: "desc",
    },
    select: {
      poNumber: true,
    },
  });

  if (!lastPo || !lastPo.poNumber) {
    return "P00001";
  }

  // Parse numeric part from P00001 -> 1
  const numericPart = parseInt(lastPo.poNumber.slice(1), 10);
  const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;

  // Zero-pad to 5 digits (e.g. P00002)
  return `P${String(nextNum).padStart(5, "0")}`;
}

/**
 * nextBillNumber: Vendor Bill ke liye yearly resetting sequential bill number generate karta hai.
 * Format: Bill/2026/0001, Bill/2026/0002... (Prefix Bill/ + current year + 4-digit zero padded number).
 * Har calendar year (1 Jan) ko counter automatic 0001 se reset hota hai kyunki where clause current year ke prefix ko filter karti hai.
 * Used by: Vendor Bill creation action (createVendorBill).
 */
export async function nextBillNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `Bill/${currentYear}/`;

  // Query to find the latest Vendor Bill for the current year
  const lastBill = await prisma.vendorBill.findFirst({
    where: {
      billNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      billNumber: "desc",
    },
    select: {
      billNumber: true,
    },
  });

  if (!lastBill || !lastBill.billNumber) {
    return `${prefix}0001`;
  }

  // Parse numeric part from Bill/2026/0001 -> 1
  const numericPart = parseInt(lastBill.billNumber.replace(prefix, ""), 10);
  const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;

  // Zero-pad to 4 digits (e.g. Bill/2026/0002)
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}
