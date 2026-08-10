import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeSources } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireKnowledgeBaseAccess } from "@/lib/tenancy";
import { sendKnowledgeSourceCreated } from "@/lib/inngest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kbId: string }> },
) {
  const { kbId } = await params;
  const access = await requireKnowledgeBaseAccess(request, kbId);
  if ("response" in access) return access.response;

  const rows = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.kbId, kbId))
    .orderBy(asc(knowledgeSources.createdAt));

  return NextResponse.json(rows);
}

async function createTextSource(body: { content?: unknown; name?: unknown }, kbId: string) {
  const content = typeof body?.content === "string" ? body.content : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(knowledgeSources)
    .values({
      kbId,
      type: "text",
      name: name || "Untitled text",
      contentRef: content,
    })
    .returning();

  await sendKnowledgeSourceCreated(created.id).catch(() => {
    // If enqueueing fails, still return the source so the client sees it.
    // It will remain in "queued" and can be retried.
  });

  return NextResponse.json(created, { status: 201 });
}

async function createUrlSource(body: { url?: unknown; name?: unknown }, kbId: string) {
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "url is invalid" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "url must be http(s)" }, { status: 400 });
  }

  const [created] = await db
    .insert(knowledgeSources)
    .values({
      kbId,
      type: "url",
      name: name || url,
      contentRef: parsed.toString(),
    })
    .returning();

  await sendKnowledgeSourceCreated(created.id).catch(() => {});

  return NextResponse.json(created, { status: 201 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kbId: string }> },
) {
  const { kbId } = await params;
  const access = await requireKnowledgeBaseAccess(request, kbId);
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const kind = body?.kind;

  if (kind === "text") {
    return createTextSource(body ?? {}, kbId);
  }
  if (kind === "url") {
    return createUrlSource(body ?? {}, kbId);
  }

  return NextResponse.json(
    { error: "kind must be 'text' or 'url'" },
    { status: 400 },
  );
}
