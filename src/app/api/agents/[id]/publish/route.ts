import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAgentAccess } from "@/lib/tenancy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireAgentAccess(request, id);
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const published = body?.published === true;

  if (published) {
    if (!access.agent.systemPrompt.trim()) {
      return NextResponse.json(
        { error: "Cannot publish an agent without a system prompt" },
        { status: 400 },
      );
    }
    if (access.agent.kbIds.length === 0) {
      return NextResponse.json(
        { error: "Cannot publish an agent without attached knowledge bases" },
        { status: 400 },
      );
    }
  }

  const [updated] = await db
    .update(agents)
    .set({ status: published ? "published" : "draft" })
    .where(eq(agents.id, id))
    .returning();

  return NextResponse.json(updated);
}