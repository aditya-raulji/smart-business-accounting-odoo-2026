import { PrismaClient, BillInvoiceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function withRetry<T>(fn: () => Promise<T>, retries = 6, delayMs = 2500): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        await prisma.$connect().catch(() => {});
      }
      return await fn();
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error("Failed after retries");
}

async function populateDemoPortals() {
  console.log("🚀 Attaching Vendor Bills to vendor123 and Invoices to customer123...");

  // 1. Get vendor123 User & Contact
  const vendorUser = await withRetry(() =>
    prisma.user.findUnique({
      where: { loginId: "vendor123" },
      include: { contact: true },
    })
  );

  // 2. Get customer123 User & Contact
  const customerUser = await withRetry(() =>
    prisma.user.findUnique({
      where: { loginId: "customer123" },
      include: { contact: true },
    })
  );

  if (!vendorUser?.contactId) {
    console.error("❌ vendor123 contact not found");
    return;
  }

  if (!customerUser?.contactId) {
    console.error("❌ customer123 contact not found");
    return;
  }

  // 3. Update existing VendorBills to assign 5 of them to vendor123 (Teakwood Supplies)
  const existingBills = await withRetry(() => prisma.vendorBill.findMany({ take: 6 }));
  for (const b of existingBills) {
    await withRetry(() =>
      prisma.vendorBill.update({
        where: { id: b.id },
        data: { vendorId: vendorUser.contactId! },
      })
    );
  }
  console.log(`✅ Updated ${existingBills.length} Vendor Bills to belong to vendor123 (${vendorUser.contact?.name})`);

  // 4. Update existing CustomerInvoices to assign 5 of them to customer123 (Grand Royale Hotel)
  const existingInvoices = await withRetry(() => prisma.customerInvoice.findMany({ take: 6 }));
  for (const inv of existingInvoices) {
    await withRetry(() =>
      prisma.customerInvoice.update({
        where: { id: inv.id },
        data: { customerId: customerUser.contactId! },
      })
    );
  }
  console.log(`✅ Updated ${existingInvoices.length} Customer Invoices to belong to customer123 (${customerUser.contact?.name})`);

  console.log("\n🎉 Done! Vendor and Customer Portals now have rich populated records.");
}

populateDemoPortals()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
