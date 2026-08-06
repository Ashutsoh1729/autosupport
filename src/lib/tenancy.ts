import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, projects, knowledgeBases } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

type ProjectRow = typeof projects.$inferSelect;
type KnowledgeBaseRow = typeof knowledgeBases.$inferSelect;

async function getSessionUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

/**
 * Returns the project row if the requesting user is a member of the
 * project's owning workspace, otherwise null.
 */
export async function requireProjectAccess(
  request: Request,
  projectId: string,
): Promise<{ project: ProjectRow } | { response: NextResponse }> {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return { response: NextResponse.json({ error: "Not Found" }, { status: 404 }) };
  }

  const isMember = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.workspaceId, project.workspaceId),
      ),
    )
    .limit(1);

  if (isMember.length === 0) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { project };
}

/**
 * Returns the knowledge base if the requesting user is a member of the
 * workspace owning the KB's project, otherwise null.
 */
export async function requireKnowledgeBaseAccess(
  request: Request,
  kbId: string,
): Promise<{ knowledgeBase: KnowledgeBaseRow } | { response: NextResponse }> {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [kb] = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.id, kbId))
    .limit(1);

  if (!kb) {
    return { response: NextResponse.json({ error: "Not Found" }, { status: 404 }) };
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, kb.projectId))
    .limit(1);

  if (!project) {
    return { response: NextResponse.json({ error: "Not Found" }, { status: 404 }) };
  }

  const isMember = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.workspaceId, project.workspaceId),
      ),
    )
    .limit(1);

  if (isMember.length === 0) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { knowledgeBase: kb };
}