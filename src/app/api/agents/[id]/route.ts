import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAgentAccess, filterProjectKbIds } from "@/lib/tenancy";
import { parseAgentBody } from "@/lib/agent-validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireAgentAccess(request, id);
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.status !== undefined) {
    return NextResponse.json(
      { error: "status is managed by the publish endpoint" },
      { status: 400 },
    );
  }

  const { values, error } = parseAgentBody(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (values.kbIds !== undefined) {
    const kbIds = values.kbIds as string[];
    if (kbIds.length > 0) {
      const allowed = await filterProjectKbIds(access.project.id, kbIds);
      if (allowed.length !== kbIds.length) {
        return NextResponse.json(
          { error: "Some knowledge bases do not belong to this project" },
          { status: 400 },
        );
      }
      values.kbIds = allowed;
    }
  }

  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(agents)
    .set(values)
    .where(eq(agents.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireAgentAccess(request, id);
  if ("response" in access) return access.response;

  await db.delete(agents).where(eq(agents.id, id));

  return NextResponse.json({ ok: true });
}