// New Purchase Order Creation Page for Urban Furniture Accounting System.
// Yeh page database se active Vendors (ContactType VENDOR/BOTH), Products, aur Expense Analytic Accounts fetch karke PurchaseOrderForm me pass karta hai.
// Security/Filtering: System me product cost default unit price set hota hai, aur Vendor dropdown non-vendor partners ko strip kar deta hai.
// Used by: /purchase/orders/new route.

import { prisma } from "@/lib/prisma";
import { PurchaseOrderForm } from "@/components/purchase/PurchaseOrderForm";
import { ContactType, AnalyticType } from "@prisma/client";

export default async function NewPurchaseOrderPage() {
  // Fetch vendors (VENDOR or BOTH)
  const vendors = await prisma.contact.findMany({
    where: {
      archived: false,
      type: { in: [ContactType.VENDOR, ContactType.BOTH] },
    },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  // Fetch active products
  const products = await prisma.product.findMany({
    where: { archived: false },
    select: { id: true, name: true, cost: true },
    orderBy: { name: "asc" },
  });

  // Fetch analytic accounts (EXPENSE type)
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

  return (
    <PurchaseOrderForm
      vendors={vendors}
      products={formattedProducts}
      analyticAccounts={analyticAccounts}
    />
  );
}
