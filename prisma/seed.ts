// Prisma seed script for Urban Furniture Accounting System.
// What: Creates the bootstrap Admin user, seeds Chart of Accounts defaults, and seeds
//       Journal defaults on first database setup.
// Why: The signup page can only create ACCOUNTANT accounts; without a seed, there's no way
//      to get an ADMIN into the system. Seeding CoA + Journals ensures the double-entry
//      accounting system has its required foundational data from day one.
// Why not: We could create the Admin via a one-time CLI command, but seed.ts is the standard
//          Prisma approach and runs automatically with `prisma db seed`.
// Used by: Run once via `npx prisma db seed` after initial migration.

import { PrismaClient, AccountType, JournalType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// generateLoginId: Produces a random alphanumeric string of specified length.
// Why: Login IDs must be 6-12 characters, unique, and not guessable — random is safer than
//      sequential. We use Math.random with base-36 encoding for simplicity.
// Why not: UUID would be too long (spec says 6-12 chars); sequential numbers are guessable.
// Used by: Admin bootstrap and CONTACT_USER auto-provisioning (contacts.actions.ts).
function generateLoginId(length: number = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .padEnd(length, "0");
}

// generatePassword: Creates a random password that satisfies the policy (lower + upper +
// special + > 8 chars).
// Why: The seed Admin needs a real password; hardcoding "Admin@123" is a security smell even
//      for a seed, so we generate one that still meets the validation rules.
// Why not: A fixed password would be easier but less secure — anyone who reads the seed file
//          would know the initial Admin password in all deployments.
// Used by: Admin bootstrap only.
function generatePassword(): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const special = "!@#$%^&*";
  const digits = "0123456789";
  const all = lower + upper + special + digits;

  // Guarantee at least one of each required character class
  const password =
    lower[Math.floor(Math.random() * lower.length)] +
    upper[Math.floor(Math.random() * upper.length)] +
    special[Math.floor(Math.random() * special.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    Array.from({ length: 6 }, () => all[Math.floor(Math.random() * all.length)]).join("");

  // Shuffle so the pattern isn't always lower+upper+special+digit at start
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

async function main() {
  console.log("🌱 Starting database seed...");

  // ─── 1. Seed Chart of Accounts ──────────────────────────────────────────────
  // These 7 accounts are the minimum required for double-entry accounting.
  // isSystem = true means they cannot be deleted via the UI, only archived.
  // Why these 7: They map directly to the 4 seeded Journals; without them, journal creation
  //              would fail. They also cover the fundamental Balance Sheet + P&L accounts.
  const defaultAccounts = [
    { name: "Cash", type: AccountType.CASH, isSystem: true },
    { name: "Bank", type: AccountType.BANK, isSystem: true },
    { name: "Debtors", type: AccountType.ASSET, isSystem: true },
    { name: "Creditors", type: AccountType.LIABILITY, isSystem: true },
    { name: "Capital", type: AccountType.CAPITAL, isSystem: true },
    { name: "Sales Income", type: AccountType.INCOME, isSystem: true },
    { name: "Purchase Expense", type: AccountType.EXPENSE, isSystem: true },
  ];

  const createdAccounts: Record<string, string> = {};
  for (const account of defaultAccounts) {
    const existing = await prisma.chartOfAccount.findFirst({
      where: { name: account.name, isSystem: true },
    });
    if (!existing) {
      const created = await prisma.chartOfAccount.create({ data: account });
      createdAccounts[account.name] = created.id;
      console.log(`  ✓ Account: ${account.name} (${account.type})`);
    } else {
      createdAccounts[account.name] = existing.id;
      console.log(`  → Account already exists: ${account.name}`);
    }
  }

  // ─── 2. Seed Journals ────────────────────────────────────────────────────────
  // 4 journals: Sales, Purchase, Bank, Cash — each linked to its default account.
  // Why: These 4 cover all standard transaction types. The journal's type drives which
  //      account is debited/credited by default when auto-generating journal entries.
  // Why not: More journals (e.g., per-department) would be added by the Admin via UI later.
  const defaultJournals = [
    {
      name: "Sales",
      type: JournalType.SALES,
      defaultAccountName: "Sales Income",
      isSystem: true,
    },
    {
      name: "Purchase",
      type: JournalType.PURCHASE,
      defaultAccountName: "Purchase Expense",
      isSystem: true,
    },
    {
      name: "Bank",
      type: JournalType.BANK,
      defaultAccountName: "Bank",
      isSystem: true,
    },
    {
      name: "Cash",
      type: JournalType.CASH,
      defaultAccountName: "Cash",
      isSystem: true,
    },
  ];

  for (const journal of defaultJournals) {
    const existing = await prisma.journal.findFirst({
      where: { name: journal.name, isSystem: true },
    });
    if (!existing) {
      const accountId = createdAccounts[journal.defaultAccountName];
      if (!accountId) {
        throw new Error(`Account '${journal.defaultAccountName}' not found for journal '${journal.name}'`);
      }
      await prisma.journal.create({
        data: {
          name: journal.name,
          type: journal.type,
          isSystem: journal.isSystem,
          defaultAccountId: accountId,
        },
      });
      console.log(`  ✓ Journal: ${journal.name} → ${journal.defaultAccountName}`);
    } else {
      console.log(`  → Journal already exists: ${journal.name}`);
    }
  }

  // ─── 3. Bootstrap Admin User ─────────────────────────────────────────────────
  // Creates the first ADMIN account. The signup page only creates ACCOUNTANT accounts,
  // so this is the ONLY way to get an ADMIN into a fresh system.
  // Security note: loginId and password are printed to console once and nowhere else.
  //                In production, pipe the seed output to a secure log.
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!existingAdmin) {
    const loginId = `admin${generateLoginId(4)}`;
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await prisma.user.create({
      data: {
        name: "System Administrator",
        loginId,
        email: `${loginId}@urbanfurniture.internal`,
        passwordHash,
        role: "ADMIN",
      },
    });

    // Print credentials to console — this is the only time they are visible.
    console.log("\n" + "═".repeat(60));
    console.log("  🔐 BOOTSTRAP ADMIN CREDENTIALS — SAVE THESE NOW");
    console.log("═".repeat(60));
    console.log(`  Login ID : ${loginId}`);
    console.log(`  Password : ${plainPassword}`);
    console.log(`  Email    : ${loginId}@urbanfurniture.internal`);
    console.log("═".repeat(60) + "\n");
  } else {
    console.log(`  → Admin user already exists: ${existingAdmin.loginId}`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
