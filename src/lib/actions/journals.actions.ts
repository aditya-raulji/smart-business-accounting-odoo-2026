// Journals Server Actions for Urban Furniture Accounting System.
// Yeh file Journals master management (Create, Update) and fetching functionality handle karti hai.
// Core Business Rule: Strictly enforces **only one Journal per JournalType** (Sales, Purchase, Bank, Cash).
// System Journal Rules: For seeded system journals, allows editing Name and Default Account, but locks `type` to maintain auto-posting lookups.
// Used by: /master/journals page, manual journal creation forms, and auto-entry generation actions.

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { JournalType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

const journalSchema = z.object({
  name: z.string().min(1, "Journal name is required"),
  type: z.nativeEnum(JournalType),
  defaultAccountId: z.string().min(1, "Default account is required"),
});

type JournalInput = z.infer<typeof journalSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

/**
 * getJournals: Journals list fetch karta hai default account details ke saath.
 * Used by: /master/journals page and JournalEntry creation form dropdowns.
 */
export async function getJournals() {
  return await prisma.journal.findMany({
    include: {
      defaultAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

/**
 * createJournal: Unique JournalType constraint verify karke new journal create karta hai.
 * Blocks creating a second journal of an existing JournalType.
 * Used by: JournalsManagementView create modal.
 */
export async function createJournal(input: JournalInput): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    return { error: "Unauthorized: Only Admin or Accountant can modify journals." };
  }

  const parsed = journalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Unique JournalType check: Only one journal per Type permitted
  const existing = await prisma.journal.findFirst({
    where: { type: parsed.data.type },
  });
  if (existing) {
    return { error: `A Journal of type '${parsed.data.type}' already exists. Only one journal per Type is allowed.` };
  }

  // Verify default account
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: parsed.data.defaultAccountId },
  });
  if (!account || account.archived) return { error: "Selected default account is invalid or archived." };

  const journal = await prisma.journal.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      defaultAccountId: parsed.data.defaultAccountId,
      isSystem: false,
    },
  });

  revalidatePath("/master/journals");
  return { success: true, id: journal.id };
}

/**
 * updateJournal: Journal Name aur Default Account update karta hai.
 * Seeded/System journals ke liye `type` is locked.
 * Used by: JournalsManagementView edit modal.
 */
export async function updateJournal(
  id: string,
  input: JournalInput
): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    return { error: "Unauthorized: Only Admin or Accountant can modify journals." };
  }

  const journal = await prisma.journal.findUnique({ where: { id } });
  if (!journal) return { error: "Journal not found." };

  const parsed = journalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // If system journal, type cannot be changed
  if (journal.isSystem && journal.type !== parsed.data.type) {
    return { error: `Journal type '${journal.type}' for system journal is locked and cannot be changed.` };
  }

  // If changing type on a non-system journal, enforce 1-per-type rule
  if (journal.type !== parsed.data.type) {
    const existing = await prisma.journal.findFirst({
      where: { type: parsed.data.type, id: { not: id } },
    });
    if (existing) {
      return { error: `A Journal of type '${parsed.data.type}' already exists. Only one journal per Type is allowed.` };
    }
  }

  // Verify default account
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: parsed.data.defaultAccountId },
  });
  if (!account || account.archived) return { error: "Selected default account is invalid or archived." };

  await prisma.journal.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: journal.isSystem ? journal.type : parsed.data.type,
      defaultAccountId: parsed.data.defaultAccountId,
    },
  });

  revalidatePath("/master/journals");
  return { success: true, id };
}

/**
 * archiveJournal: Safety action placeholder for journals.
 */
export async function archiveJournal(id: string): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    return { error: "Unauthorized: Only Admin or Accountant can modify journals." };
  }

  const journal = await prisma.journal.findUnique({ where: { id } });
  if (!journal) return { error: "Journal not found." };

  return { error: "System journals are required for auto-posting and cannot be archived." };
}
