// Sales Order Server Actions for Urban Furniture Accounting System.
// What: Handles all operations for Sales Orders — listing, detail view, draft creation, confirmation, and cancellation.
// Why: Provides server-side mutations and queries for Sales Orders with strict validation, customer filtering (CUSTOMER or BOTH),
//      automatic S00001 sequence numbering, and tax rate calculation per line item.
// Why not alternative: Direct client Prisma queries are insecure and lack transaction safety for sequential numbering and line items.
// Where used: /sales/orders list page, /sales/orders/new form page, and /sales/orders/[id] detail/edit page.

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nextSoNumber } from "@/lib/sequence";
import { DocStatus } from "@prisma/client";

// Zod Schema for Sales Order line item
const soLineSchema = z.object({
  productId: z.string().min(1, "Product selection is required"),
  analyticAccountId: z.string().optional().nullable(),
  qty: z.number().gt(0, "Quantity must be greater than 0"),
  unitPrice: z.number().gte(0, "Unit price cannot be negative"),
  taxRate: z.number().gte(0, "Tax rate cannot be negative").default(18),
});

// Zod Schema for Sales Order creation
const salesOrderSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  soDate: z.string().min(1, "SO Date is required"),
  lines: z.array(soLineSchema).min(1, "At least 1 product line is required"),
});

export type SalesOrderInput = z.infer<typeof salesOrderSchema>;

export type ActionResult<T = any> = {
  success?: boolean;
  error?: string;
  id?: string;
  data?: T;
};

/**
 * getSalesOrders: Fetches list of Sales Orders with totals and linked Customer Invoices.
 * Used by: /sales/orders/page.tsx
 */
export async function getSalesOrders() {
  const orders = await prisma.salesOrder.findMany({
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      lines: true,
      invoices: {
        select: { id: true, invoiceNumber: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((so) => {
    let untaxedTotal = 0;
    let taxTotal = 0;

    for (const line of so.lines) {
      const lineSubtotal = Number(line.qty) * Number(line.unitPrice);
      const lineTax = lineSubtotal * (Number(line.taxRate) / 100);
      untaxedTotal += lineSubtotal;
      taxTotal += lineTax;
    }

    const total = untaxedTotal + taxTotal;

    return {
      id: so.id,
      soNumber: so.soNumber,
      customerId: so.customerId,
      customerName: so.customer.name,
      customerEmail: so.customer.email,
      soDate: so.soDate,
      status: so.status,
      untaxedTotal,
      taxTotal,
      total,
      invoiceId: so.invoices.length > 0 ? so.invoices[0].id : null,
      invoiceNumber: so.invoices.length > 0 ? so.invoices[0].invoiceNumber : null,
    };
  });
}

/**
 * getSalesOrderById: Fetches detailed Sales Order with lines, batch-queried products and analytics.
 * Used by: /sales/orders/[id]/page.tsx and Customer Invoice pre-fill (?fromSO=).
 */
export async function getSalesOrderById(id: string) {
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, type: true, email: true, phone: true, street: true, city: true },
      },
      lines: true,
      invoices: {
        select: { id: true, invoiceNumber: true, status: true },
      },
    },
  });

  if (!so) return null;

  // Batch query products to map product details
  const productIds = Array.from(new Set(so.lines.map((l) => l.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, salesPrice: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Batch query analytic accounts if any
  const analyticIds = Array.from(
    new Set(so.lines.map((l) => l.analyticAccountId).filter(Boolean) as string[])
  );
  const analytics = analyticIds.length > 0
    ? await prisma.analyticAccount.findMany({
        where: { id: { in: analyticIds } },
        select: { id: true, name: true },
      })
    : [];
  const analyticMap = new Map(analytics.map((a) => [a.id, a]));

  let untaxedTotal = 0;
  let taxTotal = 0;

  const linesWithDetails = so.lines.map((l) => {
    const qty = Number(l.qty);
    const unitPrice = Number(l.unitPrice);
    const taxRate = Number(l.taxRate);
    const lineSubtotal = qty * unitPrice;
    const lineTax = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    untaxedTotal += lineSubtotal;
    taxTotal += lineTax;

    return {
      ...l,
      qty,
      unitPrice,
      taxRate,
      lineSubtotal,
      lineTax,
      lineTotal,
      product: productMap.get(l.productId)
        ? {
            name: productMap.get(l.productId)!.name,
            salesPrice: Number(productMap.get(l.productId)!.salesPrice),
          }
        : undefined,
      analyticAccount: l.analyticAccountId ? analyticMap.get(l.analyticAccountId) : undefined,
    };
  });

  const total = untaxedTotal + taxTotal;

  return {
    ...so,
    lines: linesWithDetails,
    untaxedTotal,
    taxTotal,
    total,
    createdInvoice: so.invoices.length > 0 ? so.invoices[0] : null,
  };
}

/**
 * createSalesOrder: Creates a new Draft Sales Order with generated S00001 sequence number.
 * Used by: /sales/orders/new page.
 */
export async function createSalesOrder(input: SalesOrderInput): Promise<ActionResult> {
  const parsed = salesOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { customerId, soDate, lines } = parsed.data;

  // Verify Customer exists and is CUSTOMER or BOTH
  const customer = await prisma.contact.findUnique({ where: { id: customerId } });
  if (!customer || (customer.type !== "CUSTOMER" && customer.type !== "BOTH")) {
    return { error: "Selected partner is not a valid Customer." };
  }

  // Generate unique SO Number (S00001)
  const soNumber = await nextSoNumber();

  const createdSo = await prisma.$transaction(async (tx) => {
    const so = await tx.salesOrder.create({
      data: {
        soNumber,
        customerId,
        soDate: new Date(soDate),
        status: DocStatus.DRAFT,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            analyticAccountId: l.analyticAccountId || null,
            qty: l.qty,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate ?? 18,
          })),
        },
      },
    });
    return so;
  }, { timeout: 30000 });

  revalidatePath("/sales/orders");
  return { success: true, id: createdSo.id };
}

/**
 * confirmSalesOrder: Promotes Draft Sales Order to CONFIRMED.
 * Note: Does not create a journal entry (sales confirmation mirrors purchase confirmation).
 * Used by: Sales Order detail view (`Confirm` button).
 */
export async function confirmSalesOrder(id: string): Promise<ActionResult> {
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!so) return { error: "Sales Order not found." };
  if (so.status !== DocStatus.DRAFT) {
    return { error: "Only Draft Sales Orders can be confirmed." };
  }

  if (so.lines.length === 0) {
    return { error: "At least 1 product line is required to confirm the Sales Order." };
  }

  const validLines = so.lines.every((l) => Number(l.qty) > 0 && Number(l.unitPrice) >= 0);
  if (!validLines) {
    return { error: "All line items must have Quantity > 0 and Unit Price >= 0." };
  }

  await prisma.salesOrder.update({
    where: { id },
    data: { status: DocStatus.CONFIRMED },
  });

  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${id}`);
  return { success: true };
}

/**
 * cancelSalesOrder: Cancels a Sales Order if no active Customer Invoice is linked.
 * Used by: Sales Order detail view (`Cancel` button).
 */
export async function cancelSalesOrder(id: string): Promise<ActionResult> {
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: { invoices: true },
  });

  if (!so) return { error: "Sales Order not found." };
  if (so.status === DocStatus.CANCELLED) {
    return { error: "Sales Order is already cancelled." };
  }

  const activeInvoices = so.invoices.filter((inv) => inv.status !== "CANCELLED");
  if (activeInvoices.length > 0) {
    return {
      error: `An active Customer Invoice (${activeInvoices[0].invoiceNumber}) exists for this order. It cannot be cancelled.`,
    };
  }

  await prisma.salesOrder.update({
    where: { id },
    data: { status: DocStatus.CANCELLED },
  });

  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${id}`);
  return { success: true };
}
