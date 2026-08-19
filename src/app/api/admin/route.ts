// Admin API endpoint - view all users and queries (admin role only)
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "users") {
      const users = await db.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { queries: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return Response.json(users);
    } else if (type === "queries") {
      const queries = await db.query.findMany({
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return Response.json(queries);
    }
    return new Response("Invalid type parameter", { status: 400 });
  } catch (error) {
    console.error("Admin API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
