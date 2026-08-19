// Seed demo users (run at build time / locally)
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import path from "path";

const prisma = new PrismaClient({
  datasources: {
    db: { url: "file:" + path.join(process.cwd(), "prisma", "db", "medai.db") },
  },
});

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function seedUsers() {
  const users = [
    { email: "admin@medai.ai", password: hashPassword("medAI2026"), name: "Admin (Doctor)", role: "admin" },
    { email: "doctor@medai.ai", password: hashPassword("medAI2026"), name: "Dr. Demo", role: "admin" },
    { email: "patient@medai.ai", password: hashPassword("medAI2026"), name: "Patient Demo", role: "user" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password: user.password, role: user.role },
      create: user,
    });
  }

  console.log("Seeded demo users:");
  console.log("- admin@medai.ai / medAI2026 (admin)");
  console.log("- doctor@medai.ai / medAI2026 (admin)");
  console.log("- patient@medai.ai / medAI2026 (user)");
}

seedUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
