// Customer Invoice Detail & Payment Page for Urban Furniture Accounting System.
// What: Server Component that displays a Customer Invoice, its itemized tax breakdown, payment ledger, and payment modal.
// Why: Allows accountants to confirm/register payments, and allows customers (CONTACT_USER) to view and self-pay their own invoices.
// Why not alternative: Direct client requests would bypass security checks allowing unauthorized customers to view others' invoices.
// Where used: /sales/invoices/[id] route.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCustomerInvoiceById } from "@/lib/actions/customer-invoices";
import { CustomerInvoiceForm } from "@/components/sales/CustomerInvoiceForm";
import { ContactType, AnalyticType } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerInvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const role = (session?.user as any)?.role || "ACCOUNTANT";
  const contactId = (session?.user as any)?.contactId;

  const invoice = await getCustomerInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  // RBAC Check for CONTACT_USER (Customer Portal)
  const isCustomerPortal = role === "CONTACT_USER";
  if (isCustomerPortal && invoice.customerId !== contactId) {
    redirect("/dashboard");
  }

  // Fetch active customers
  const customers = await prisma.contact.findMany({
    where: {
      archived: false,
      type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
    },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  // Fetch active products
  const products = await prisma.product.findMany({
    where: { archived: false },
    select: { id: true, name: true, salesPrice: true },
    orderBy: { name: "asc" },
  });

  // Fetch Chart of Accounts
  const accounts = await prisma.chartOfAccount.findMany({
    where: { archived: false },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  // Fetch analytic accounts (INCOME type preferred)
  const analyticAccounts = await prisma.analyticAccount.findMany({
    where: { type: AnalyticType.INCOME },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  const formattedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    salesPrice: Number(p.salesPrice),
  }));

  const initialData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    invoiceReference: invoice.invoiceReference,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status as "DRAFT" | "CONFIRMED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED",
    paidAmount: invoice.paidAmount,
    amountDue: invoice.amountDue,
    sourceSOId: invoice.sourceSOId,
    sourceSO: invoice.sourceSO,
    journalEntryId: invoice.journalEntryId,
    lines: invoice.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      chartOfAccountId: l.chartOfAccountId,
      analyticAccountId: l.analyticAccountId,
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice),
      taxRate: Number(l.taxRate),
      lineSubtotal: l.lineSubtotal,
      lineTax: l.lineTax,
      lineTotal: l.lineTotal,
      product: l.product,
      chartOfAccount: l.chartOfAccount,
      analyticAccount: l.analyticAccount,
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      date: p.date,
      amount: Number(p.amount),
      method: p.method,
      note: p.note,
    })),
  };

  return (
    <CustomerInvoiceForm
      initialData={initialData}
      customers={customers}
      products={formattedProducts}
      accounts={accounts}
      analyticAccounts={analyticAccounts}
      isCustomerUser={isCustomerPortal}
    />
  );
}
