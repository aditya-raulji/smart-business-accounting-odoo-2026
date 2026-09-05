// Chart of Accounts Server Actions for Urban Furniture Accounting System.
// Yeh file Chart of Accounts ledger database read, create, update, archive, aur unarchive karne ke actions provide karti hai.
// Core Safety Lock: `isSystem = true` seeded default accounts ko Edit ya Archive karne se server-side strictly block kiya gaya hai.
// Used by: /master/chart-of-accounts list page and AccountsManagementView client component.

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AccountType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.nativeEnum(AccountType),
});

type AccountInput = z.infer<typeof accountSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

/**
 * getAccounts: Chart of Accounts list fetch karta hai. By default archived accounts hide hote hain jab tak includeArchived true na ho.
 * Used by: /master/chart-of-accounts, manual journal entry creation line dropdowns, and master setup views.
 */
export async function getAccounts(options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;
  return await prisma.chartOfAccount.findMany({
    where: includeArchived ? {} : { archived: false },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

/**
 * createAccount: Custom account Chart of Accounts me add karta hai.
 * Used by: AccountsManagementView modal form.
 */
export async function createAccount(input: AccountInput): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    return { error: "Unauthorized: Only Admin or Accountant can modify accounts." };
  }

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.chartOfAccount.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, archived: false },
  });
  if (existing) return { error: "An account with this name already exists." };

  const account = await prisma.chartOfAccount.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      isSystem: false,
    },
  });

  revalidatePath("/master/chart-of-accounts");
  return { success: true, id: account.id };
}

/**
 * updateAccount: Non-system account ka Name aur Type update karta hai.
 * System accounts (isSystem = true) are locked.
 * Used by: AccountsManagementView edit modal.
 */
export async function updateAccount(
  id: string,
  input: AccountInput
): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    return { error: "Unauthorized: Only Admin or Accountant can modify accounts." };
  }

  const account = await prisma.chartOfAccount.findUnique({ where: { id } });
  if (!account) return { error: "Account not found." };
  if (account.isSystem) {
    return { error: "System account — used by the accounting engine, cannot be changed." };
  }

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.chartOfAccount.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
    },
  });

  revalidatePath("/master/chart-of-accounts");
  return { success: true, id };
}

/**
 * archiveAccount: Soft-deletes/archives a non-system account.
 * Used by: AccountsManagementView table action row.
 */
export async function archiveAccount(id: string): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    return { error: "Unauthorized: Only Admin or Accountant can modify accounts." };
  }

  const account = await prisma.chartOfAccount.findUnique({ where: { id } });
  if (!account) return { error: "Account not found." };
  if (account.isSystem) {
    return { error: "System account — used by the accounting engine, cannot be changed." };
  }

  await prisma.chartOfAccount.update({ where: { id }, data: { archived: true } });
  revalidatePath("/master/chart-of-accounts");
  return { success: true };
}

/**
 * unarchiveAccount: Restores an archived non-system account to active status.
 * Used by: AccountsManagementView table action row.
 */
export async function unarchiveAccount(id: string): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    return { error: "Unauthorized: Only Admin or Accountant can modify accounts." };
  }

  const account = await prisma.chartOfAccount.findUnique({ where: { id } });
  if (!account) return { error: "Account not found." };
  if (account.isSystem) {
    return { error: "System account — used by the accounting engine, cannot be changed." };
  }

  await prisma.chartOfAccount.update({ where: { id }, data: { archived: false } });
  revalidatePath("/master/chart-of-accounts");
  return { success: true };
}
