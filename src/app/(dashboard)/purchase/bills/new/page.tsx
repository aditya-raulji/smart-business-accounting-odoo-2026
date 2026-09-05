// New Vendor Bill Creation Page for Urban Furniture Accounting System.
// Yeh page fresh Vendor Bill create karne ya Purchase Order se pre-fill Vendor Bill (`?fromPO={id}`) generate karne ka route hai.
// Pre-fill Logic: Agar searchParams me `fromPO` present hota hai to target PO ke tamam line items automatically copy ho jate hain aur Vendor field lock ho jata hai.
// Default Account: Line items default me seeded "Purchase Expense" chart of account receive karte hain.
// Used by: /purchase/bills/new route.

import { prisma } from "@/lib/prisma";
import { getPurchaseOrderById } from "@/lib/actions/purchase-orders";
import { VendorBillForm } from "@/components/purchase/VendorBillForm";
import { ContactType, AnalyticType, AccountType } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ fromPO?: string }>;
}

export default async function NewVendorBillPage({ searchParams }: PageProps) {
  const { fromPO } = await searchParams;

  let fromPOData: any = undefined;
  if (fromPO) {
    const po = await getPurchaseOrderById(fromPO);
    if (po && po.status === "CONFIRMED") {
      fromPOData = {
        poId: po.id,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        lines: po.lines.map((l) => ({
          productId: l.productId,
          analyticAccountId: l.analyticAccountId,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
        })),
      };
    }
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

  // Fetch Chart of Accounts (Expense & Liability focus)
  const accounts = await prisma.chartOfAccount.findMany({
    where: { archived: false },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  // Find seeded "Purchase Expense" account as default
  const defaultPurchaseAccount = accounts.find((a) => a.name === "Purchase Expense") || accounts[0];

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
    <VendorBillForm
      vendors={vendors}
      products={formattedProducts}
      accounts={accounts}
      analyticAccounts={analyticAccounts}
      defaultCoaId={defaultPurchaseAccount?.id || ""}
      fromPOData={fromPOData}
    />
  );
}
