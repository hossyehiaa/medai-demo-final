// Prisma client singleton — Neon Postgres
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query"] : [] });
}

export const db = globalForPrisma.prisma;

