// Prisma client singleton for Urban Furniture Accounting System.
// What: Exports a single shared PrismaClient instance for use across all server actions and pages.
// Why: Next.js in development mode runs module code repeatedly due to hot-reloading. Without
//      the global singleton pattern, each reload creates a new DB connection pool, exhausting
//      Neon's connection limit quickly.
// Why not: Importing `new PrismaClient()` directly in each file would work in production
//           (one process, one import) but break dev mode due to module re-evaluation.
// Used by: Every server action and server component that queries the database.

import { PrismaClient } from "@prisma/client";

// Use a global variable to persist the client across hot-reloads in development.
// The 'global' object survives module re-evaluation; the client does not.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
