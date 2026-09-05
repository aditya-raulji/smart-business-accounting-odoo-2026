// Analytic Account server actions for Urban Furniture Accounting System.
// What: Create and update Analytic Account records (cost/profit centres used for budgets).
// Why: Analytic accounts are the dimension along which budgets are tracked. Creating them
//      as a separate module from the Chart of Accounts keeps statutory reporting clean.
// Why not: Sub-accounts in the Chart of Accounts could serve a similar purpose, but mixing
//          statutory accounts with management reporting dimensions makes both harder to maintain.
// Used by: /master/analytic-accounts pages, and as FK in Budget, POLine, BillLine, SOLine, InvoiceLine.

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AnalyticType } from "@prisma/client";
import { revalidatePath } from "next/cache";

const analyticAccountSchema = z.object({
  name: z.string().min(1, "Analytic account name is required"),
  type: z.nativeEnum(AnalyticType),
});

type AnalyticInput = z.infer<typeof analyticAccountSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

// createAnalyticAccount: Creates a new analytic dimension.
export async function createAnalyticAccount(input: AnalyticInput): Promise<ActionResult> {
  const parsed = analyticAccountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const account = await prisma.analyticAccount.create({
    data: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath("/master/analytic-accounts");
  return { success: true, id: account.id };
}

// updateAnalyticAccount: Updates an analytic account's name and type.
export async function updateAnalyticAccount(
  id: string,
  input: AnalyticInput
): Promise<ActionResult> {
  const parsed = analyticAccountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.analyticAccount.update({
    where: { id },
    data: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath("/master/analytic-accounts");
  revalidatePath(`/master/analytic-accounts/${id}`);
  return { success: true, id };
}
