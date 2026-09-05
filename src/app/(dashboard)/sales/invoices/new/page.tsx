// New Customer Invoice Creation Page for Urban Furniture Accounting System.
// What: Server Component that creates fresh Customer Invoices or pre-fills from Confirmed Sales Orders (`?fromSO={id}`).
// Why: Enables seamless 1-click transition from Sales Order to Tax Invoicing with lines and tax rates copied across.
// Why not alternative: Re-typing order details on invoices causes discrepancies and manual calculation errors.
// Where used: /sales/invoices/new route.

import { prisma } from "@/lib/prisma";
import { getSalesOrderById } from "@/lib/actions/sales-orders";
import { CustomerInvoiceForm } from "@/components/sales/CustomerInvoiceForm";
import { ContactType, AnalyticType } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ fromSO?: string }>;
}

export default async function NewCustomerInvoicePage({ searchParams }: PageProps) {
  const { fromSO } = await searchParams;

  let prefillFromSO: any = null;
  if (fromSO) {
    const so = await getSalesOrderById(fromSO);
    if (so && so.status === "CONFIRMED") {
      prefillFromSO = {
        soId: so.id,
        soNumber: so.soNumber,
        customerId: so.customerId,
        lines: so.lines.map((l) => ({
          productId: l.productId,
          analyticAccountId: l.analyticAccountId,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate ?? 18),
        })),
      };
    }
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

  // Fetch active products with selling price
  const products = await prisma.product.findMany({
    where: { archived: false },
    select: { id: true, name: true, salesPrice: true },
    orderBy: { name: "asc" },
  });

  // Fetch Chart of Accounts (Income accounts prioritized)
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

  return (
    <CustomerInvoiceForm
      customers={customers}
      products={formattedProducts}
      accounts={accounts}
      analyticAccounts={analyticAccounts}
      prefillFromSO={prefillFromSO}
    />
  );
}
