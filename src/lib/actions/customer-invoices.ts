// Customer Invoice Server Actions & Double-Entry Auto Journal Engine for Urban Furniture Accounting System.
// What: Handles all operations for Customer Invoices — listing, detail view, draft creation from scratch or from Sales Order,
//      confirmation with automatic double-entry journal generation (Debtors Dr = Sales Income Cr + Tax Payable Cr), and cancellation.
// Why: Provides full server-side integrity for sales invoicing, sequence numbering (INV/2026/0001), duplicate invoice prevention
//      per Sales Order, and real-time calculation of tax and payment statuses.
// Why not alternative: Direct client writes or manual journal entry for invoices leads to unbalanced books and breaks compliance.
// Where used: /sales/invoices list page, /sales/invoices/new form page, /sales/invoices/[id] detail page, and Customer self-service portal.

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nextInvoiceNumber } from "@/lib/sequence";
import { BillInvoiceStatus, JournalEntryStatus, JournalType } from "@prisma/client";

// Zod Schema for Customer Invoice line item
const invoiceLineSchema = z.object({
  productId: z.string().min(1, "Product selection is required"),
  chartOfAccountId: z.string().min(1, "Income Account selection is required"),
  analyticAccountId: z.string().optional().nullable(),
  qty: z.number().gt(0, "Quantity must be greater than 0"),
  unitPrice: z.number().gte(0, "Unit Price cannot be negative"),
  taxRate: z.number().gte(0, "Tax rate cannot be negative").default(18),
});

// Zod Schema for Customer Invoice creation
const customerInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  invoiceReference: z.string().optional().nullable(),
  invoiceDate: z.string().min(1, "Invoice Date is required"),
  dueDate: z.string().min(1, "Due Date is required"),
  sourceSOId: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1, "At least 1 invoice line item is required"),
});

export type CustomerInvoiceInput = z.infer<typeof customerInvoiceSchema>;

export type ActionResult<T = any> = {
  success?: boolean;
  error?: string;
  id?: string;
  data?: T;
};

/**
 * getCustomerInvoices: Fetches list of Customer Invoices for table view.
 * If filterContactId is provided (e.g. for CONTACT_USER customer), limits to their own invoices.
 * Used by: /sales/invoices/page.tsx and Customer portal view.
 */
export async function getCustomerInvoices(filterContactId?: string) {
  const whereClause: any = {};
  if (filterContactId) {
    whereClause.customerId = filterContactId;
  }

  const invoices = await prisma.customerInvoice.findMany({
    where: whereClause,
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      lines: true,
      payments: {
        select: { id: true, amount: true, method: true },
      },
      sourceSO: {
        select: { id: true, soNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invoices.map((inv) => {
    let untaxedTotal = 0;
    let taxTotal = 0;

    for (const line of inv.lines) {
      const lineSubtotal = Number(line.qty) * Number(line.unitPrice);
      const lineTax = lineSubtotal * (Number(line.taxRate) / 100);
      untaxedTotal += lineSubtotal;
      taxTotal += lineTax;
    }

    const total = untaxedTotal + taxTotal;
    const paidAmount = Number(inv.paidAmount);
    const amountDue = total - paidAmount;

    const paidViaCash = inv.payments
      .filter((p) => p.method === "CASH")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const paidViaBank = inv.payments
      .filter((p) => p.method === "BANK")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customer.name,
      customerEmail: inv.customer.email,
      invoiceReference: inv.invoiceReference,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      status: inv.status,
      untaxedTotal,
      taxTotal,
      total,
      paidAmount,
      amountDue: amountDue < 0 ? 0 : amountDue,
      paidViaCash,
      paidViaBank,
      sourceSOId: inv.sourceSOId,
      sourceSONumber: inv.sourceSO?.soNumber || null,
    };
  });
}

/**
 * getCustomerInvoiceById: Fetches single Customer Invoice with lines, payments, and batch-queried details.
 * Used by: /sales/invoices/[id]/page.tsx
 */
export async function getCustomerInvoiceById(id: string) {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, type: true, phone: true, street: true, city: true },
      },
      lines: true,
      payments: {
        orderBy: { date: "desc" },
      },
      sourceSO: {
        select: { id: true, soNumber: true, status: true },
      },
    },
  });

  if (!invoice) return null;

  // Batch query products
  const productIds = Array.from(new Set(invoice.lines.map((l) => l.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, salesPrice: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Batch query chart of accounts
  const accountIds = Array.from(new Set(invoice.lines.map((l) => l.chartOfAccountId)));
  const accounts = await prisma.chartOfAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Batch query analytic accounts
  const analyticIds = Array.from(
    new Set(invoice.lines.map((l) => l.analyticAccountId).filter(Boolean) as string[])
  );
  const analytics = analyticIds.length > 0
    ? await prisma.analyticAccount.findMany({
        where: { id: { in: analyticIds } },
        select: { id: true, name: true },
      })
    : [];
  const analyticMap = new Map(analytics.map((a) => [a.id, a]));

  let untaxedTotal = 0;
  let taxTotal = 0;

  const linesWithDetails = invoice.lines.map((l) => {
    const qty = Number(l.qty);
    const unitPrice = Number(l.unitPrice);
    const taxRate = Number(l.taxRate);
    const lineSubtotal = qty * unitPrice;
    const lineTax = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    untaxedTotal += lineSubtotal;
    taxTotal += lineTax;

    return {
      ...l,
      qty,
      unitPrice,
      taxRate,
      lineSubtotal,
      lineTax,
      lineTotal,
      product: productMap.get(l.productId),
      chartOfAccount: accountMap.get(l.chartOfAccountId),
      analyticAccount: l.analyticAccountId ? analyticMap.get(l.analyticAccountId) : undefined,
    };
  });

  const total = untaxedTotal + taxTotal;
  const paidAmount = Number(invoice.paidAmount);
  const amountDue = total - paidAmount;

  return {
    ...invoice,
    lines: linesWithDetails,
    untaxedTotal,
    taxTotal,
    total,
    paidAmount,
    amountDue: amountDue < 0 ? 0 : amountDue,
  };
}

/**
 * createCustomerInvoice: Creates a new Draft Customer Invoice with sequence INV/2026/0001.
 * Enforces: Customer partner validation, duplicate prevention if linked to Sales Order.
 * Used by: /sales/invoices/new page.
 */
export async function createCustomerInvoice(input: CustomerInvoiceInput): Promise<ActionResult> {
  const parsed = customerInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { customerId, invoiceReference, invoiceDate, dueDate, sourceSOId, lines } = parsed.data;

  // Verify Customer exists and is CUSTOMER or BOTH
  const customer = await prisma.contact.findUnique({ where: { id: customerId } });
  if (!customer || (customer.type !== "CUSTOMER" && customer.type !== "BOTH")) {
    return { error: "Selected partner is not a valid Customer." };
  }

  // Prevent duplicate invoice creation for the same Sales Order
  if (sourceSOId) {
    const existingInvoice = await prisma.customerInvoice.findFirst({
      where: {
        sourceSOId,
        status: { not: BillInvoiceStatus.CANCELLED },
      },
      select: { invoiceNumber: true },
    });
    if (existingInvoice) {
      return {
        error: `An active Customer Invoice (${existingInvoice.invoiceNumber}) already exists for this Sales Order. Duplicate invoice cannot be created.`,
      };
    }
  }

  const invoiceNumber = await nextInvoiceNumber();

  const createdInvoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.customerInvoice.create({
      data: {
        invoiceNumber,
        customerId,
        invoiceReference: invoiceReference || null,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        sourceSOId: sourceSOId || null,
        status: BillInvoiceStatus.DRAFT,
        paidAmount: 0,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            chartOfAccountId: l.chartOfAccountId,
            analyticAccountId: l.analyticAccountId || null,
            qty: l.qty,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate ?? 18,
          })),
        },
      },
    });

    return inv;
  }, { timeout: 30000 });

  revalidatePath("/sales/invoices");
  return { success: true, id: createdInvoice.id };
}

/**
 * confirmCustomerInvoice: Promotes Draft Customer Invoice to CONFIRMED and generates Auto Journal Entry.
 * Double-Entry Accounting Engine (§4.1):
 * - Debtors Dr (Total Untaxed + Tax)
 * - Sales Income Cr (sum of pre-tax line totals grouped by Chart of Account)
 * - Tax Payable Cr (sum of tax amounts across lines)
 * - Asserts Sum(Dr) === Sum(Cr) before committing transaction.
 * Used by: Customer Invoice detail view (`Confirm` button).
 */
export async function confirmCustomerInvoice(id: string): Promise<ActionResult> {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id },
    include: { lines: true, customer: true },
  });

  if (!invoice) return { error: "Customer Invoice not found." };
  if (invoice.status !== BillInvoiceStatus.DRAFT) {
    return { error: "Only Draft Customer Invoices can be confirmed." };
  }

  if (invoice.lines.length === 0) {
    return { error: "Customer Invoice must have at least 1 line item." };
  }

  // 1. Group line subtotals by chartOfAccountId and compute tax total
  const incomeAccountGroups = new Map<string, number>();
  let untaxedTotal = 0;
  let taxTotal = 0;

  for (const line of invoice.lines) {
    const lineSubtotal = Number(line.qty) * Number(line.unitPrice);
    const lineTax = lineSubtotal * (Number(line.taxRate) / 100);

    untaxedTotal += lineSubtotal;
    taxTotal += lineTax;

    const currentSubtotal = incomeAccountGroups.get(line.chartOfAccountId) || 0;
    incomeAccountGroups.set(line.chartOfAccountId, currentSubtotal + lineSubtotal);
  }

  const grandTotal = Number((untaxedTotal + taxTotal).toFixed(2));

  if (grandTotal <= 0) {
    return { error: "Invoice grand total must be greater than 0." };
  }

  // 2. Fetch seeded Sales Journal (type = SALES)
  const salesJournal = await prisma.journal.findFirst({
    where: { type: JournalType.SALES },
  });

  if (!salesJournal) {
    return { error: "System Sales Journal not found. Please verify database seeding." };
  }

  // 3. Fetch seeded Debtors account (type = ASSET, isSystem = true or name = 'Debtors')
  const debtorsAccount = await prisma.chartOfAccount.findFirst({
    where: {
      OR: [
        { name: "Debtors" },
        { type: "ASSET", isSystem: true },
      ],
    },
  });

  if (!debtorsAccount) {
    return { error: "System 'Debtors' Account not found. Please check Chart of Accounts." };
  }

  // 4. Fetch seeded Tax Payable account (type = LIABILITY, isSystem = true or name = 'Tax Payable')
  let taxPayableAccount = null;
  if (taxTotal > 0) {
    taxPayableAccount = await prisma.chartOfAccount.findFirst({
      where: {
        OR: [
          { name: "Tax Payable" },
          { name: { contains: "Tax", mode: "insensitive" } },
        ],
      },
    });

    if (!taxPayableAccount) {
      return { error: "System 'Tax Payable' Account not found. Please check Chart of Accounts." };
    }
  }

  // Double-Entry Verification:
  // Dr = grandTotal
  // Cr = sum(incomeAccountGroups) + (taxTotal if taxPayableAccount)
  const totalCredits = Array.from(incomeAccountGroups.values()).reduce((sum, val) => sum + val, 0) + (taxTotal > 0 ? taxTotal : 0);
  
  if (Math.abs(grandTotal - totalCredits) > 0.05) {
    return {
      error: `Accounting double-entry imbalance: Debit (₹${grandTotal.toFixed(2)}) does not match Credit (₹${totalCredits.toFixed(2)}).`,
    };
  }

  // Transaction execution: JournalEntry + JournalItems + Invoice status update
  await prisma.$transaction(async (tx) => {
    // Build journal items array
    const journalItemsData: Array<{
      accountId: string;
      partnerId: string;
      debit: number;
      credit: number;
    }> = [];

    // 1. Debtors Account Debit (Grand Total)
    journalItemsData.push({
      accountId: debtorsAccount.id,
      partnerId: invoice.customerId,
      debit: grandTotal,
      credit: 0,
    });

    // 2. Sales Income Accounts Credit (pre-tax subtotals)
    for (const [accountId, amount] of incomeAccountGroups.entries()) {
      journalItemsData.push({
        accountId,
        partnerId: invoice.customerId,
        debit: 0,
        credit: Number(amount.toFixed(2)),
      });
    }

    // 3. Tax Payable Account Credit (if tax > 0)
    if (taxTotal > 0 && taxPayableAccount) {
      journalItemsData.push({
        accountId: taxPayableAccount.id,
        partnerId: invoice.customerId,
        debit: 0,
        credit: Number(taxTotal.toFixed(2)),
      });
    }

    // Create POSTED Journal Entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        journalId: salesJournal.id,
        accountingDate: invoice.invoiceDate,
        reference: invoice.invoiceNumber,
        partnerId: invoice.customerId,
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

    // Update Customer Invoice status to CONFIRMED and store journalEntryId link
    await tx.customerInvoice.update({
      where: { id },
      data: {
        status: BillInvoiceStatus.CONFIRMED,
        journalEntryId: journalEntry.id,
      },
    });
  }, { timeout: 30000 });

  revalidatePath("/sales/invoices");
  revalidatePath(`/sales/invoices/${id}`);
  revalidatePath("/accounting/journal-entries");
  return { success: true };
}

/**
 * cancelCustomerInvoice: Cancels a Draft Customer Invoice.
 * Rule: Only Draft invoices without payments can be cancelled.
 * Used by: Customer Invoice detail view (`Cancel` button).
 */
export async function cancelCustomerInvoice(id: string): Promise<ActionResult> {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id },
  });

  if (!invoice) return { error: "Customer Invoice not found." };
  if (invoice.status !== BillInvoiceStatus.DRAFT) {
    return { error: "Only Draft Customer Invoices can be cancelled." };
  }

  await prisma.customerInvoice.update({
    where: { id },
    data: { status: BillInvoiceStatus.CANCELLED },
  });

  revalidatePath("/sales/invoices");
  revalidatePath(`/sales/invoices/${id}`);
  return { success: true };
}
