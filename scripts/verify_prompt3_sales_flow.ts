// Verification Script for Part 3: Sales Flow
// Urban Furniture Accounting System

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  createSalesOrder,
  confirmSalesOrder,
  getSalesOrderById,
} from "../src/lib/actions/sales-orders";
import {
  createCustomerInvoice,
  confirmCustomerInvoice,
  getCustomerInvoiceById,
} from "../src/lib/actions/customer-invoices";
import { recordInvoicePayment } from "../src/lib/actions/payments";
import { PaymentMethod, ContactType, ProductType } from "@prisma/client";

async function main() {
  console.log("=== STARTING SALES FLOW VERIFICATION (PART 3) ===");

  // 1. Find or create a test Customer
  let customer = await prisma.contact.findFirst({
    where: {
      archived: false,
      type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
    },
  });

  if (!customer) {
    customer = await prisma.contact.create({
      data: {
        name: "Acme Enterprises (Test Customer)",
        email: "acme.test@example.com",
        phone: "+91 9876543210",
        type: ContactType.CUSTOMER,
        city: "Mumbai",
      },
    });
    console.log("Created test customer:", customer.name);
  } else {
    console.log("Using customer:", customer.name);
  }

  // 2. Find a test product
  let product = await prisma.product.findFirst({
    where: { archived: false },
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: "Teak Dining Table",
        type: ProductType.GOODS,
        category: "Furniture",
        salesPrice: 15000,
        cost: 9000,
      },
    });
    console.log("Created test product:", product.name);
  } else {
    console.log("Using product:", product.name, "SalesPrice:", Number(product.salesPrice));
  }

  // 3. Find Sales Income account
  const incomeAccount = await prisma.chartOfAccount.findFirst({
    where: { type: "INCOME" },
  });

  if (!incomeAccount) {
    throw new Error("No INCOME account found in Chart of Accounts!");
  }
  console.log("Using Income Account:", incomeAccount.name);

  // 4. Create Sales Order
  console.log("\n--- Testing Sales Order Creation ---");
  const soRes = await createSalesOrder({
    customerId: customer.id,
    soDate: new Date().toISOString().split("T")[0],
    lines: [
      {
        productId: product.id,
        qty: 2,
        unitPrice: 5000, // Subtotal: 10,000
        taxRate: 18,    // Tax 18%: 1,800. Total: 11,800
      },
    ],
  });

  if (!soRes.success || !soRes.id) {
    throw new Error(`Failed to create Sales Order: ${soRes.error}`);
  }

  const so = await getSalesOrderById(soRes.id);
  if (!so) throw new Error("Could not retrieve created Sales Order");
  console.log("✓ Sales Order Created:", so.soNumber, "Status:", so.status);
  console.log("  Untaxed:", so.untaxedTotal, "Tax:", so.taxTotal, "Grand Total:", so.total);

  if (so.untaxedTotal !== 10000 || so.taxTotal !== 1800 || so.total !== 11800) {
    throw new Error(`SO totals incorrect! Expected 10000 + 1800 = 11800, got ${so.untaxedTotal} + ${so.taxTotal} = ${so.total}`);
  }

  // 5. Confirm Sales Order
  console.log("\n--- Testing Sales Order Confirmation ---");
  const confSoRes = await confirmSalesOrder(so.id);
  if (!confSoRes.success) {
    throw new Error(`Failed to confirm SO: ${confSoRes.error}`);
  }
  const confirmedSo = await getSalesOrderById(so.id);
  console.log("✓ Sales Order Confirmed. Status:", confirmedSo?.status);

  // 6. Create Customer Invoice from SO
  console.log("\n--- Testing Customer Invoice Creation from SO ---");
  const invRes = await createCustomerInvoice({
    customerId: customer.id,
    invoiceReference: `Order ${so.soNumber}`,
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    sourceSOId: so.id,
    lines: [
      {
        productId: product.id,
        chartOfAccountId: incomeAccount.id,
        qty: 2,
        unitPrice: 5000,
        taxRate: 18,
      },
    ],
  });

  if (!invRes.success || !invRes.id) {
    throw new Error(`Failed to create Customer Invoice: ${invRes.error}`);
  }

  const invoice = await getCustomerInvoiceById(invRes.id);
  if (!invoice) throw new Error("Could not retrieve created Customer Invoice");
  console.log("✓ Customer Invoice Created:", invoice.invoiceNumber, "Status:", invoice.status);
  console.log("  Grand Total:", invoice.total, "Due:", invoice.amountDue);

  // 7. Test Duplicate Prevention for same SO
  console.log("\n--- Testing Duplicate Invoice Prevention ---");
  const dupInvRes = await createCustomerInvoice({
    customerId: customer.id,
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    sourceSOId: so.id,
    lines: [
      {
        productId: product.id,
        chartOfAccountId: incomeAccount.id,
        qty: 1,
        unitPrice: 1000,
        taxRate: 18,
      },
    ],
  });

  if (dupInvRes.success) {
    throw new Error("Duplicate invoice creation should have failed!");
  }
  console.log("✓ Duplicate prevention successfully blocked 2nd invoice for same SO:", dupInvRes.error);

  // 8. Confirm Customer Invoice & Verify Auto Journal Entry
  console.log("\n--- Testing Customer Invoice Confirmation & Auto Journal Entry ---");
  const confInvRes = await confirmCustomerInvoice(invoice.id);
  if (!confInvRes.success) {
    throw new Error(`Failed to confirm Customer Invoice: ${confInvRes.error}`);
  }

  const confirmedInv = await getCustomerInvoiceById(invoice.id);
  console.log("✓ Invoice Confirmed. Status:", confirmedInv?.status);
  console.log("  Linked Journal Entry ID:", confirmedInv?.journalEntryId);

  if (!confirmedInv?.journalEntryId) {
    throw new Error("No Journal Entry linked to confirmed invoice!");
  }

  const je = await prisma.journalEntry.findUnique({
    where: { id: confirmedInv.journalEntryId },
    include: { items: { include: { account: true } }, journal: true },
  });

  if (!je) throw new Error("Could not retrieve generated Journal Entry");
  console.log("✓ Auto Journal Entry created in Journal:", je.journal.name, "Type:", je.journal.type);

  let totalDebit = 0;
  let totalCredit = 0;
  for (const item of je.items) {
    totalDebit += Number(item.debit);
    totalCredit += Number(item.credit);
    console.log(`  Leg: ${item.account.name.padEnd(20)} | Dr: ₹${Number(item.debit).toFixed(2).padStart(8)} | Cr: ₹${Number(item.credit).toFixed(2).padStart(8)}`);
  }

  console.log(`  Total Debit: ₹${totalDebit.toFixed(2)} | Total Credit: ₹${totalCredit.toFixed(2)}`);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal Entry is NOT balanced! Dr: ${totalDebit} != Cr: ${totalCredit}`);
  }
  if (Math.abs(totalDebit - 11800) > 0.01) {
    throw new Error(`Journal Entry total is incorrect! Expected 11800, got ${totalDebit}`);
  }
  console.log("✓ Auto Journal Entry is 100% balanced!");

  // 9. Record Partial Payment (Receive ₹5,900)
  console.log("\n--- Testing Partial Customer Payment (RECEIVE ₹5,900) ---");
  const pay1Res = await recordInvoicePayment({
    customerInvoiceId: invoice.id,
    amount: 5900,
    date: new Date().toISOString().split("T")[0],
    paymentVia: PaymentMethod.BANK,
    note: "NEFT Part Payment",
  });

  if (!pay1Res.success) {
    throw new Error(`Failed to record partial payment: ${pay1Res.error}`);
  }

  const partPaidInv = await getCustomerInvoiceById(invoice.id);
  console.log("✓ Partial Payment Recorded. Status:", partPaidInv?.status);
  console.log("  Paid Amount:", partPaidInv?.paidAmount, "Amount Due:", partPaidInv?.amountDue);

  if (partPaidInv?.status !== "PARTIALLY_PAID") {
    throw new Error(`Expected PARTIALLY_PAID status, got ${partPaidInv?.status}`);
  }
  if (Number(partPaidInv?.amountDue) !== 5900) {
    throw new Error(`Expected Amount Due 5900, got ${partPaidInv?.amountDue}`);
  }

  // 10. Record Final Payment (Receive remaining ₹5,900)
  console.log("\n--- Testing Final Customer Payment (RECEIVE ₹5,900) ---");
  const pay2Res = await recordInvoicePayment({
    customerInvoiceId: invoice.id,
    amount: 5900,
    date: new Date().toISOString().split("T")[0],
    paymentVia: PaymentMethod.CASH,
    note: "Cash Balance Settlement",
  });

  if (!pay2Res.success) {
    throw new Error(`Failed to record final payment: ${pay2Res.error}`);
  }

  const fullyPaidInv = await getCustomerInvoiceById(invoice.id);
  console.log("✓ Final Payment Recorded. Status:", fullyPaidInv?.status);
  console.log("  Paid Amount:", fullyPaidInv?.paidAmount, "Amount Due:", fullyPaidInv?.amountDue);

  if (fullyPaidInv?.status !== "PAID") {
    throw new Error(`Expected PAID status, got ${fullyPaidInv?.status}`);
  }
  if (Number(fullyPaidInv?.amountDue) !== 0) {
    throw new Error(`Expected Amount Due 0, got ${fullyPaidInv?.amountDue}`);
  }

  // 11. Overpayment Test
  console.log("\n--- Testing Overpayment Rejection ---");
  const overpayRes = await recordInvoicePayment({
    customerInvoiceId: invoice.id,
    amount: 500,
    date: new Date().toISOString().split("T")[0],
    paymentVia: PaymentMethod.BANK,
  });

  if (overpayRes.success) {
    throw new Error("Overpayment should have failed!");
  }
  console.log("✓ Overpayment correctly rejected:", overpayRes.error);

  console.log("\n=== ALL SALES FLOW VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
