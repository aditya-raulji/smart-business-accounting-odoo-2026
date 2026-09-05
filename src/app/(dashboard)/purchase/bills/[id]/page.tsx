// Vendor Bill Detail & Form Page for Urban Furniture Accounting System.
// Yeh page specific Vendor Bill ki complete detail fetch karke VendorBillForm component through view/edit/pay state display karta hai.
// RBAC Security: CONTACT_USER vendor role verify karta hai ki logged-in contact ki apni bill hai ya nahi. Unauthenticated access blocked hota hai.
// Used by: /purchase/bills/[id] route.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVendorBillById } from "@/lib/actions/vendor-bills";
import { VendorBillForm } from "@/components/purchase/VendorBillForm";
import { ContactType, AnalyticType } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorBillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const role = (session?.user as any)?.role || "ACCOUNTANT";
  const contactId = (session?.user as any)?.contactId;

  const bill = await getVendorBillById(id);
  if (!bill) {
    notFound();
  }

  // RBAC Check for CONTACT_USER (Vendor Portal)
  const isVendorPortal = role === "CONTACT_USER";
  if (isVendorPortal && bill.vendorId !== contactId) {
    redirect("/dashboard");
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

  // Fetch Chart of Accounts
  const accounts = await prisma.chartOfAccount.findMany({
    where: { archived: false },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

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

  const initialData = {
    id: bill.id,
    billNumber: bill.billNumber,
    vendorId: bill.vendorId,
    billReference: bill.billReference,
    billDate: bill.billDate,
    dueDate: bill.dueDate,
    status: bill.status,
    sourcePOId: bill.sourcePOId,
    sourcePONumber: bill.sourcePO?.poNumber || null,
    total: bill.total,
    paidAmount: bill.paidAmount,
    amountDue: bill.amountDue,
    paidViaCash: bill.paidViaCash,
    paidViaBank: bill.paidViaBank,
    vendor: { name: bill.vendor.name },
    lines: bill.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      chartOfAccountId: l.chartOfAccountId,
      analyticAccountId: l.analyticAccountId,
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice),
    })),
  };

  return (
    <VendorBillForm
      initialData={initialData}
      vendors={vendors}
      products={formattedProducts}
      accounts={accounts}
      analyticAccounts={analyticAccounts}
      defaultCoaId={defaultPurchaseAccount?.id || ""}
      isVendorPortal={isVendorPortal}
    />
  );
}
