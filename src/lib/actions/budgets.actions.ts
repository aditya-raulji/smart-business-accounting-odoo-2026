// Budget server actions for Urban Furniture Accounting System.
// What: Server actions managing the full lifecycle of Budgets — create, update, confirm, revise,
//       and cancel, strictly adhering to the state machine defined in spec §6.6.
// Why: Encapsulating the budget status transitions and revision lineage on the server guarantees
//      that historical budgets remain intact (immutability of confirmed/revised records) and
//      revalidates the Next.js page cache automatically.
// Why not: Performing state transitions client-side or without transactions could lead to broken
//          revision pointers (revisionOfId) and inconsistent budget figures across the system.
// Used by: /master/budgets, /master/budgets/new, and /master/budgets/[id] pages.

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BudgetStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Validation schema for Budget creation and editing.
const budgetSchema = z.object({
  name: z.string().min(1, "Budget name is required"),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  responsibleId: z.string().min(1, "Responsible contact is required"),
  analyticAccountId: z.string().min(1, "Analytic account is required"),
  committedAmount: z.coerce.number().positive("Committed amount must be greater than 0"),
});

type BudgetInput = z.infer<typeof budgetSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

// createBudget: Creates a new budget in DRAFT status.
export async function createBudget(input: BudgetInput): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.periodEnd <= parsed.data.periodStart) {
    return { error: "Period End date must be after Period Start date" };
  }

  try {
    const budget = await prisma.budget.create({
      data: {
        name: parsed.data.name,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        responsibleId: parsed.data.responsibleId,
        analyticAccountId: parsed.data.analyticAccountId,
        committedAmount: new Prisma.Decimal(parsed.data.committedAmount),
        status: BudgetStatus.DRAFT,
      },
    });

    revalidatePath("/master/budgets");
    return { success: true, id: budget.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to create budget" };
  }
}

// updateBudget: Updates fields of a budget that is still in DRAFT status.
export async function updateBudget(id: string, input: BudgetInput): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.periodEnd <= parsed.data.periodStart) {
    return { error: "Period End date must be after Period Start date" };
  }

  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) return { error: "Budget not found" };
  if (existing.status !== BudgetStatus.DRAFT) {
    return { error: "Only draft budgets can be directly modified. Use Revise for confirmed budgets." };
  }

  try {
    await prisma.budget.update({
      where: { id },
      data: {
        name: parsed.data.name,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        responsibleId: parsed.data.responsibleId,
        analyticAccountId: parsed.data.analyticAccountId,
        committedAmount: new Prisma.Decimal(parsed.data.committedAmount),
      },
    });

    revalidatePath("/master/budgets");
    revalidatePath(`/master/budgets/${id}`);
    return { success: true, id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update budget" };
  }
}

// confirmBudget: Transitions a DRAFT budget to CONFIRMED.
export async function confirmBudget(id: string): Promise<ActionResult> {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) return { error: "Budget not found" };
  if (existing.status !== BudgetStatus.DRAFT) {
    return { error: "Only draft budgets can be confirmed" };
  }

  try {
    await prisma.budget.update({
      where: { id },
      data: { status: BudgetStatus.CONFIRMED },
    });

    revalidatePath("/master/budgets");
    revalidatePath(`/master/budgets/${id}`);
    return { success: true, id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to confirm budget" };
  }
}

// reviseBudget: Transitions a CONFIRMED budget to REVISED and spawns a new revision linked via revisionOfId.
export async function reviseBudget(
  id: string,
  newCommittedAmount?: number
): Promise<ActionResult> {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) return { error: "Budget not found" };
  if (existing.status !== BudgetStatus.CONFIRMED) {
    return { error: "Only confirmed budgets can be revised" };
  }

  try {
    // Execute both in a transaction: set existing to REVISED, insert new revision in DRAFT
    const newBudget = await prisma.$transaction(async (tx) => {
      await tx.budget.update({
        where: { id },
        data: { status: BudgetStatus.REVISED },
      });

      const revisionCount = await tx.budget.count({
        where: {
          OR: [{ id: existing.id }, { revisionOfId: existing.id }],
        },
      });

      return await tx.budget.create({
        data: {
          name: `${existing.name} (Rev ${revisionCount})`,
          periodStart: existing.periodStart,
          periodEnd: existing.periodEnd,
          responsibleId: existing.responsibleId,
          analyticAccountId: existing.analyticAccountId,
          committedAmount: newCommittedAmount
            ? new Prisma.Decimal(newCommittedAmount)
            : existing.committedAmount,
          status: BudgetStatus.DRAFT,
          revisionOfId: existing.id,
        },
      });
    });

    revalidatePath("/master/budgets");
    revalidatePath(`/master/budgets/${id}`);
    revalidatePath(`/master/budgets/${newBudget.id}`);
    return { success: true, id: newBudget.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to revise budget" };
  }
}

// cancelBudget: Cancels a DRAFT or CONFIRMED budget.
export async function cancelBudget(id: string): Promise<ActionResult> {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) return { error: "Budget not found" };
  if (existing.status === BudgetStatus.CANCELLED || existing.status === BudgetStatus.REVISED) {
    return { error: `Cannot cancel a budget that is already ${existing.status.toLowerCase()}` };
  }

  try {
    await prisma.budget.update({
      where: { id },
      data: { status: BudgetStatus.CANCELLED },
    });

    revalidatePath("/master/budgets");
    revalidatePath(`/master/budgets/${id}`);
    return { success: true, id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to cancel budget" };
  }
}

/**
 * getBudgetAchievedAmount: Specific Budget ke live Achieved Amount, Achieved %, aur Amount To Achieve compute karta hai.
 * Spec §3 Formula Implementation:
 * - If analyticAccount.type == EXPENSE: Sum of BillLine (qty * unitPrice) joined with VendorBill where status IN (CONFIRMED, PARTIALLY_PAID, PAID) and billDate within [periodStart, periodEnd].
 * - If analyticAccount.type == INCOME: Sum of InvoiceLine (qty * unitPrice) joined with CustomerInvoice where status IN (CONFIRMED, PARTIALLY_PAID, PAID) and invoiceDate within [periodStart, periodEnd].
 * - Achieved % = (Achieved Amount / Committed Amount) * 100
 * - Amount To Achieve = Committed Amount - Achieved Amount
 * Alternative Rejected: Budget row par denormalize karna — rejecting because Achieved Amount depends on a dynamic set of documents across a date range and could drift if bills/invoices are edited/cancelled. Live aggregate calculation is fast and 100% accurate.
 * Used by: Budget detail page (/master/budgets/[id]) and Budgets list view.
 */
export async function getBudgetAchievedAmount(budgetId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      analyticAccount: true,
    },
  });

  if (!budget) {
    return {
      achievedAmount: 0,
      achievedPercentage: 0,
      amountToAchieve: 0,
      committedAmount: 0,
    };
  }

  const committedAmount = Number(budget.committedAmount);
  let achievedAmount = 0;

  const validStatuses = ["CONFIRMED", "PARTIALLY_PAID", "PAID"];

  if (budget.analyticAccount.type === "EXPENSE") {
    const billLines = await prisma.billLine.findMany({
      where: {
        analyticAccountId: budget.analyticAccountId,
        vendorBill: {
          status: { in: validStatuses as any },
          billDate: {
            gte: budget.periodStart,
            lte: budget.periodEnd,
          },
        },
      },
      select: {
        qty: true,
        unitPrice: true,
      },
    });

    achievedAmount = billLines.reduce(
      (sum, line) => sum + Number(line.qty) * Number(line.unitPrice),
      0
    );
  } else if (budget.analyticAccount.type === "INCOME") {
    const invoiceLines = await prisma.invoiceLine.findMany({
      where: {
        analyticAccountId: budget.analyticAccountId,
        customerInvoice: {
          status: { in: validStatuses as any },
          invoiceDate: {
            gte: budget.periodStart,
            lte: budget.periodEnd,
          },
        },
      },
      select: {
        qty: true,
        unitPrice: true,
      },
    });

    achievedAmount = invoiceLines.reduce(
      (sum, line) => sum + Number(line.qty) * Number(line.unitPrice),
      0
    );
  }

  const achievedPercentage =
    committedAmount > 0 ? (achievedAmount / committedAmount) * 100 : 0;
  const amountToAchieve = committedAmount - achievedAmount;

  return {
    achievedAmount,
    achievedPercentage,
    amountToAchieve,
    committedAmount,
  };
}

/**
 * getBudgetAchievedLines: Achieved Amount me contribute karne wale saare individual VendorBill lines ya CustomerInvoice lines fetch karta hai.
 * Used by: BudgetAchievedDrilldownModal client component on /master/budgets/[id].
 */
export async function getBudgetAchievedLines(budgetId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      analyticAccount: true,
    },
  });

  if (!budget) return [];

  const validStatuses = ["CONFIRMED", "PARTIALLY_PAID", "PAID"];

  if (budget.analyticAccount.type === "EXPENSE") {
    const billLines = await prisma.billLine.findMany({
      where: {
        analyticAccountId: budget.analyticAccountId,
        vendorBill: {
          status: { in: validStatuses as any },
          billDate: {
            gte: budget.periodStart,
            lte: budget.periodEnd,
          },
        },
      },
      include: {
        vendorBill: {
          select: { id: true, billNumber: true, billDate: true },
        },
      },
    });

    // Product names fetch karna
    const productIds = Array.from(new Set(billLines.map((l) => l.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return billLines.map((line) => ({
      id: line.id,
      docNumber: line.vendorBill.billNumber,
      docDate: line.vendorBill.billDate,
      docLink: `/purchase/bills/${line.vendorBill.id}`,
      productName: productMap.get(line.productId) || "—",
      qty: Number(line.qty),
      unitPrice: Number(line.unitPrice),
      amount: Number(line.qty) * Number(line.unitPrice),
    }));
  } else {
    const invoiceLines = await prisma.invoiceLine.findMany({
      where: {
        analyticAccountId: budget.analyticAccountId,
        customerInvoice: {
          status: { in: validStatuses as any },
          invoiceDate: {
            gte: budget.periodStart,
            lte: budget.periodEnd,
          },
        },
      },
      include: {
        customerInvoice: {
          select: { id: true, invoiceNumber: true, invoiceDate: true },
        },
      },
    });

    const productIds = Array.from(new Set(invoiceLines.map((l) => l.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return invoiceLines.map((line) => ({
      id: line.id,
      docNumber: line.customerInvoice.invoiceNumber,
      docDate: line.customerInvoice.invoiceDate,
      docLink: `/sales/invoices/${line.customerInvoice.id}`,
      productName: productMap.get(line.productId) || "—",
      qty: Number(line.qty),
      unitPrice: Number(line.unitPrice),
      amount: Number(line.qty) * Number(line.unitPrice),
    }));
  }
}

