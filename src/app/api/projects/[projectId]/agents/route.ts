import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireProjectAccess, filterProjectKbIds } from "@/lib/tenancy";
import { parseAgentBody } from "@/lib/agent-validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(request, projectId);
  if ("response" in access) return access.response;

  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.projectId, projectId))
    .orderBy(asc(agents.createdAt));

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
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { values, error } = parseAgentBody(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const kbIds = (values.kbIds as string[] | undefined) ?? [];
  if (kbIds.length > 0) {
    const allowed = await filterProjectKbIds(projectId, kbIds);
    if (allowed.length !== kbIds.length) {
      return NextResponse.json(
        { error: "Some knowledge bases do not belong to this project" },
        { status: 400 },
      );
    }
    values.kbIds = allowed;
  }

  const name = (values.name as string | undefined) ?? "Support Agent";
  const [created] = await db
    .insert(agents)
    .values({ projectId, name, ...values })
    .returning();

  return NextResponse.json(created, { status: 201 });
}