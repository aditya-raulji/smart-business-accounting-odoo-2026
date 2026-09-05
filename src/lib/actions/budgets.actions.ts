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
