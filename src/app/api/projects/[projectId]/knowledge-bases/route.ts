import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeBases } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/tenancy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(request, projectId);
  if ("response" in access) return access.response;

  const rows = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.projectId, projectId))
    .orderBy(asc(knowledgeBases.createdAt));

  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(request, projectId);
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "Knowledge base name is required" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(knowledgeBases)
    .values({ projectId, name })
    .returning();

  return NextResponse.json(created, { status: 201 });
}