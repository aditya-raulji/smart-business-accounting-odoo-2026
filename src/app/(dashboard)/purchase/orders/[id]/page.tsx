// Purchase Order Detail & Form Page for Urban Furniture Accounting System.
// Yeh page specific Purchase Order ki full detail fetch karke view/edit mode me PurchaseOrderForm render karta hai.
// Status Awareness: Agar status DRAFT hai to Confirm/Cancel action buttons enabled milte hain; agar CONFIRMED hai to Create Bill CTA view hota hai.
// Used by: /purchase/orders/[id] route.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPurchaseOrderById } from "@/lib/actions/purchase-orders";
import { PurchaseOrderForm } from "@/components/purchase/PurchaseOrderForm";
import { ContactType, AnalyticType } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const po = await getPurchaseOrderById(id);
  if (!po) {
    notFound();
  }

  // Fetch vendors
  const vendors = await prisma.contact.findMany({
    where: {
      archived: false,
      type: { in: [ContactType.VENDOR, ContactType.BOTH] },
    },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  // Fetch products
  const products = await prisma.product.findMany({
    where: { archived: false },
    select: { id: true, name: true, cost: true },
    orderBy: { name: "asc" },
  });

  // Fetch analytic accounts
  const analyticAccounts = await prisma.analyticAccount.findMany({
    where: { type: AnalyticType.EXPENSE },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  const formattedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    cost: Number(p.cost),
  }));

  const initialData = {
    id: po.id,
    poNumber: po.poNumber,
    vendorId: po.vendorId,
    poDate: po.poDate,
    status: po.status,
    lines: po.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      analyticAccountId: l.analyticAccountId,
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice),
      product: l.product
        ? { name: l.product.name, cost: Number(l.product.cost) }
        : undefined,
    })),
    createdBill: po.createdBill,
  };

  return (
    <PurchaseOrderForm
      initialData={initialData}
      vendors={vendors}
      products={formattedProducts}
      analyticAccounts={analyticAccounts}
    />
  );
}
