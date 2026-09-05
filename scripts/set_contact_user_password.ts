import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const loginId = "royal";
  const plainPassword = "Royal@1234";

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  await prisma.user.update({
    where: { loginId },
    data: { passwordHash },
  });

  console.log(`Password for user '${loginId}' (CONTACT_USER) updated to: ${plainPassword}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
