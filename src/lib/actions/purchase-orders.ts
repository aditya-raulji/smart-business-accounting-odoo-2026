// Purchase Order Server Actions for Urban Furniture Accounting System.
// Yeh file Purchase Orders ke tamam operations handle karti hai — Listing, Detail View, Creation, Confirmation aur Cancellation.
// Batch Data Fetching: POLine me foreign key relation bypass karke batch product queries run hoti hain jo Prisma schema constraints aur performance ke hisaab se 100% compliant hai.
// Key Rule: Purchase Order create karne par auto-numbering (P00001) hoti hai aur Vendor strict ContactType (VENDOR ya BOTH) se filter kiya jata hai.
// Used by: /purchase/orders list page, /purchase/orders/new form page, aur /purchase/orders/[id] detail page.

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nextPoNumber } from "@/lib/sequence";
import { DocStatus } from "@prisma/client";

// Zod Schema line item for Purchase Order
const poLineSchema = z.object({
  productId: z.string().min(1, "Product baseline selection mandatory hai"),
  analyticAccountId: z.string().optional().nullable(),
  qty: z.number().gt(0, "Quantity 0 se badi honi chahiye"),
  unitPrice: z.number().gte(0, "Unit price negative nahi ho sakti"),
});

// Zod Schema for Purchase Order creation/update
const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Vendor select karna zaroori hai"),
  poDate: z.string().min(1, "PO Date valid honi chahiye"),
  lines: z.array(poLineSchema).min(1, "Kam se kam 1 product line zaroori hai"),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export type ActionResult<T = any> = {
  success?: boolean;
  error?: string;
  id?: string;
  data?: T;
};

/**
 * getPurchaseOrders: Purchase Orders ki poori list fetch karta hai table view ke liye.
 * Vendor details, status, line items calculation ke saath list return hoti hai.
 * Used by: /purchase/orders/page.tsx
 */
export async function getPurchaseOrders() {
  const orders = await prisma.purchaseOrder.findMany({
    include: {
      vendor: {
        select: { id: true, name: true, email: true },
      },
      lines: true,
      bills: {
        select: { id: true, billNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((po) => {
    const total = po.lines.reduce((sum, line) => {
      return sum + Number(line.qty) * Number(line.unitPrice);
    }, 0);

    return {
      id: po.id,
      poNumber: po.poNumber,
      vendorName: po.vendor.name,
      poDate: po.poDate,
      status: po.status,
      total,
      billId: po.bills.length > 0 ? po.bills[0].id : null,
      billNumber: po.bills.length > 0 ? po.bills[0].billNumber : null,
    };
  });
}

/**
 * getPurchaseOrderById: Ek specific Purchase Order ki complete detail line items ke saath fetch karta hai.
 * Batch queries product details to match POLine productId without requiring Prisma schema relation.
 * Used by: /purchase/orders/[id]/page.tsx aur Vendor Bill creation pre-fill form.
 */
export async function getPurchaseOrderById(id: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: {
        select: { id: true, name: true, type: true, email: true },
      },
      lines: true,
      bills: {
        select: { id: true, billNumber: true, status: true },
      },
    },
  });

  if (!po) return null;

  // Batch query products to map product details
  const productIds = Array.from(new Set(po.lines.map((l) => l.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, cost: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const linesWithProducts = po.lines.map((l) => ({
    ...l,
    product: productMap.get(l.productId)
      ? {
          name: productMap.get(l.productId)!.name,
          cost: Number(productMap.get(l.productId)!.cost),
        }
      : undefined,
  }));

  const total = po.lines.reduce((sum, line) => {
    return sum + Number(line.qty) * Number(line.unitPrice);
  }, 0);

  return {
    ...po,
    lines: linesWithProducts,
    total,
    createdBill: po.bills.length > 0 ? po.bills[0] : null,
  };
}

/**
 * createPurchaseOrder: Naya Draft Purchase Order database me save karta hai.
 * Validation: Input verify hone ke baad next auto PO number (P00001) generate kiya jata hai.
 * Used by: /purchase/orders/new page component.
 */
export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<ActionResult> {
  const parsed = purchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { vendorId, poDate, lines } = parsed.data;

  // Verify Vendor exists and is VENDOR or BOTH
  const vendor = await prisma.contact.findUnique({ where: { id: vendorId } });
  if (!vendor || (vendor.type !== "VENDOR" && vendor.type !== "BOTH")) {
    return { error: "Select kiya gaya partner valid Vendor nahi hai." };
  }

  // Generate unique PO Number
  const poNumber = await nextPoNumber();

  // Transaction me PO aur Line items save karte hain
  const createdPo = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        poNumber,
        vendorId,
        poDate: new Date(poDate),
        status: DocStatus.DRAFT,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            analyticAccountId: l.analyticAccountId || null,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        },
      },
    });
    return po;
  });

  revalidatePath("/purchase/orders");
  return { success: true, id: createdPo.id };
}

/**
 * confirmPurchaseOrder: Draft Purchase Order ko CONFIRMED status me promote karta hai.
 * Rule: Check karta hai ki kam se kam 1 line ho with qty > 0 and unitPrice >= 0.
 * Used by: Purchase Order detail view (`Confirm` button action).
 */
export async function confirmPurchaseOrder(id: string): Promise<ActionResult> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!po) return { error: "Purchase Order nahi mila." };
  if (po.status !== DocStatus.DRAFT) {
    return { error: "Keval Draft status waale Purchase Order hi confirm ho sakte hain." };
  }

  if (po.lines.length === 0) {
    return { error: "PO confirm karne ke liye kam se kam 1 line item hona zaroori hai." };
  }

  const validLines = po.lines.every((l) => Number(l.qty) > 0 && Number(l.unitPrice) >= 0);
  if (!validLines) {
    return { error: "Tamam lines me Qty > 0 aur Unit Price >= 0 hona zaroori hai." };
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: DocStatus.CONFIRMED },
  });

  revalidatePath("/purchase/orders");
  revalidatePath(`/purchase/orders/${id}`);
  return { success: true };
}

/**
 * cancelPurchaseOrder: Purchase Order ko CANCELLED status me badalta hai.
 * Rule: Agar PO se koi Vendor Bill ban chuki hai, to PO cancel nahi kiya ja sakta.
 * Used by: Purchase Order detail view (`Cancel` button action).
 */
export async function cancelPurchaseOrder(id: string): Promise<ActionResult> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { bills: true },
  });

  if (!po) return { error: "Purchase Order nahi mila." };
  if (po.status === DocStatus.CANCELLED) {
    return { error: "PO pehle se cancelled hai." };
  }

  if (po.bills.length > 0) {
    return { error: "Is PO se judi hui Vendor Bill ban chuki hai, isey cancel nahi kiya ja sakta." };
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: DocStatus.CANCELLED },
  });

  revalidatePath("/purchase/orders");
  revalidatePath(`/purchase/orders/${id}`);
  return { success: true };
}
