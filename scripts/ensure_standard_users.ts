import { PrismaClient, ContactType } from "@prisma/client";
import bcrypt from "bcryptjs";

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

async function main() {
  console.log("🛠️ Ensuring standard demo users exist...");

  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  const accountantPasswordHash = await bcrypt.hash("Accountant@123", 12);
  const vendorPasswordHash = await bcrypt.hash("Vendor@123", 12);
  const customerPasswordHash = await bcrypt.hash("Customer@123", 12);

  // 1. Admin User (admin1234)
  await withRetry(() =>
    prisma.user.upsert({
      where: { loginId: "admin1234" },
      update: { passwordHash: adminPasswordHash, role: "ADMIN" },
      create: {
        name: "System Administrator",
        loginId: "admin1234",
        email: "admin@urbanfurniture.com",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
      },
    })
  );
  console.log("✅ User 'admin1234' is ready (Password: Admin@123)");

  // 2. Accountant User (accountant1)
  await withRetry(() =>
    prisma.user.upsert({
      where: { loginId: "accountant1" },
      update: { passwordHash: accountantPasswordHash, role: "ACCOUNTANT" },
      create: {
        name: "Lead Accountant",
        loginId: "accountant1",
        email: "accountant@urbanfurniture.com",
        passwordHash: accountantPasswordHash,
        role: "ACCOUNTANT",
      },
    })
  );
  console.log("✅ User 'accountant1' is ready (Password: Accountant@123)");

  // 3. Vendor Contact & User (vendor123)
  let vendorContact = await withRetry(() => prisma.contact.findFirst({ where: { email: "vendor@teakwood.com" } }));
  if (!vendorContact) {
    vendorContact = await withRetry(() =>
      prisma.contact.create({
        data: {
          name: "Teakwood Supplies Pvt Ltd",
          email: "vendor@teakwood.com",
          phone: "+91 98765 43210",
          type: ContactType.VENDOR,
        },
      })
    );
  }
  await withRetry(() =>
    prisma.user.upsert({
      where: { loginId: "vendor123" },
      update: { passwordHash: vendorPasswordHash, role: "CONTACT_USER", contactId: vendorContact!.id },
      create: {
        name: "Teakwood Supplies Portal",
        loginId: "vendor123",
        email: "vendor@teakwood.com",
        passwordHash: vendorPasswordHash,
        role: "CONTACT_USER",
        contactId: vendorContact!.id,
      },
    })
  );
  console.log("✅ User 'vendor123' is ready (Password: Vendor@123)");

  // 4. Customer Contact & User (customer123)
  let customerContact = await withRetry(() => prisma.contact.findFirst({ where: { email: "procurement@grandroyale.com" } }));
  if (!customerContact) {
    customerContact = await withRetry(() =>
      prisma.contact.create({
        data: {
          name: "Grand Royale Hotel & Suites",
          email: "procurement@grandroyale.com",
          phone: "+91 91234 56789",
          type: ContactType.CUSTOMER,
        },
      })
    );
  }
  await withRetry(() =>
    prisma.user.upsert({
      where: { loginId: "customer123" },
      update: { passwordHash: customerPasswordHash, role: "CONTACT_USER", contactId: customerContact!.id },
      create: {
        name: "Grand Royale Portal",
        loginId: "customer123",
        email: "procurement@grandroyale.com",
        passwordHash: customerPasswordHash,
        role: "CONTACT_USER",
        contactId: customerContact!.id,
      },
    })
  );
  console.log("✅ User 'customer123' is ready (Password: Customer@123)");

  console.log("\n🎉 All 4 standard demo users are 100% active and verified in database!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
