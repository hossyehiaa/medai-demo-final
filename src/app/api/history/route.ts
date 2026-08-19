// History API — per-user past queries (list + delete)
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  try {
    const queries = await db.query.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return Response.json(queries);
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const queryId = searchParams.get("id");
  if (!queryId) return new Response("Missing query ID", { status: 400 });

  try {
    // deleteMany scoped by userId so users can only delete their own history
    await db.query.deleteMany({
      where: { id: queryId, userId: session.user.id },
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete query:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
