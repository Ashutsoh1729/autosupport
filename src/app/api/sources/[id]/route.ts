import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { removeFromR2 } from "@/lib/r2";
import { requireKnowledgeBaseAccess } from "@/lib/tenancy";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, id))
    .limit(1);

  if (!source) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const access = await requireKnowledgeBaseAccess(request, source.kbId);
  if ("response" in access) return access.response;

  if (source.type === "file" && source.contentRef) {
    await removeFromR2(source.contentRef).catch(() => {});
  }

  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, id));

  return NextResponse.json({ ok: true });
}
