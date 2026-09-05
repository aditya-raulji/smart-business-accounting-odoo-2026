// Chart of Accounts server actions for Urban Furniture Accounting System.
// What: CRUD actions for the Chart of Accounts — create new accounts and archive existing ones.
//       isSystem accounts (seeded) can be archived but NEVER deleted.
// Why: System accounts are referenced by seeded Journals; deleting them would break the
//      journal-entry double-entry system. The archive pattern keeps historical data intact
//      while removing the account from active use.
// Why not: Hard deletion would cascade-null journal entries referencing those accounts,
//          corrupting existing financial records — unacceptable in any accounting system.
// Used by: /master/chart-of-accounts pages.

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AccountType } from "@prisma/client";
import { revalidatePath } from "next/cache";

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.nativeEnum(AccountType),
});

type AccountInput = z.infer<typeof accountSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

// createAccount: Adds a new ledger account to the Chart of Accounts.
// isSystem defaults to false — only seed.ts creates system accounts.
export async function createAccount(input: AccountInput): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Check for duplicate account names (case-insensitive)
  const existing = await prisma.chartOfAccount.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, archived: false },
  });
  if (existing) return { error: "An account with this name already exists." };

  const account = await prisma.chartOfAccount.create({
    data: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath("/master/chart-of-accounts");
  return { success: true, id: account.id };
}

// updateAccount: Updates a non-system account's name and type.
// System accounts' names cannot be changed (they're referenced by seeded journals).
export async function updateAccount(
  id: string,
  input: AccountInput
): Promise<ActionResult> {
  const account = await prisma.chartOfAccount.findUnique({ where: { id } });
  if (!account) return { error: "Account not found." };
  if (account.isSystem) return { error: "System accounts cannot be modified." };

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.chartOfAccount.update({
    where: { id },
    data: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath("/master/chart-of-accounts");
  return { success: true, id };
}

// archiveAccount: Soft-deletes an account. Works on both system and non-system accounts.
// isSystem accounts are archiveable but not deleteable — archive just hides them from lists.
export async function archiveAccount(id: string): Promise<ActionResult> {
  await prisma.chartOfAccount.update({ where: { id }, data: { archived: true } });
  revalidatePath("/master/chart-of-accounts");
  return { success: true };
}
