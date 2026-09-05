// Vendor Bill Server Actions & Auto Journal Entry Engine for Urban Furniture Accounting System.
// Yeh file Vendor Bills ke CRUD operations aur double-entry accounting engine ka central part handle karti hai.
// Core Accounting Logic: Vendor Bill confirm hone par system automatically Purchase Journal me balanced Journal Entry post karta hai.
// Batch Fetching: BillLine me foreign key relation bypass karke batch product aur chart of account queries execute hoti hain.
// Used by: /purchase/bills, /purchase/bills/new, /purchase/bills/[id] aur Contact User portal.

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nextBillNumber } from "@/lib/sequence";
import { BillInvoiceStatus, JournalEntryStatus, JournalType } from "@prisma/client";

// Zod Schema for Vendor Bill Line item
const billLineSchema = z.object({
  productId: z.string().min(1, "Product selection required"),
  chartOfAccountId: z.string().min(1, "Chart of Account required"),
  analyticAccountId: z.string().optional().nullable(),
  qty: z.number().gt(0, "Quantity 0 se badi honi chahiye"),
  unitPrice: z.number().gte(0, "Unit Price negative nahi ho sakti"),
});

// Zod Schema for Vendor Bill creation
const vendorBillSchema = z.object({
  vendorId: z.string().min(1, "Vendor select karna zaroori hai"),
  billReference: z.string().optional().nullable(),
  billDate: z.string().min(1, "Bill Date valid honi chahiye"),
  dueDate: z.string().min(1, "Due Date valid honi chahiye"),
  sourcePOId: z.string().optional().nullable(),
  lines: z.array(billLineSchema).min(1, "Kam se kam 1 line item hona zaroori hai"),
});

export type VendorBillInput = z.infer<typeof vendorBillSchema>;

export type ActionResult<T = any> = {
  success?: boolean;
  error?: string;
  id?: string;
  data?: T;
};

/**
 * getVendorBills: Vendor Bills ki list fetch karta hai table view ke liye.
 * Agar `contactId` pass kiya jaye (CONTACT_USER vendor ke liye), to sirf unki apni bills hi return hoti hain.
 * Used by: /purchase/bills/page.tsx aur Vendor portal view.
 */
export async function getVendorBills(filterContactId?: string) {
  const whereClause: any = {};
  if (filterContactId) {
    whereClause.vendorId = filterContactId;
  }

  const bills = await prisma.vendorBill.findMany({
    where: whereClause,
    include: {
      vendor: {
        select: { id: true, name: true, email: true },
      },
      lines: true,
      payments: {
        select: { id: true, amount: true, method: true },
      },
      sourcePO: {
        select: { id: true, poNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return bills.map((bill) => {
    const total = bill.lines.reduce((sum, line) => {
      return sum + Number(line.qty) * Number(line.unitPrice);
    }, 0);

    const paidAmount = Number(bill.paidAmount);
    const amountDue = total - paidAmount;

    const paidViaCash = bill.payments
      .filter((p) => p.method === "CASH")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const paidViaBank = bill.payments
      .filter((p) => p.method === "BANK")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      id: bill.id,
      billNumber: bill.billNumber,
      vendorId: bill.vendorId,
      vendorName: bill.vendor.name,
      billReference: bill.billReference,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      status: bill.status,
      total,
      paidAmount,
      amountDue: amountDue < 0 ? 0 : amountDue,
      paidViaCash,
      paidViaBank,
      sourcePOId: bill.sourcePOId,
      sourcePONumber: bill.sourcePO?.poNumber || null,
    };
  });
}

/**
 * getVendorBillById: Single Vendor Bill ki complete detail lines, payments aur linked PO/JournalEntry ke saath fetch karta hai.
 * Batch fetches products & chart of accounts for line items.
 * Used by: /purchase/bills/[id]/page.tsx
 */
export async function getVendorBillById(id: string) {
  const bill = await prisma.vendorBill.findUnique({
    where: { id },
    include: {
      vendor: {
        select: { id: true, name: true, email: true, type: true },
      },
      lines: true,
      payments: {
        orderBy: { date: "desc" },
      },
      sourcePO: {
        select: { id: true, poNumber: true },
      },
    },
  });

  if (!bill) return null;

  // Batch query products
  const productIds = Array.from(new Set(bill.lines.map((l) => l.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, cost: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Batch query Chart of Accounts
  const coaIds = Array.from(new Set(bill.lines.map((l) => l.chartOfAccountId)));
  const coas = await prisma.chartOfAccount.findMany({
    where: { id: { in: coaIds } },
    select: { id: true, name: true },
  });
  const coaMap = new Map(coas.map((c) => [c.id, c.name]));

  const linesWithDetails = bill.lines.map((l) => ({
    ...l,
    product: productMap.get(l.productId)
      ? {
          name: productMap.get(l.productId)!.name,
          cost: Number(productMap.get(l.productId)!.cost),
        }
      : undefined,
    chartOfAccountName: coaMap.get(l.chartOfAccountId) || "Expense Account",
    lineTotal: Number(l.qty) * Number(l.unitPrice),
  }));

  const total = linesWithDetails.reduce((sum, line) => sum + line.lineTotal, 0);
  const paidAmount = Number(bill.paidAmount);
  const amountDue = Math.max(0, total - paidAmount);

  const paidViaCash = bill.payments
    .filter((p) => p.method === "CASH")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const paidViaBank = bill.payments
    .filter((p) => p.method === "BANK")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    ...bill,
    lines: linesWithDetails,
    total,
    paidAmount,
    amountDue,
    paidViaCash,
    paidViaBank,
  };
}

/**
 * createVendorBill: Fresh Vendor Bill ya PO se derived Vendor Bill create karta hai.
 * Format: Auto-generated `Bill/2026/0001` format follow karta hai.
 * Used by: /purchase/bills/new page.
 */
export async function createVendorBill(input: VendorBillInput): Promise<ActionResult> {
  const parsed = vendorBillSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { vendorId, billReference, billDate, dueDate, sourcePOId, lines } = parsed.data;

  // Verify Vendor
  const vendor = await prisma.contact.findUnique({ where: { id: vendorId } });
  if (!vendor || (vendor.type !== "VENDOR" && vendor.type !== "BOTH")) {
    return { error: "Select kiya gaya partner valid Vendor nahi hai." };
  }

  // Prevent duplicate bill creation for the same Purchase Order
  if (sourcePOId) {
    const existingBill = await prisma.vendorBill.findFirst({
      where: {
        sourcePOId,
        status: { not: BillInvoiceStatus.CANCELLED },
      },
      select: { billNumber: true },
    });
    if (existingBill) {
      return {
        error: `Is Purchase Order ke liye pehle se active Vendor Bill (${existingBill.billNumber}) bani hui hai. Duplicate bill create nahi ki ja sakti.`,
      };
    }
  }

  const billNumber = await nextBillNumber();

  const createdBill = await prisma.$transaction(async (tx) => {
    const bill = await tx.vendorBill.create({
      data: {
        billNumber,
        vendorId,
        billReference: billReference || null,
        billDate: new Date(billDate),
        dueDate: new Date(dueDate),
        sourcePOId: sourcePOId || null,
        status: BillInvoiceStatus.DRAFT,
        paidAmount: 0,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            chartOfAccountId: l.chartOfAccountId,
            analyticAccountId: l.analyticAccountId || null,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        },
      },
    });

    return bill;
  });

  revalidatePath("/purchase/bills");
  return { success: true, id: createdBill.id };
}

/**
 * confirmVendorBill: Draft Vendor Bill ko CONFIRMED status me le jata hai aur Automatic Journal Entry generate karta hai.
 * Specification §4.1 Logic:
 * 1. Bill lines ko chartOfAccountId ke hisaab se group karke sum debit nikala jata hai.
 * 2. Purchase Journal (type = PURCHASE) aur Creditors Account (type = LIABILITY, isSystem = true) fetch kiye jaate hain.
 * 3. Ek JournalEntry post (POSTED status) ki jaati hai jisme har account group ka Debit aur Total sum Creditors account me Credit hota hai.
 * 4. Sum(debit) === sum(credit) verify hone par hi database transaction commit hota hai.
 * Used by: Vendor Bill detail view (`Confirm` button action).
 */
export async function confirmVendorBill(id: string): Promise<ActionResult> {
  const bill = await prisma.vendorBill.findUnique({
    where: { id },
    include: { lines: true, vendor: true },
  });

  if (!bill) return { error: "Vendor Bill nahi mili." };
  if (bill.status !== BillInvoiceStatus.DRAFT) {
    return { error: "Keval Draft Vendor Bill hi confirm ho sakti hain." };
  }

  if (bill.lines.length === 0) {
    return { error: "Vendor Bill me kam se kam 1 line item hona zaroori hai." };
  }

  // 1. Group lines by chartOfAccountId
  const accountGroups = new Map<string, number>();
  let totalBillAmount = 0;

  for (const line of bill.lines) {
    const lineAmount = Number(line.qty) * Number(line.unitPrice);
    totalBillAmount += lineAmount;
    const currentGroup = accountGroups.get(line.chartOfAccountId) || 0;
    accountGroups.set(line.chartOfAccountId, currentGroup + lineAmount);
  }

  if (totalBillAmount <= 0) {
    return { error: "Vendor Bill ka Total amount 0 se bada hona zaroori hai." };
  }

  // 2. Fetch seeded Purchase Journal
  const purchaseJournal = await prisma.journal.findFirst({
    where: { type: JournalType.PURCHASE },
  });

  if (!purchaseJournal) {
    return { error: "System me seeded Purchase Journal nahi mil paya. Please seed run karen." };
  }

  // 3. Fetch seeded Creditors account
  const creditorsAccount = await prisma.chartOfAccount.findFirst({
    where: {
      OR: [
        { name: "Creditors" },
        { type: "LIABILITY", isSystem: true },
      ],
    },
  });

  if (!creditorsAccount) {
    return { error: "System me seeded 'Creditors' Account nahi mil paya." };
  }

  // Transaction execution: JournalEntry + JournalItems + Bill status update
  await prisma.$transaction(async (tx) => {
    // Build journal items array
    const journalItemsData: Array<{
      accountId: string;
      partnerId: string;
      debit: number;
      credit: number;
    }> = [];

    let totalDebitSum = 0;

    // Debit entries per chartOfAccount group
    for (const [accountId, groupTotal] of accountGroups.entries()) {
      journalItemsData.push({
        accountId,
        partnerId: bill.vendorId,
        debit: groupTotal,
        credit: 0,
      });
      totalDebitSum += groupTotal;
    }

    // Credit entry for Creditors Liability account
    const totalCreditSum = totalBillAmount;
    journalItemsData.push({
      accountId: creditorsAccount.id,
      partnerId: bill.vendorId,
      debit: 0,
      credit: totalCreditSum,
    });

    // Invariant Check: Sum of Debits MUST equal Sum of Credits
    if (Math.abs(totalDebitSum - totalCreditSum) > 0.001) {
      throw new Error(
        `Journal entry unbalanced: Total Debit (${totalDebitSum}) does not equal Total Credit (${totalCreditSum}). Transaction rolled back.`
      );
    }

    // Create Journal Entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        journalId: purchaseJournal.id,
        accountingDate: bill.billDate,
        reference: bill.billNumber,
        partnerId: bill.vendorId,
        status: JournalEntryStatus.POSTED,
        items: {
          create: journalItemsData.map((item) => ({
            accountId: item.accountId,
            partnerId: item.partnerId,
            debit: item.debit,
            credit: item.credit,
          })),
        },
      },
    });

    // Update Vendor Bill status to CONFIRMED and store journalEntryId link
    await tx.vendorBill.update({
      where: { id },
      data: {
        status: BillInvoiceStatus.CONFIRMED,
        journalEntryId: journalEntry.id,
      },
    });
  });

  revalidatePath("/purchase/bills");
  revalidatePath(`/purchase/bills/${id}`);
  revalidatePath("/accounting/journal-entries");
  return { success: true };
}

/**
 * cancelVendorBill: Draft Vendor Bill ko CANCELLED status me badalta hai.
 * Rule: Post ho chuki ya pay ho chuki Vendor Bills cancel nahi ki ja sakti.
 * Used by: Vendor Bill detail view (`Cancel` button action).
 */
export async function cancelVendorBill(id: string): Promise<ActionResult> {
  const bill = await prisma.vendorBill.findUnique({
    where: { id },
  });

  if (!bill) return { error: "Vendor Bill nahi mili." };
  if (bill.status !== BillInvoiceStatus.DRAFT) {
    return { error: "Keval Draft Vendor Bill ko hi cancel kiya ja sakta hai." };
  }

  await prisma.vendorBill.update({
    where: { id },
    data: { status: BillInvoiceStatus.CANCELLED },
  });

  revalidatePath("/purchase/bills");
  revalidatePath(`/purchase/bills/${id}`);
  return { success: true };
}
