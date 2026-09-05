// Auto-numbering sequence helper for Urban Furniture Accounting System.
// Yeh file purchase orders (P00001), vendor bills (Bill/2026/0001), sales orders (S00001), customer invoices (INV/2026/0001), aur manual journal entries (JE-00001) ke unique sequential document numbers generate karne ka kaam karti hai.
// Primary Mechanism: Database se current maximum document number padha jata hai, usme 1 add karke zero-padding ke saath return kiya jata hai.
// Used by: lib/actions/purchase-orders.ts, lib/actions/vendor-bills.ts, lib/actions/sales-orders.ts, lib/actions/customer-invoices.ts, and lib/actions/journal-entries.ts.

import { prisma } from "@/lib/prisma";

/**
 * nextPoNumber: Purchase Order ke liye next sequential number generate karta hai.
 * Format: P00001, P00002, P00003... (P prefix ke saath 5-digit zero padded number).
 * Used by: Purchase Order creation action (createPurchaseOrder).
 */
export async function nextPoNumber(): Promise<string> {
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

  const numericPart = parseInt(lastPo.poNumber.slice(1), 10);
  const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;

  return `P${String(nextNum).padStart(5, "0")}`;
}

/**
 * nextBillNumber: Vendor Bill ke liye yearly resetting sequential bill number generate karta hai.
 * Format: Bill/2026/0001, Bill/2026/0002...
 * Used by: Vendor Bill creation action (createVendorBill).
 */
export async function nextBillNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `Bill/${currentYear}/`;

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

  const numericPart = parseInt(lastBill.billNumber.replace(prefix, ""), 10);
  const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

/**
 * nextSoNumber: Sales Order ke liye sequential number generate karta hai.
 * Format: S00001, S00002, S00003... (S prefix ke saath 5-digit zero padded running number, never resets).
 * Used by: Sales Order creation action (lib/actions/sales-orders.ts).
 */
export async function nextSoNumber(): Promise<string> {
  const lastSo = await prisma.salesOrder.findFirst({
    where: {
      soNumber: {
        startsWith: "S",
      },
    },
    orderBy: {
      soNumber: "desc",
    },
    select: {
      soNumber: true,
    },
  });

  if (!lastSo || !lastSo.soNumber) {
    return "S00001";
  }

  const numericPart = parseInt(lastSo.soNumber.slice(1), 10);
  const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;

  return `S${String(nextNum).padStart(5, "0")}`;
}

/**
 * nextInvoiceNumber: Customer Invoice ke liye yearly resetting sequential invoice number generate karta hai.
 * Format: INV/2026/0001, INV/2026/0002... (Prefix INV/ + current year + 4-digit zero padded number).
 * Used by: Customer Invoice creation action (lib/actions/customer-invoices.ts).
 */
export async function nextInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INV/${currentYear}/`;

  const lastInvoice = await prisma.customerInvoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  if (!lastInvoice || !lastInvoice.invoiceNumber) {
    return `${prefix}0001`;
  }

  const numericPart = parseInt(lastInvoice.invoiceNumber.replace(prefix, ""), 10);
  const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

/**
 * nextJeNumber: Manual Journal Entries ke liye next sequential entry reference generate karta hai.
 * Format: JE-00001, JE-00002, JE-00003...
 * Used by: Manual Journal Entry creation form default reference value.
 */
export async function nextJeNumber(): Promise<string> {
  const lastJe = await prisma.journalEntry.findFirst({
    where: {
      reference: { startsWith: "JE-" },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      reference: true,
    },
  });

  let maxNum = 0;
  if (lastJe && lastJe.reference) {
    const rawNum = lastJe.reference.slice(3);
    const parsed = parseInt(rawNum, 10);
    if (!isNaN(parsed)) {
      maxNum = parsed;
    }
  }

  const nextNum = maxNum + 1;
  return `JE-${String(nextNum).padStart(5, "0")}`;
}
