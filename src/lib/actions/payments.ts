// Payment Server Actions & Payment Auto Journal Entry Engine for Urban Furniture Accounting System.
// What: Handles payments for Vendor Bills (Direction: SEND) and Customer Invoices (Direction: RECEIVE),
//      including automatic double-entry Bank/Cash journal generation.
// Why: Vendor Payments reduce Creditors liability and decrease Cash/Bank assets.
//      Customer Receipts increase Cash/Bank assets and reduce Debtors receivable assets.
// Why not alternative: Single centralized payment action module ensures consistent transaction handling and status transitions.
// Where used: BillPaymentModal (/purchase/bills/[id]), InvoicePaymentModal (/sales/invoices/[id]), and /payments list page.

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BillInvoiceStatus,
  JournalEntryStatus,
  JournalType,
  PaymentDirection,
  PaymentMethod,
} from "@prisma/client";

// Zod validation schema for Vendor Bill Payment
const recordPaymentSchema = z.object({
  vendorBillId: z.string().min(1, "Vendor Bill ID is required"),
  amount: z.number().gt(0, "Payment amount must be greater than 0"),
  date: z.string().min(1, "Payment Date is required"),
  paymentVia: z.nativeEnum(PaymentMethod),
  note: z.string().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// Zod validation schema for Customer Invoice Payment
const recordInvoicePaymentSchema = z.object({
  customerInvoiceId: z.string().min(1, "Customer Invoice ID is required"),
  amount: z.number().gt(0, "Payment amount must be greater than 0"),
  date: z.string().min(1, "Payment Date is required"),
  paymentVia: z.nativeEnum(PaymentMethod),
  note: z.string().optional().nullable(),
});

export type RecordInvoicePaymentInput = z.infer<typeof recordInvoicePaymentSchema>;

export type ActionResult<T = any> = {
  success?: boolean;
  error?: string;
  id?: string;
  data?: T;
};

/**
 * recordBillPayment: Submits a payment against a Vendor Bill and generates Bank/Cash Auto Journal Entry.
 * Accounting Logic (§4.2):
 * - Debit: Creditors Account (reduces liability)
 * - Credit: Bank or Cash Default Account (reduces money balance)
 * - Vendor Bill paidAmount updated and status set to PARTIALLY_PAID / PAID.
 * Used by: BillPaymentModal component on Vendor Bill detail page.
 */
export async function recordBillPayment(input: RecordPaymentInput): Promise<ActionResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { vendorBillId, amount, date, paymentVia, note } = parsed.data;

  // Fetch Vendor Bill with lines and vendor
  const bill = await prisma.vendorBill.findUnique({
    where: { id: vendorBillId },
    include: { lines: true, vendor: true },
  });

  if (!bill) return { error: "Vendor Bill not found." };
  if (bill.status === BillInvoiceStatus.DRAFT || bill.status === BillInvoiceStatus.CANCELLED) {
    return { error: "Payments cannot be recorded on Draft or Cancelled bills." };
  }

  const totalBillAmount = bill.lines.reduce((sum, line) => {
    return sum + Number(line.qty) * Number(line.unitPrice);
  }, 0);

  const currentPaidAmount = Number(bill.paidAmount);
  const amountDue = totalBillAmount - currentPaidAmount;

  if (amount > amountDue + 0.01) {
    return { error: `Payment amount ₹${amount} cannot exceed the remaining due ₹${amountDue.toFixed(2)}.` };
  }

  // Determine Target Journal (Bank or Cash)
  const targetJournalType = paymentVia === PaymentMethod.BANK ? JournalType.BANK : JournalType.CASH;
  const journal = await prisma.journal.findFirst({
    where: { type: targetJournalType },
    include: { defaultAccount: true },
  });

  if (!journal || !journal.defaultAccountId) {
    return { error: `System ${targetJournalType} Journal or its Default Account not found.` };
  }

  // Fetch Creditors Account
  const creditorsAccount = await prisma.chartOfAccount.findFirst({
    where: {
      OR: [
        { name: "Creditors" },
        { type: "LIABILITY", isSystem: true },
      ],
    },
  });

  if (!creditorsAccount) {
    return { error: "System 'Creditors' Account not found." };
  }

  // Execute Payment and Journal Entry within single database transaction
  const paymentResult = await prisma.$transaction(async (tx) => {
    // 1. Create Payment record (SEND)
    const payment = await tx.payment.create({
      data: {
        direction: PaymentDirection.SEND,
        method: paymentVia,
        amount: amount,
        date: new Date(date),
        note: note || null,
        contactId: bill.vendorId,
        vendorBillId: bill.id,
      },
    });

    // 2. Create Payment Journal Entry
    // Debit = Creditors Account (reduces liability)
    // Credit = Bank or Cash Default Account (reduces money balance)
    const journalEntry = await tx.journalEntry.create({
      data: {
        journalId: journal.id,
        accountingDate: new Date(date),
        reference: bill.billNumber,
        partnerId: bill.vendorId,
        status: JournalEntryStatus.POSTED,
        items: {
          create: [
            {
              accountId: creditorsAccount.id,
              partnerId: bill.vendorId,
              debit: amount,
              credit: 0,
            },
            {
              accountId: journal.defaultAccountId,
              partnerId: bill.vendorId,
              debit: 0,
              credit: amount,
            },
          ],
        },
      },
    });

    // Link journalEntryId to payment
    await tx.payment.update({
      where: { id: payment.id },
      data: { journalEntryId: journalEntry.id },
    });

    // 3. Update Vendor Bill paidAmount and Status
    const newPaidAmount = currentPaidAmount + amount;
    const newStatus = newPaidAmount >= totalBillAmount - 0.01
      ? BillInvoiceStatus.PAID
      : BillInvoiceStatus.PARTIALLY_PAID;

    await tx.vendorBill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    return payment;
  }, { timeout: 30000 });

  revalidatePath("/purchase/bills");
  revalidatePath(`/purchase/bills/${vendorBillId}`);
  revalidatePath("/payments");
  revalidatePath("/accounting/journal-entries");

  return { success: true, id: paymentResult.id };
}

/**
 * recordInvoicePayment: Submits a payment received against a Customer Invoice and generates Bank/Cash Auto Journal Entry.
 * Accounting Logic (§4.2):
 * - Direction: RECEIVE
 * - Debit: Bank or Cash Default Account (increases cash/bank balance)
 * - Credit: Debtors Account (reduces receivable asset)
 * - Customer Invoice paidAmount updated and status set to PARTIALLY_PAID / PAID.
 * Used by: InvoicePaymentModal component on Customer Invoice detail page & Customer self-service portal.
 */
export async function recordInvoicePayment(input: RecordInvoicePaymentInput): Promise<ActionResult> {
  const parsed = recordInvoicePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { customerInvoiceId, amount, date, paymentVia, note } = parsed.data;

  // Fetch Customer Invoice with lines and customer
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id: customerInvoiceId },
    include: { lines: true, customer: true },
  });

  if (!invoice) return { error: "Customer Invoice not found." };
  if (invoice.status === BillInvoiceStatus.DRAFT || invoice.status === BillInvoiceStatus.CANCELLED) {
    return { error: "Payments cannot be recorded on Draft or Cancelled invoices." };
  }

  let totalInvoiceAmount = 0;
  for (const line of invoice.lines) {
    const lineSubtotal = Number(line.qty) * Number(line.unitPrice);
    const lineTax = lineSubtotal * (Number(line.taxRate) / 100);
    totalInvoiceAmount += lineSubtotal + lineTax;
  }
  totalInvoiceAmount = Number(totalInvoiceAmount.toFixed(2));

  const currentPaidAmount = Number(invoice.paidAmount);
  const amountDue = Number((totalInvoiceAmount - currentPaidAmount).toFixed(2));

  if (amount > amountDue + 0.01) {
    return { error: `Payment amount ₹${amount} cannot exceed remaining due ₹${amountDue.toFixed(2)}.` };
  }

  // Determine Target Journal (Bank or Cash)
  const targetJournalType = paymentVia === PaymentMethod.BANK ? JournalType.BANK : JournalType.CASH;
  const journal = await prisma.journal.findFirst({
    where: { type: targetJournalType },
    include: { defaultAccount: true },
  });

  if (!journal || !journal.defaultAccountId) {
    return { error: `System ${targetJournalType} Journal or its Default Account not found.` };
  }

  // Fetch Debtors Account
  const debtorsAccount = await prisma.chartOfAccount.findFirst({
    where: {
      OR: [
        { name: "Debtors" },
        { type: "ASSET", isSystem: true },
      ],
    },
  });

  if (!debtorsAccount) {
    return { error: "System 'Debtors' Account not found." };
  }

  // Execute Payment and Journal Entry within single database transaction
  const paymentResult = await prisma.$transaction(async (tx) => {
    // 1. Create Payment record (RECEIVE)
    const payment = await tx.payment.create({
      data: {
        direction: PaymentDirection.RECEIVE,
        method: paymentVia,
        amount: amount,
        date: new Date(date),
        note: note || null,
        contactId: invoice.customerId,
        customerInvoiceId: invoice.id,
      },
    });

    // 2. Create Payment Journal Entry
    // Debit = Bank or Cash Default Account (increases cash/bank asset)
    // Credit = Debtors Account (reduces receivable asset)
    const journalEntry = await tx.journalEntry.create({
      data: {
        journalId: journal.id,
        accountingDate: new Date(date),
        reference: invoice.invoiceNumber,
        partnerId: invoice.customerId,
        status: JournalEntryStatus.POSTED,
        items: {
          create: [
            {
              accountId: journal.defaultAccountId,
              partnerId: invoice.customerId,
              debit: amount,
              credit: 0,
            },
            {
              accountId: debtorsAccount.id,
              partnerId: invoice.customerId,
              debit: 0,
              credit: amount,
            },
          ],
        },
      },
    });

    // Link journalEntryId to payment
    await tx.payment.update({
      where: { id: payment.id },
      data: { journalEntryId: journalEntry.id },
    });

    // 3. Update Customer Invoice paidAmount and Status
    const newPaidAmount = Number((currentPaidAmount + amount).toFixed(2));
    const newStatus = newPaidAmount >= totalInvoiceAmount - 0.01
      ? BillInvoiceStatus.PAID
      : BillInvoiceStatus.PARTIALLY_PAID;

    await tx.customerInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    return payment;
  }, { timeout: 30000 });

  revalidatePath("/sales/invoices");
  revalidatePath(`/sales/invoices/${customerInvoiceId}`);
  revalidatePath("/payments");
  revalidatePath("/accounting/journal-entries");

  return { success: true, id: paymentResult.id };
}

/**
 * getPayments: Complete Payments ledger list fetch karta hai.
 * Read-only table view support karta hai (`SEND` for Vendor Payments, `RECEIVE` for Customer Receipts).
 * If filterContactId is provided, returns only payments related to that contact (e.g. self-service portal).
 * Used by: /payments page and Customer/Vendor self-service views.
 */
export async function getPayments(filterContactId?: string) {
  const whereClause: any = {};
  if (filterContactId) {
    whereClause.contactId = filterContactId;
  }

  const payments = await prisma.payment.findMany({
    where: whereClause,
    include: {
      contact: { select: { id: true, name: true, email: true } },
      vendorBill: { select: { id: true, billNumber: true } },
      customerInvoice: { select: { id: true, invoiceNumber: true } },
    },
    orderBy: { date: "desc" },
  });

  return payments.map((p) => ({
    id: p.id,
    date: p.date,
    partnerName: p.contact.name,
    direction: p.direction,
    method: p.method,
    amount: Number(p.amount),
    note: p.note,
    againstDocNumber: p.vendorBill?.billNumber
      ? `Bill ${p.vendorBill.billNumber}`
      : p.customerInvoice?.invoiceNumber
      ? `Invoice ${p.customerInvoice.invoiceNumber}`
      : "Direct",
    againstDocLink: p.vendorBillId
      ? `/purchase/bills/${p.vendorBillId}`
      : p.customerInvoiceId
      ? `/sales/invoices/${p.customerInvoiceId}`
      : null,
  }));
}
