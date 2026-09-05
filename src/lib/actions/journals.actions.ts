// Journal server actions for Urban Furniture Accounting System.
// What: Create and update Journal records, linking each to a default Chart of Account.
// Why: Journals are the named books where transactions are recorded (Sales, Purchase, Bank, Cash).
//      New journals can be added by Admin/Accountant; seeded system journals cannot be deleted.
// Why not: Allowing journal deletion would orphan journal entries referencing that journal —
//          soft archive is the safe pattern.
// Used by: /master/journals pages.

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { JournalType } from "@prisma/client";
import { revalidatePath } from "next/cache";

const journalSchema = z.object({
  name: z.string().min(1, "Journal name is required"),
  type: z.nativeEnum(JournalType),
  defaultAccountId: z.string().min(1, "Default account is required"),
});

type JournalInput = z.infer<typeof journalSchema>;
type ActionResult = { error?: string; success?: boolean; id?: string };

// createJournal: Adds a new journal linked to a Chart of Account.
export async function createJournal(input: JournalInput): Promise<ActionResult> {
  const parsed = journalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Verify the referenced account exists and is not archived
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: input.defaultAccountId },
  });
  if (!account || account.archived) return { error: "Selected account is not available." };

  const journal = await prisma.journal.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      defaultAccountId: parsed.data.defaultAccountId,
    },
  });

  revalidatePath("/master/journals");
  return { success: true, id: journal.id };
}

// updateJournal: Updates a non-system journal's fields.
// System journals (seeded) cannot be renamed or repointed to a different account.
export async function updateJournal(
  id: string,
  input: JournalInput
): Promise<ActionResult> {
  const journal = await prisma.journal.findUnique({ where: { id } });
  if (!journal) return { error: "Journal not found." };
  if (journal.isSystem) return { error: "System journals cannot be modified." };

  const parsed = journalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.journal.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      defaultAccountId: parsed.data.defaultAccountId,
    },
  });

  revalidatePath("/master/journals");
  return { success: true, id };
}
