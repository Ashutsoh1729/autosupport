import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireKnowledgeBaseAccess } from "@/lib/tenancy";
import { uploadToR2, sourceObjectKey } from "@/lib/r2";
import { sendKnowledgeSourceCreated } from "@/lib/inngest";

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"];

function extensionOf(filename: string): string | null {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return null;
  return lower.slice(dot);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kbId: string }> },
) {
  const { kbId } = await params;
  const access = await requireKnowledgeBaseAccess(request, kbId);
  if ("response" in access) return access.response;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "multipart/form-data expected" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const name = typeof form.get("name") === "string" ? String(form.get("name")).trim() : "";
  const filename = file.name || "file";
  const ext = extensionOf(filename);

  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Only PDF, TXT, and MD files are supported" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const [created] = await db
    .insert(knowledgeSources)
    .values({
      kbId,
      type: "file",
      name: name || filename,
      contentRef: "", // placeholder; filled with R2 key below
    })
    .returning();

  const key = sourceObjectKey(kbId, created.id, filename);

  try {
    await uploadToR2(key, buffer, file.type || "application/octet-stream");
  } catch {
    await db.delete(knowledgeSources).where(eq(knowledgeSources.id, created.id)).catch(() => {});
    return NextResponse.json({ error: "Upload to storage failed" }, { status: 502 });
  }

  const [updated] = await db
    .update(knowledgeSources)
    .set({ contentRef: key })
    .where(eq(knowledgeSources.id, created.id))
    .returning();

  await sendKnowledgeSourceCreated(created.id).catch(() => {});

  return NextResponse.json(updated, { status: 201 });
}