import {
  PrismaClient,
  AccountType,
  JournalType,
  ContactType,
  ProductType,
  AnalyticType,
  BudgetStatus,
  DocStatus,
  BillInvoiceStatus,
  JournalEntryStatus,
  PaymentMethod,
  PaymentDirection,
} from "@prisma/client";

const prisma = new PrismaClient();

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear = 2026, startMonth = 0, endMonth = 8): Date {
  const year = startYear;
  const month = randomInt(startMonth, endMonth);
  const day = randomInt(1, 28);
  return new Date(year, month, day);
}

// Retry wrapper for Neon cold starts (3s delay for DB wake-up)
async function withRetry<T>(fn: () => Promise<T>, retries = 6, delayMs = 3000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === retries) throw err;
      console.log(`⏳ Database waking up / connection retry (${attempt}/${retries})... waiting ${delayMs / 1000}s`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error("Failed after retries");
}

async function main() {
  console.log("🚀 Starting Database Seeding (~100+ Dummy Records)...");

  // 1. Chart of Accounts
  console.log("📦 1. Setting up Chart of Accounts...");
  const accountsToCreate = [
    { name: "Cash", type: AccountType.CASH, isSystem: true },
    { name: "Bank", type: AccountType.BANK, isSystem: true },
    { name: "Debtors", type: AccountType.ASSET, isSystem: true },
    { name: "Creditors", type: AccountType.LIABILITY, isSystem: true },
    { name: "Capital", type: AccountType.CAPITAL, isSystem: true },
    { name: "Sales Income", type: AccountType.INCOME, isSystem: true },
    { name: "Purchase Expense", type: AccountType.EXPENSE, isSystem: true },
    { name: "Tax Payable", type: AccountType.LIABILITY, isSystem: true },
    { name: "Office Supplies Expense", type: AccountType.EXPENSE, isSystem: false },
    { name: "Equipment & Assets", type: AccountType.ASSET, isSystem: false },
  ];

  const existingAccounts = await withRetry(() => prisma.chartOfAccount.findMany());
  const accMap: Record<string, string> = {};
  for (const acc of existingAccounts) accMap[acc.name] = acc.id;

  for (const acc of accountsToCreate) {
    if (!accMap[acc.name]) {
      const created = await withRetry(() => prisma.chartOfAccount.create({ data: acc }));
      accMap[acc.name] = created.id;
    }
  }

  // 2. Journals
  console.log("📘 2. Setting up Journals...");
  const journalsToCreate = [
    { name: "Sales", type: JournalType.SALES, defaultAccountId: accMap["Sales Income"], isSystem: true },
    { name: "Purchase", type: JournalType.PURCHASE, defaultAccountId: accMap["Purchase Expense"], isSystem: true },
    { name: "Bank", type: JournalType.BANK, defaultAccountId: accMap["Bank"], isSystem: true },
    { name: "Cash", type: JournalType.CASH, defaultAccountId: accMap["Cash"], isSystem: true },
  ];

  const existingJournals = await withRetry(() => prisma.journal.findMany());
  const journalMap: Record<string, string> = {};
  for (const j of existingJournals) journalMap[j.name] = j.id;

  for (const j of journalsToCreate) {
    if (!journalMap[j.name]) {
      const created = await withRetry(() => prisma.journal.create({ data: j }));
      journalMap[j.name] = created.id;
    }
  }

  // 3. Contacts (15 realistic contacts)
  console.log("👥 3. Creating 15 Contacts...");
  const contactDefs = [
    { name: "Apex Tech Innovations Ltd", type: ContactType.CUSTOMER, email: "procurement@apextech.io", phone: "+91 98200 11223", city: "Bengaluru", state: "Karnataka" },
    { name: "Grand Royale Hotel & Suites", type: ContactType.CUSTOMER, email: "procurement@grandroyale.com", phone: "+91 91234 56789", city: "New Delhi", state: "Delhi" },
    { name: "WeWork Space Solutions", type: ContactType.CUSTOMER, email: "facilities@wework.co.in", phone: "+91 98888 77766", city: "Mumbai", state: "Maharashtra" },
    { name: "Horizon FinTech Corp", type: ContactType.CUSTOMER, email: "admin@horizonfintech.com", phone: "+91 97654 32109", city: "Hyderabad", state: "Telangana" },
    { name: "Zenith Software Labs", type: ContactType.CUSTOMER, email: "vendor-management@zenithsoft.com", phone: "+91 98111 22334", city: "Pune", state: "Maharashtra" },

    { name: "Teakwood Supplies Pvt Ltd", type: ContactType.VENDOR, email: "vendor@teakwood.com", phone: "+91 98765 43210", city: "Bengaluru", state: "Karnataka" },
    { name: "SteelCraft Manufacturing Co", type: ContactType.VENDOR, email: "sales@steelcraftmfg.com", phone: "+91 98450 12345", city: "Pune", state: "Maharashtra" },
    { name: "ErgoFoam Cushioning Works", type: ContactType.VENDOR, email: "orders@ergofoam.in", phone: "+91 98222 33445", city: "Coimbatore", state: "Tamil Nadu" },
    { name: "Luxe Fabrics & Upholstery", type: ContactType.VENDOR, email: "info@luxefabrics.com", phone: "+91 99100 99200", city: "Surat", state: "Gujarat" },
    { name: "Precision Hardware Systems", type: ContactType.VENDOR, email: "b2b@precisionhardware.in", phone: "+91 98666 55443", city: "Rajkot", state: "Gujarat" },

    { name: "Interiors & Beyond Studio", type: ContactType.BOTH, email: "projects@interiorsbeyond.com", phone: "+91 99887 76655", city: "Mumbai", state: "Maharashtra" },
    { name: "SpaceCraft Turnkey Office Projects", type: ContactType.BOTH, email: "hello@spacecraftoffice.com", phone: "+91 98760 11111", city: "Bengaluru", state: "Karnataka" },
    { name: "Urban Living Retail Stores", type: ContactType.BOTH, email: "partner@urbanliving.in", phone: "+91 98650 22222", city: "Delhi", state: "Delhi" },
    { name: "Omni Workspace Solutions", type: ContactType.BOTH, email: "corporate@omniworkspace.com", phone: "+91 98540 33333", city: "Hyderabad", state: "Telangana" },
    { name: "DesignMatrix Consultants", type: ContactType.BOTH, email: "info@designmatrix.co", phone: "+91 98430 44444", city: "Pune", state: "Maharashtra" },
  ];

  const existingContacts = await withRetry(() => prisma.contact.findMany());
  const contactMap = new Map(existingContacts.map((c) => [c.email, c]));

  for (const c of contactDefs) {
    if (!contactMap.has(c.email)) {
      const created = await withRetry(() =>
        prisma.contact.create({
          data: {
            name: c.name,
            type: c.type,
            email: c.email,
            phone: c.phone,
            street: "Suite 404, Business Park",
            city: c.city,
            state: c.state,
            country: "India",
            pincode: `${randomInt(110001, 560099)}`,
          },
        })
      );
      contactMap.set(c.email, created);
    }
  }

  const allContacts = Array.from(contactMap.values());
  const customerContacts = allContacts.filter((c) => c.type === ContactType.CUSTOMER || c.type === ContactType.BOTH);
  const vendorContacts = allContacts.filter((c) => c.type === ContactType.VENDOR || c.type === ContactType.BOTH);

  // 4. Products (12 total)
  console.log("🪑 4. Creating 12 Products...");
  const productDefs = [
    { name: "Executive Ergonomic Office Chair", type: ProductType.GOODS, category: "Seating", salesPrice: 12500, cost: 7500 },
    { name: "Mesh Ergonomic Task Chair", type: ProductType.GOODS, category: "Seating", salesPrice: 8900, cost: 5200 },
    { name: "Luxury Velvet 3-Seater Lounge Sofa", type: ProductType.GOODS, category: "Sofas", salesPrice: 68000, cost: 42000 },
    { name: "Solid Teak Dining Table 6-Seater", type: ProductType.GOODS, category: "Tables", salesPrice: 45000, cost: 28000 },
    { name: "Motorized Height-Adjustable Standing Desk", type: ProductType.GOODS, category: "Tables", salesPrice: 32000, cost: 19500 },
    { name: "Modular Acoustic Workstation Pod", type: ProductType.GOODS, category: "Workstations", salesPrice: 95000, cost: 60000 },
    { name: "Executive Mahogany Desk with Drawers", type: ProductType.GOODS, category: "Desks", salesPrice: 54000, cost: 33000 },
    { name: "Metal 4-Drawer Vertical Filing Cabinet", type: ProductType.GOODS, category: "Storage", salesPrice: 14200, cost: 8500 },
    { name: "Conference Room Table 12-Seater", type: ProductType.GOODS, category: "Tables", salesPrice: 110000, cost: 68000 },
    { name: "Spatial Office Floor Plan Design Service", type: ProductType.SERVICE, category: "Services", salesPrice: 25000, cost: 8000 },
    { name: "On-Site Assembly & Ergonomic Setup", type: ProductType.SERVICE, category: "Services", salesPrice: 8500, cost: 3000 },
    { name: "Executive Suite Complete Bundle", type: ProductType.COMBO, category: "Bundles", salesPrice: 145000, cost: 92000 },
  ];

  const existingProducts = await withRetry(() => prisma.product.findMany());
  const productMap = new Map(existingProducts.map((p) => [p.name, p]));

  for (const p of productDefs) {
    if (!productMap.has(p.name)) {
      const created = await withRetry(() => prisma.product.create({ data: p }));
      productMap.set(p.name, created);
    }
  }

  const allProducts = Array.from(productMap.values());

  // 5. Analytic Accounts (4 total)
  console.log("📊 5. Creating 4 Analytic Accounts...");
  const analyticDefs = [
    { name: "HQ Expansion Phase 2026", type: AnalyticType.EXPENSE },
    { name: "Tech Hub Fitout Project", type: AnalyticType.EXPENSE },
    { name: "Corporate Sales H1 Target", type: AnalyticType.INCOME },
    { name: "Enterprise Customer Retainers", type: AnalyticType.INCOME },
  ];

  const existingAnalytics = await withRetry(() => prisma.analyticAccount.findMany());
  const analyticMap = new Map(existingAnalytics.map((a) => [a.name, a]));

  for (const a of analyticDefs) {
    if (!analyticMap.has(a.name)) {
      const created = await withRetry(() => prisma.analyticAccount.create({ data: a }));
      analyticMap.set(a.name, created);
    }
  }

  const allAnalytics = Array.from(analyticMap.values());

  // 6. Budgets (8 total)
  console.log("🎯 6. Creating 8 Budgets...");
  const budgetStatuses = [BudgetStatus.DRAFT, BudgetStatus.CONFIRMED, BudgetStatus.REVISED, BudgetStatus.CANCELLED];
  const existingBudgets = await withRetry(() => prisma.budget.findMany());
  const budgetSet = new Set(existingBudgets.map((b) => b.name));

  for (let i = 1; i <= 8; i++) {
    const analytic = randomChoice(allAnalytics);
    const contact = analytic.type === AnalyticType.INCOME ? randomChoice(customerContacts) : randomChoice(vendorContacts);
    const status = budgetStatuses[(i - 1) % budgetStatuses.length];
    const budgetName = `Budget 2026-00${i}: ${analytic.name}`;

    if (!budgetSet.has(budgetName)) {
      await withRetry(() =>
        prisma.budget.create({
          data: {
            name: budgetName,
            responsibleId: contact.id,
            analyticAccountId: analytic.id,
            periodStart: new Date(2026, 0, 1),
            periodEnd: new Date(2026, 11, 31),
            committedAmount: randomInt(250000, 1800000),
            status: status,
          },
        })
      );
      budgetSet.add(budgetName);
    }
  }

  // 7. Purchase Orders (10 total)
  console.log("🛒 7. Creating 10 Purchase Orders...");
  const poDocStatuses = [DocStatus.CONFIRMED, DocStatus.CONFIRMED, DocStatus.DRAFT, DocStatus.CANCELLED];
  const existingPOs = await withRetry(() => prisma.purchaseOrder.findMany());
  const poMap = new Map(existingPOs.map((p) => [p.poNumber, p]));

  for (let i = 1; i <= 10; i++) {
    const poNum = `PO/2026/${String(i + 100).padStart(5, "0")}`;
    const vendor = randomChoice(vendorContacts);
    const poDate = randomDate(2026, 0, 7);
    const status = poDocStatuses[i % poDocStatuses.length];

    if (!poMap.has(poNum)) {
      const lineCount = randomInt(1, 2);
      const linesData: { productId: string; qty: number; unitPrice: any; analyticAccountId: string }[] = [];
      for (let l = 0; l < lineCount; l++) {
        const prod = randomChoice(allProducts);
        const qty = randomInt(2, 10);
        linesData.push({
          productId: prod.id,
          qty: qty,
          unitPrice: prod.cost,
          analyticAccountId: randomChoice(allAnalytics).id,
        });
      }

      const created = await withRetry(() =>
        prisma.purchaseOrder.create({
          data: {
            poNumber: poNum,
            vendorId: vendor.id,
            poDate: poDate,
            status: status,
            lines: { create: linesData },
          },
        })
      );
      poMap.set(poNum, created);
    }
  }

  const allPOs = Array.from(poMap.values());

  // 8. Vendor Bills (10 total)
  console.log("🧾 8. Creating 10 Vendor Bills & Double-Entry Ledger...");
  const billStatuses = [
    BillInvoiceStatus.PAID,
    BillInvoiceStatus.PARTIALLY_PAID,
    BillInvoiceStatus.CONFIRMED,   
    BillInvoiceStatus.DRAFT,
    BillInvoiceStatus.CANCELLED,
  ];

  const existingBills = await withRetry(() => prisma.vendorBill.findMany());
  const billMap = new Map(existingBills.map((b) => [b.billNumber, b]));

  for (let i = 1; i <= 10; i++) {
    const billNum = `BILL/2026/${String(i + 100).padStart(5, "0")}`;
    const vendor = randomChoice(vendorContacts);
    const billDate = randomDate(2026, 0, 7);
    const dueDate = new Date(billDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const status = billStatuses[i % billStatuses.length];
    const po = allPOs[i - 1];

    if (!billMap.has(billNum)) {
      const lineCount = randomInt(1, 2);
      let totalAmount = 0;
      const linesData: { productId: string; chartOfAccountId: string; analyticAccountId: string; qty: number; unitPrice: number }[] = [];
      for (let l = 0; l < lineCount; l++) {
        const prod = randomChoice(allProducts);
        const qty = randomInt(2, 10);
        const price = Number(prod.cost);
        totalAmount += qty * price;
        linesData.push({
          productId: prod.id,
          chartOfAccountId: accMap["Purchase Expense"],
          analyticAccountId: randomChoice(allAnalytics).id,
          qty: qty,
          unitPrice: price,
        });
      }

      let paidAmt = 0;
      if (status === BillInvoiceStatus.PAID) paidAmt = totalAmount;
      else if (status === BillInvoiceStatus.PARTIALLY_PAID) paidAmt = Math.round(totalAmount * 0.4);

      let journalEntryId: string | undefined = undefined;
      if (status === BillInvoiceStatus.CONFIRMED || status === BillInvoiceStatus.PARTIALLY_PAID || status === BillInvoiceStatus.PAID) {
        const entry = await withRetry(() =>
          prisma.journalEntry.create({
            data: {
              journalId: journalMap["Purchase"],
              accountingDate: billDate,
              reference: billNum,
              partnerId: vendor.id,
              status: JournalEntryStatus.POSTED,
              items: {
                create: [
                  { accountId: accMap["Purchase Expense"], partnerId: vendor.id, debit: totalAmount, credit: 0 },
                  { accountId: accMap["Creditors"], partnerId: vendor.id, debit: 0, credit: totalAmount },
                ],
              },
            },
          })
        );
        journalEntryId = entry.id;
      }

      const createdBill = await withRetry(() =>
        prisma.vendorBill.create({
          data: {
            billNumber: billNum,
            vendorId: vendor.id,
            billReference: `REF-VEND-${i * 108}`,
            billDate: billDate,
            dueDate: dueDate,
            status: status,
            sourcePOId: po ? po.id : undefined,
            paidAmount: paidAmt,
            journalEntryId: journalEntryId,
            lines: { create: linesData },
          },
        })
      );
      billMap.set(billNum, createdBill);
    }
  }

  const allBills = Array.from(billMap.values());

  // 9. Sales Orders (10 total)
  console.log("🛍️ 9. Creating 10 Sales Orders...");
  const soDocStatuses = [DocStatus.CONFIRMED, DocStatus.CONFIRMED, DocStatus.DRAFT, DocStatus.CANCELLED];
  const existingSOs = await withRetry(() => prisma.salesOrder.findMany());
  const soMap = new Map(existingSOs.map((s) => [s.soNumber, s]));

  for (let i = 1; i <= 10; i++) {
    const soNum = `SO/2026/${String(i + 100).padStart(5, "0")}`;
    const customer = randomChoice(customerContacts);
    const soDate = randomDate(2026, 0, 7);
    const status = soDocStatuses[i % soDocStatuses.length];

    if (!soMap.has(soNum)) {
      const lineCount = randomInt(1, 2);
      const linesData: { productId: string; qty: number; unitPrice: any; taxRate: number; analyticAccountId: string }[] = [];
      for (let l = 0; l < lineCount; l++) {
        const prod = randomChoice(allProducts);
        const qty = randomInt(1, 8);
        linesData.push({
          productId: prod.id,
          qty: qty,
          unitPrice: prod.salesPrice,
          taxRate: 18,
          analyticAccountId: randomChoice(allAnalytics).id,
        });
      }

      const createdSO = await withRetry(() =>
        prisma.salesOrder.create({
          data: {
            soNumber: soNum,
            customerId: customer.id,
            soDate: soDate,
            status: status,
            lines: { create: linesData },
          },
        })
      );
      soMap.set(soNum, createdSO);
    }
  }

  const allSOs = Array.from(soMap.values());

  // 10. Customer Invoices (10 total)
  console.log("💰 10. Creating 10 Customer Invoices & Double-Entry Ledger...");
  const invoiceStatuses = [
    BillInvoiceStatus.PAID,
    BillInvoiceStatus.PARTIALLY_PAID,
    BillInvoiceStatus.CONFIRMED,
    BillInvoiceStatus.DRAFT,
    BillInvoiceStatus.CANCELLED,
  ];

  const existingInvoices = await withRetry(() => prisma.customerInvoice.findMany());
  const invMap = new Map(existingInvoices.map((inv) => [inv.invoiceNumber, inv]));

  for (let i = 1; i <= 10; i++) {
    const invNum = `INV/2026/${String(i + 100).padStart(5, "0")}`;
    const customer = randomChoice(customerContacts);
    const invDate = randomDate(2026, 0, 7);
    const dueDate = new Date(invDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const status = invoiceStatuses[i % invoiceStatuses.length];
    const so = allSOs[i - 1];

    if (!invMap.has(invNum)) {
      const lineCount = randomInt(1, 2);
      let subtotal = 0;
      let totalTax = 0;
      const linesData: { productId: string; chartOfAccountId: string; analyticAccountId: string; qty: number; unitPrice: number; taxRate: number }[] = [];
      for (let l = 0; l < lineCount; l++) {
        const prod = randomChoice(allProducts);
        const qty = randomInt(1, 6);
        const price = Number(prod.salesPrice);
        const lineVal = qty * price;
        const tax = lineVal * 0.18;
        subtotal += lineVal;
        totalTax += tax;
        linesData.push({
          productId: prod.id,
          chartOfAccountId: accMap["Sales Income"],
          analyticAccountId: randomChoice(allAnalytics).id,
          qty: qty,
          unitPrice: price,
          taxRate: 18,
        });
      }

      const grandTotal = subtotal + totalTax;
      let paidAmt = 0;
      if (status === BillInvoiceStatus.PAID) paidAmt = grandTotal;
      else if (status === BillInvoiceStatus.PARTIALLY_PAID) paidAmt = Math.round(grandTotal * 0.5);

      let journalEntryId: string | undefined = undefined;
      if (status === BillInvoiceStatus.CONFIRMED || status === BillInvoiceStatus.PARTIALLY_PAID || status === BillInvoiceStatus.PAID) {
        const entry = await withRetry(() =>
          prisma.journalEntry.create({
            data: {
              journalId: journalMap["Sales"],
              accountingDate: invDate,
              reference: invNum,
              partnerId: customer.id,
              status: JournalEntryStatus.POSTED,
              items: {
                create: [
                  { accountId: accMap["Debtors"], partnerId: customer.id, debit: grandTotal, credit: 0 },
                  { accountId: accMap["Sales Income"], partnerId: customer.id, debit: 0, credit: subtotal },
                  { accountId: accMap["Tax Payable"], partnerId: customer.id, debit: 0, credit: totalTax },
                ],
              },
            },
          })
        );
        journalEntryId = entry.id;
      }

      const createdInv = await withRetry(() =>
        prisma.customerInvoice.create({
          data: {
            invoiceNumber: invNum,
            customerId: customer.id,
            invoiceReference: `PO-CUST-REF-${i * 303}`,
            invoiceDate: invDate,
            dueDate: dueDate,
            status: status,
            sourceSOId: so ? so.id : undefined,
            paidAmount: paidAmt,
            journalEntryId: journalEntryId,
            lines: { create: linesData },
          },
        })
      );
      invMap.set(invNum, createdInv);
    }
  }

  const allInvoices = Array.from(invMap.values());

  // 11. Payments (10 total)
  console.log("💳 11. Creating 10 Payments...");
  const existingPayments = await withRetry(() => prisma.payment.findMany());

  if (existingPayments.length < 10) {
    const paidBills = allBills.filter((b) => b.status === BillInvoiceStatus.PAID || b.status === BillInvoiceStatus.PARTIALLY_PAID);
    const paidInvoices = allInvoices.filter((i) => i.status === BillInvoiceStatus.PAID || i.status === BillInvoiceStatus.PARTIALLY_PAID);

    for (let i = 0; i < Math.min(5, paidBills.length); i++) {
      const bill = paidBills[i];
      const payAmt = Number(bill.paidAmount) || 50000;
      const payDate = new Date(bill.billDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      const method = i % 2 === 0 ? PaymentMethod.BANK : PaymentMethod.CASH;
      const bankOrCashAccount = method === PaymentMethod.BANK ? accMap["Bank"] : accMap["Cash"];
      const journalId = method === PaymentMethod.BANK ? journalMap["Bank"] : journalMap["Cash"];

      const pEntry = await withRetry(() =>
        prisma.journalEntry.create({
          data: {
            journalId: journalId,
            accountingDate: payDate,
            reference: `PAY-OUT-${bill.billNumber}`,
            partnerId: bill.vendorId,
            status: JournalEntryStatus.POSTED,
            items: {
              create: [
                { accountId: accMap["Creditors"], partnerId: bill.vendorId, debit: payAmt, credit: 0 },
                { accountId: bankOrCashAccount, partnerId: bill.vendorId, debit: 0, credit: payAmt },
              ],
            },
          },
        })
      );

      await withRetry(() =>
        prisma.payment.create({
          data: {
            direction: PaymentDirection.SEND,
            method: method,
            amount: payAmt,
            date: payDate,
            note: `Vendor payment for ${bill.billNumber}`,
            contactId: bill.vendorId,
            vendorBillId: bill.id,
            journalEntryId: pEntry.id,
          },
        })
      );
    }

    for (let i = 0; i < Math.min(5, paidInvoices.length); i++) {
      const inv = paidInvoices[i];
      const payAmt = Number(inv.paidAmount) || 60000;
      const payDate = new Date(inv.invoiceDate.getTime() + 4 * 24 * 60 * 60 * 1000);
      const method = i % 2 === 0 ? PaymentMethod.BANK : PaymentMethod.CASH;
      const bankOrCashAccount = method === PaymentMethod.BANK ? accMap["Bank"] : accMap["Cash"];
      const journalId = method === PaymentMethod.BANK ? journalMap["Bank"] : journalMap["Cash"];

      const pEntry = await withRetry(() =>
        prisma.journalEntry.create({
          data: {
            journalId: journalId,
            accountingDate: payDate,
            reference: `PAY-IN-${inv.invoiceNumber}`,
            partnerId: inv.customerId,
            status: JournalEntryStatus.POSTED,
            items: {
              create: [
                { accountId: bankOrCashAccount, partnerId: inv.customerId, debit: payAmt, credit: 0 },
                { accountId: accMap["Debtors"], partnerId: inv.customerId, debit: 0, credit: payAmt },
              ],
            },
          },
        })
      );

      await withRetry(() =>
        prisma.payment.create({
          data: {
            direction: PaymentDirection.RECEIVE,
            method: method,
            amount: payAmt,
            date: payDate,
            note: `Customer payment received for ${inv.invoiceNumber}`,
            contactId: inv.customerId,
            customerInvoiceId: inv.id,
            journalEntryId: pEntry.id,
          },
        })
      );
    }
  }

  // 12. Manual Miscellaneous Journal Entries
  console.log("📖 12. Creating 5 Manual Double-Entry Journal Entries...");
  const manualCount = await withRetry(() => prisma.journalEntry.count({ where: { reference: { startsWith: "MISC-JV" } } }));

  if (manualCount < 5) {
    for (let i = 1; i <= 5; i++) {
      const jDate = randomDate(2026, 0, 7);
      const contact = randomChoice(allContacts);
      const amount = randomInt(5000, 120000);

      const isExpense = i % 2 === 0;
      const debitAcc = isExpense ? accMap["Office Supplies Expense"] : accMap["Equipment & Assets"];
      const creditAcc = isExpense ? accMap["Bank"] : accMap["Capital"];
      const journalId = isExpense ? journalMap["Bank"] : journalMap["Sales"];

      await withRetry(() =>
        prisma.journalEntry.create({
          data: {
            journalId: journalId,
            accountingDate: jDate,
            reference: `MISC-JV-2026-${String(i + 100).padStart(3, "0")}`,
            partnerId: contact.id,
            status: JournalEntryStatus.POSTED,
            items: {
              create: [
                { accountId: debitAcc, partnerId: contact.id, debit: amount, credit: 0 },
                { accountId: creditAcc, partnerId: contact.id, debit: 0, credit: amount },
              ],
            },
          },
        })
      );
    }
  }

  console.log("\n========================================================");
  console.log("✨ ALL DUMMY DATA SEEDED SUCCESSFULLY!");
  console.log("========================================================");
  console.log(` 👥 Contacts:         ${await prisma.contact.count()}`);
  console.log(` 🪑 Products:         ${await prisma.product.count()}`);
  console.log(` 📊 Analytic Accounts: ${await prisma.analyticAccount.count()}`);
  console.log(` 🎯 Budgets:          ${await prisma.budget.count()}`);
  console.log(` 🛒 Purchase Orders:  ${await prisma.purchaseOrder.count()}`);
  console.log(` 📑 PO Lines:         ${await prisma.pOLine.count()}`);
  console.log(` 🧾 Vendor Bills:     ${await prisma.vendorBill.count()}`);
  console.log(` 📑 Bill Lines:       ${await prisma.billLine.count()}`);
  console.log(` 🛍️ Sales Orders:     ${await prisma.salesOrder.count()}`);
  console.log(` 📑 SO Lines:         ${await prisma.sOLine.count()}`);
  console.log(` 💰 Customer Invoices: ${await prisma.customerInvoice.count()}`);
  console.log(` 📑 Invoice Lines:    ${await prisma.invoiceLine.count()}`);
  console.log(` 💳 Payments:         ${await prisma.payment.count()}`);
  console.log(` 📖 Journal Entries:  ${await prisma.journalEntry.count()}`);
  console.log(` 📘 Journal Items:    ${await prisma.journalItem.count()}`);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding dummy data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
