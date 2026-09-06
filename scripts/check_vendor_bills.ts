import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkVendorData() {
  console.log("🔍 Checking vendor123 data...");
  const vendorUser = await prisma.user.findUnique({
    where: { loginId: "vendor123" },
    include: { contact: true },
  });

  console.log("Vendor User:", vendorUser);

  if (vendorUser && vendorUser.contactId) {
    const bills = await prisma.vendorBill.findMany({
      where: { vendorId: vendorUser.contactId },
      include: { lines: true, payments: true },
    });
    console.log(`Found ${bills.length} vendor bills for contact ID ${vendorUser.contactId}:`);
    for (const b of bills) {
      const total = b.lines.reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
      console.log(`- Bill Number: ${b.billNumber} | Status: ${b.status} | Total: ${total} | Paid: ${b.paidAmount}`);
    }
  } else {
    console.log("❌ Vendor user has no contactId assigned!");
  }
}

checkVendorData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
