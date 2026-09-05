// Payment Server Actions & Payment Auto Journal Entry Engine for Urban Furniture Accounting System.
// Yeh file Vendor Bill payments (Direction: SEND) ko record karne aur unke liye automatic Bank/Cash double-entry Journal Entries generate karne ka kaam karti hai.
// Core Accounting Logic: Payment record hote hi Creditors account ko Debit (liability kam hoti hai) aur Bank ya Cash account ko Credit (cash/bank balance kam hota hai) kiya jata hai.
// Status Updates: Payment hone par Vendor Bill ka paidAmount update hota hai aur Status 'PARTIALLY_PAID' ya 'PAID' me switch ho jata hai.
// Used by: BillPaymentModal component (/purchase/bills/[id]) aur /payments overall payment ledger page.

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

// Zod validation schema for Bill Payment
const recordPaymentSchema = z.object({
  vendorBillId: z.string().min(1, "Vendor Bill ID missing hai"),
  amount: z.number().gt(0, "Payment amount 0 se badi honi chahiye"),
  date: z.string().min(1, "Payment Date mandatory hai"),
  paymentVia: z.nativeEnum(PaymentMethod),
  note: z.string().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export type ActionResult<T = any> = {
  success?: boolean;
  error?: string;
  id?: string;
  data?: T;
};

/**
 * recordBillPayment: Vendor Bill ke khilaaf payment submit karta hai aur secondary Auto Journal Entry generate karta hai.
 * Specification §4.2 Logic:
 * 1. Payment Method ke hisaab se Bank (type = BANK) ya Cash (type = CASH) Journal fetch karta hai.
 * 2. Creditors Account (Liability) fetch karta hai.
 * 3. Payment record create karta hai direction = SEND ke saath.
 * 4. Balanced Journal Entry create hoti hai: Creditors Account (Debit = amount) aur Bank/Cash Account (Credit = amount).
 * 5. Vendor Bill ka paidAmount update hota hai aur status PAID ya PARTIALLY_PAID me change hota hai.
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

  if (!bill) return { error: "Vendor Bill nahi mili." };
  if (bill.status === BillInvoiceStatus.DRAFT || bill.status === BillInvoiceStatus.CANCELLED) {
    return { error: "Draft ya Cancelled bill par payment record nahi ki ja sakti." };
  }

  const totalBillAmount = bill.lines.reduce((sum, line) => {
    return sum + Number(line.qty) * Number(line.unitPrice);
  }, 0);

  const currentPaidAmount = Number(bill.paidAmount);
  const amountDue = totalBillAmount - currentPaidAmount;

  if (amount > amountDue + 0.01) {
    return { error: `Payment amount ₹${amount} baaki remaining due ₹${amountDue.toFixed(2)} se zyada nahi ho sakti.` };
  }

  // Determine Target Journal (Bank or Cash)
  const targetJournalType = paymentVia === PaymentMethod.BANK ? JournalType.BANK : JournalType.CASH;
  const journal = await prisma.journal.findFirst({
    where: { type: targetJournalType },
    include: { defaultAccount: true },
  });

  if (!journal || !journal.defaultAccountId) {
    return { error: `System me ${targetJournalType} Journal ya uski Default Account mapped nahi mili.` };
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
    return { error: "System me seeded 'Creditors' Account nahi mil paya." };
  }

  // Execute Payment and Journal Entry within single database transaction
  const paymentResult = await prisma.$transaction(async (tx) => {
    // 1. Create Payment record
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

    // 2. Create Payment Journal Entry (§4.2)
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
  });

  revalidatePath("/purchase/bills");
  revalidatePath(`/purchase/bills/${vendorBillId}`);
  revalidatePath("/payments");
  revalidatePath("/accounting/journal-entries");

  return { success: true, id: paymentResult.id };
}

/**
 * getPayments: Complete Payments ledger list fetch karta hai.
 * Read-only table view support karta hai (`SEND` for Vendor Payments, `RECEIVE` for Customer Receipts).
 * Used by: /payments page.
 */
export async function getPayments() {
  const payments = await prisma.payment.findMany({
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
