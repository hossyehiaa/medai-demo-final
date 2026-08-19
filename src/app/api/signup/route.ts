// Signup API endpoint
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (String(password).length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return Response.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    // Role select: "doctor" → admin, anything else → user (patient)
    const resolvedRole = role === "doctor" || role === "admin" ? "admin" : "user";

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashPassword(password),
        name: name || normalizedEmail.split("@")[0],
        role: resolvedRole,
      },
    });

    return Response.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
