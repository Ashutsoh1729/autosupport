import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, projects, knowledgeBases, agents } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

type ProjectRow = typeof projects.$inferSelect;
type KnowledgeBaseRow = typeof knowledgeBases.$inferSelect;
type AgentRow = typeof agents.$inferSelect;

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

/**
 * Returns the agent if the requesting user is a member of the workspace
 * owning the agent's project, otherwise null.
 */
export async function requireAgentAccess(
  request: Request,
  agentId: string,
): Promise<{ agent: AgentRow; project: ProjectRow } | { response: NextResponse }> {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) {
    return { response: NextResponse.json({ error: "Not Found" }, { status: 404 }) };
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, agent.projectId))
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

  return { agent, project };
}

/**
 * Filters a candidate list of knowledge-base ids down to those that belong
 * to the given project. Used by agent create/update so an agent can only
 * attach KBs from its own project.
 */
export async function filterProjectKbIds(
  projectId: string,
  kbIds: string[],
): Promise<string[]> {
  const unique = [...new Set(kbIds)];
  if (unique.length === 0) return [];
  const rows = await db
    .select({ id: knowledgeBases.id })
    .from(knowledgeBases)
    .where(
      and(
        eq(knowledgeBases.projectId, projectId),
        inArray(knowledgeBases.id, unique),
      ),
    );
  const allowed = new Set(rows.map((r) => r.id));
  return unique.filter((id) => allowed.has(id));
}