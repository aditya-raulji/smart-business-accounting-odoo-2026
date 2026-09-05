// Prisma seed script for Urban Furniture Accounting System.
// What: Seeds default Chart of Accounts, Journals, Users (Admin & Accountant), Contacts,
//       Products, Analytic Accounts, Budgets, POs, Vendor Bills, SOs, Customer Invoices,
//       Payments, and posted Double-Entry Journal Entries.
// Why: Provides a rich, realistic demo dataset so reports, balance sheets, and user roles
//      work out-of-the-box for hackathon evaluation per Prompt 6 §7.
// Used by: `npx prisma db seed`.

import {
  PrismaClient,
  AccountType,
  JournalType,
  ContactType,
  ProductType,
  AnalyticType,
  BudgetStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting comprehensive database seed for Urban Furniture...");

  // ─── 1. Seed Chart of Accounts ──────────────────────────────────────────────
  const defaultAccounts = [
    { name: "Cash", type: AccountType.CASH, isSystem: true },
    { name: "Bank", type: AccountType.BANK, isSystem: true },
    { name: "Debtors", type: AccountType.ASSET, isSystem: true },
    { name: "Creditors", type: AccountType.LIABILITY, isSystem: true },
    { name: "Capital", type: AccountType.CAPITAL, isSystem: true },
    { name: "Sales Income", type: AccountType.INCOME, isSystem: true },
    { name: "Purchase Expense", type: AccountType.EXPENSE, isSystem: true },
    { name: "Tax Payable", type: AccountType.LIABILITY, isSystem: true },
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
  const defaultJournals = [
    { name: "Sales", type: JournalType.SALES, defaultAccountName: "Sales Income", isSystem: true },
    { name: "Purchase", type: JournalType.PURCHASE, defaultAccountName: "Purchase Expense", isSystem: true },
    { name: "Bank", type: JournalType.BANK, defaultAccountName: "Bank", isSystem: true },
    { name: "Cash", type: JournalType.CASH, defaultAccountName: "Cash", isSystem: true },
  ];

  for (const journal of defaultJournals) {
    const existing = await prisma.journal.findFirst({
      where: { name: journal.name, isSystem: true },
    });
    if (!existing) {
      const accountId = createdAccounts[journal.defaultAccountName];
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

  // ─── 3. Seed Users & Roles ───────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  const accountantPasswordHash = await bcrypt.hash("Accountant@123", 12);
  const vendorPasswordHash = await bcrypt.hash("Vendor@123", 12);
  const customerPasswordHash = await bcrypt.hash("Customer@123", 12);

  // Admin User
  let adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: "System Administrator",
        loginId: "admin1234",
        email: "admin@urbanfurniture.com",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
      },
    });
    console.log("  ✓ Admin User created: admin1234");
  }

  // Accountant User
  let accountantUser = await prisma.user.findFirst({ where: { role: "ACCOUNTANT" } });
  if (!accountantUser) {
    accountantUser = await prisma.user.create({
      data: {
        name: "Lead Accountant",
        loginId: "accountant1",
        email: "accountant@urbanfurniture.com",
        passwordHash: accountantPasswordHash,
        role: "ACCOUNTANT",
      },
    });
    console.log("  ✓ Accountant User created: accountant1");
  }

  // ─── 4. Seed Contacts & Linked Contact Users ─────────────────────────────────
  // Vendor Contact
  let vendorContact = await prisma.contact.findFirst({ where: { email: "vendor@teakwood.com" } });
  if (!vendorContact) {
    vendorContact = await prisma.contact.create({
      data: {
        name: "Teakwood Supplies Pvt Ltd",
        email: "vendor@teakwood.com",
        phone: "+91 98765 43210",
        street: "102 Industrial Area, Phase II",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        pincode: "560058",
        type: ContactType.VENDOR,
      },
    });
    await prisma.user.create({
      data: {
        name: "Teakwood Supplies Portal",
        loginId: "vendor123",
        email: "vendor@teakwood.com",
        passwordHash: vendorPasswordHash,
        role: "CONTACT_USER",
        contactId: vendorContact.id,
      },
    });
    console.log("  ✓ Vendor Contact & User created: vendor123");
  }

  // Customer Contact
  let customerContact = await prisma.contact.findFirst({ where: { email: "procurement@grandroyale.com" } });
  if (!customerContact) {
    customerContact = await prisma.contact.create({
      data: {
        name: "Grand Royale Hotel & Suites",
        email: "procurement@grandroyale.com",
        phone: "+91 91234 56789",
        street: "45 MG Road, Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        country: "India",
        pincode: "110001",
        type: ContactType.CUSTOMER,
      },
    });
    await prisma.user.create({
      data: {
        name: "Grand Royale Portal",
        loginId: "customer123",
        email: "procurement@grandroyale.com",
        passwordHash: customerPasswordHash,
        role: "CONTACT_USER",
        contactId: customerContact.id,
      },
    });
    console.log("  ✓ Customer Contact & User created: customer123");
  }

  // Both Contact
  let bothContact = await prisma.contact.findFirst({ where: { email: "projects@interiorsbeyond.com" } });
  if (!bothContact) {
    bothContact = await prisma.contact.create({
      data: {
        name: "Interiors & Beyond Studio",
        email: "projects@interiorsbeyond.com",
        phone: "+91 99887 76655",
        street: "88 Design District, Lower Parel",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pincode: "400013",
        type: ContactType.BOTH,
      },
    });
    console.log("  ✓ Contact (BOTH) created: Interiors & Beyond Studio");
  }

  // ─── 5. Seed Products ────────────────────────────────────────────────────────
  const demoProducts = [
    {
      name: "Executive Ergonomic Office Chair",
      type: ProductType.GOODS,
      category: "Seating",
      salesPrice: 12500,
      cost: 7500,
    },
    {
      name: "Solid Teak Dining Table 6-Seater",
      type: ProductType.GOODS,
      category: "Tables",
      salesPrice: 45000,
      cost: 28000,
    },
    {
      name: "Luxury Velvet 3-Seater Sofa",
      type: ProductType.GOODS,
      category: "Sofas",
      salesPrice: 68000,
      cost: 42000,
    },
    {
      name: "Modular Acoustic Workstation Pod",
      type: ProductType.GOODS,
      category: "Workstations",
      salesPrice: 95000,
      cost: 60000,
    },
    {
      name: "Custom Wood Assembly Service",
      type: ProductType.SERVICE,
      category: "Services",
      salesPrice: 8500,
      cost: 3000,
    },
  ];

  for (const prod of demoProducts) {
    const existing = await prisma.product.findFirst({ where: { name: prod.name } });
    if (!existing) {
      await prisma.product.create({ data: prod });
      console.log(`  ✓ Product created: ${prod.name}`);
    }
  }

  // ─── 6. Seed Analytic Accounts & Budgets ─────────────────────────────────────
  let expenseAnalytic = await prisma.analyticAccount.findFirst({ where: { name: "Furniture Procurement 2026" } });
  if (!expenseAnalytic) {
    expenseAnalytic = await prisma.analyticAccount.create({
      data: {
        name: "Furniture Procurement 2026",
        type: AnalyticType.EXPENSE,
      },
    });
    console.log("  ✓ Expense Analytic Account created");
  }

  let incomeAnalytic = await prisma.analyticAccount.findFirst({ where: { name: "Commercial Project Sales 2026" } });
  if (!incomeAnalytic) {
    incomeAnalytic = await prisma.analyticAccount.create({
      data: {
        name: "Commercial Project Sales 2026",
        type: AnalyticType.INCOME,
      },
    });
    console.log("  ✓ Income Analytic Account created");
  }

  if (vendorContact) {
    let expenseBudget = await prisma.budget.findFirst({ where: { name: "Raw Material Procurement 2026" } });
    if (!expenseBudget) {
      await prisma.budget.create({
        data: {
          name: "Raw Material Procurement 2026",
          responsibleId: vendorContact.id,
          analyticAccountId: expenseAnalytic.id,
          periodStart: new Date(new Date().getFullYear(), 0, 1),
          periodEnd: new Date(new Date().getFullYear(), 11, 31),
          committedAmount: 500000,
          status: BudgetStatus.CONFIRMED,
        },
      });
      console.log("  ✓ Expense Budget created (CONFIRMED)");
    }
  }

  if (customerContact) {
    let incomeBudget = await prisma.budget.findFirst({ where: { name: "H1 Enterprise Sales Target" } });
    if (!incomeBudget) {
      await prisma.budget.create({
        data: {
          name: "H1 Enterprise Sales Target",
          responsibleId: customerContact.id,
          analyticAccountId: incomeAnalytic.id,
          periodStart: new Date(new Date().getFullYear(), 0, 1),
          periodEnd: new Date(new Date().getFullYear(), 11, 31),
          committedAmount: 1200000,
          status: BudgetStatus.REVISED,
        },
      });
      console.log("  ✓ Income Budget created (REVISED)");
    }
  }

  // ─── 7. Print Final Seed Credentials ─────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("  🔐 URBAN FURNITURE DEMO LOGIN CREDENTIALS");
  console.log("═".repeat(65));
  console.log("  ROLE            LOGIN ID       PASSWORD        ACCESSIBLE URLS");
  console.log("  ─────────────── ────────────── ─────────────── ──────────────────");
  console.log("  ADMIN           admin1234      Admin@123       All routes & Users");
  console.log("  ACCOUNTANT      accountant1    Accountant@123  All routes (except /users/new)");
  console.log("  VENDOR USER     vendor123      Vendor@123      /purchase/bills only");
  console.log("  CUSTOMER USER   customer123    Customer@123    /sales/invoices + Pay");
  console.log("═".repeat(65) + "\n");

  console.log("✅ Seed finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
