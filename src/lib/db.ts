// Prisma client singleton — Neon Postgres
// Uses DATABASE_URL from process.env (loaded by Vercel at runtime)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create new instance if one doesn't exist in global scope
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });
}

export const db = globalForPrisma.prisma;

// Don't reassign in production to avoid connection leaks
