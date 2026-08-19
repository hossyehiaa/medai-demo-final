// Prisma client singleton with Vercel /tmp support.
// On Vercel, the deployed filesystem is read-only — we copy the seeded SQLite db
// to /tmp on cold start so writes (signup, history) work (ephemeral per instance).
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function resolveDbUrl(): string {
  if (process.env.VERCEL) {
    const dest = "/tmp/medai.db";
    if (!fs.existsSync(dest)) {
      const candidates = [
        path.join(process.cwd(), "prisma", "db", "medai.db"),
        path.join(process.cwd(), "db", "medai.db"),
      ];
      for (const src of candidates) {
        try {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            break;
          }
        } catch {
          // continue
        }
      }
    }
    return "file:/tmp/medai.db";
  }
  return "file:" + path.join(process.cwd(), "prisma", "db", "medai.db");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDbUrl() } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
