// Guest mode — creates a temporary guest account and returns one-time credentials
import { db } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST() {
  try {
    const rand = crypto.randomBytes(6).toString("hex");
    const email = `guest_${rand}@guest.medai.ai`;
    const password = crypto.randomBytes(12).toString("hex");

    await db.user.create({
      data: {
        email,
        password: hashPassword(password),
        name: "Guest",
        role: "guest",
      },
    });

    // Password returned ONCE so the client can sign in; only the hash is stored.
    return Response.json({ email, password });
  } catch (error) {
    console.error("Guest creation error:", error);
    return Response.json({ error: "Failed to create guest session" }, { status: 500 });
  }
}
