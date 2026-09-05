// New Sales Order Creation Page for Urban Furniture Accounting System.
// What: Server Component that fetches active Customers, Products, and Income Analytic Accounts to initialize the SalesOrderForm.
// Why: Enforces role and contact-type filtering so only valid Customers can be selected, and product selling prices default correctly.
// Why not alternative: Client-side fetching creates layout waterfalls and exposes customer lists without authentication boundaries.
// Where used: /sales/orders/new route.

import { prisma } from "@/lib/prisma";
import { SalesOrderForm } from "@/components/sales/SalesOrderForm";
import { ContactType, AnalyticType } from "@prisma/client";

export default async function NewSalesOrderPage() {
  // Fetch active customers (CUSTOMER or BOTH)
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

  // Fetch analytic accounts (INCOME type preferred for Sales)
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
    <SalesOrderForm
      customers={customers}
      products={formattedProducts}
      analyticAccounts={analyticAccounts}
    />
  );
}
