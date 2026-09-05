// Sales Order Detail & Form Page for Urban Furniture Accounting System.
// What: Server Component that fetches a specific Sales Order with lines, products, and linked customer invoices.
// Why: Enables view/edit for Draft orders, action confirmation, cancellation, and transitioning to Customer Invoice.
// Why not alternative: Client-side fetching on dynamic routes fails Next.js 15 SSR optimization and leaks internal relations.
// Where used: /sales/orders/[id] route.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSalesOrderById } from "@/lib/actions/sales-orders";
import { SalesOrderForm } from "@/components/sales/SalesOrderForm";
import { ContactType, AnalyticType } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const so = await getSalesOrderById(id);
  if (!so) {
    notFound();
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

  // Fetch products
  const products = await prisma.product.findMany({
    where: { archived: false },
    select: { id: true, name: true, salesPrice: true },
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
    id: so.id,
    soNumber: so.soNumber,
    customerId: so.customerId,
    soDate: so.soDate,
    status: so.status as "DRAFT" | "CONFIRMED" | "CANCELLED",
    lines: so.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      analyticAccountId: l.analyticAccountId,
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice),
      taxRate: Number(l.taxRate),
      lineSubtotal: l.lineSubtotal,
      lineTax: l.lineTax,
      lineTotal: l.lineTotal,
      product: l.product,
      analyticAccount: l.analyticAccount,
    })),
    createdInvoice: so.createdInvoice,
  };

  return (
    <SalesOrderForm
      initialData={initialData}
      customers={customers}
      products={formattedProducts}
      analyticAccounts={analyticAccounts}
    />
  );
}
