import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeBases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireKnowledgeBaseAccess } from "@/lib/tenancy";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ kbId: string }> },
) {
  const { kbId } = await params;
  const access = await requireKnowledgeBaseAccess(request, kbId);
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "Knowledge base name is required" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(knowledgeBases)
    .set({ name })
    .where(eq(knowledgeBases.id, kbId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ kbId: string }> },
) {
  const { kbId } = await params;
  const access = await requireKnowledgeBaseAccess(request, kbId);
  if ("response" in access) return access.response;

  await db.delete(knowledgeBases).where(eq(knowledgeBases.id, kbId));

  return NextResponse.json({ ok: true });
}