import { PrismaClient } from "@prisma/client";
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

async function checkUsers() {
  console.log("🔍 Checking Users in DB...");
  const users = await withRetry(() => prisma.user.findMany());
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    const isAccMatch = await bcrypt.compare("Accountant@123", u.passwordHash);
    const isAdminMatch = await bcrypt.compare("Admin@123", u.passwordHash);
    console.log(`- LoginID: "${u.loginId}" | Name: "${u.name}" | Role: ${u.role} | AccMatch: ${isAccMatch} | AdminMatch: ${isAdminMatch}`);
  }
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
