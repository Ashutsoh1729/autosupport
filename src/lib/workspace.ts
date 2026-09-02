import { db } from "@/lib/db";
import { workspaces, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type WorkspaceInfo = {
  id: string;
  name: string;
};

export async function getOrCreateWorkspace(
  userId: string,
  userName: string | null,
): Promise<WorkspaceInfo> {
  // Query for user's workspace
  const userMemberships = await db
    .select({
      workspaceId: memberships.workspaceId,
      workspaceName: workspaces.name,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId))
    .limit(1);

  if (userMemberships.length > 0) {
    return {
      id: userMemberships[0].workspaceId,
      name: userMemberships[0].workspaceName,
    };
  }

  // Create default workspace if none exists (handles existing users)
  const workspaceName = userName ? `${userName}'s Workspace` : "My Workspace";

  // Double-check for race conditions
  const existingMembership = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);

  if (existingMembership.length > 0) {
    // Fetch the workspace name
    const [fetchedWorkspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, existingMembership[0].workspaceId))
      .limit(1);
    return {
      id: existingMembership[0].workspaceId,
      name: fetchedWorkspace?.name || "Unknown Workspace",
    };
  }

  // Create workspace and membership in a transaction
  let createdWorkspace: WorkspaceInfo = { id: "", name: "" };
  await db.transaction(async (tx) => {
    // Create workspace
    const [newWorkspace] = await tx
      .insert(workspaces)
      .values({
        name: workspaceName,
      })
      .returning();

    // Create membership
    await tx.insert(memberships).values({
      userId: userId,
      workspaceId: newWorkspace.id,
      role: "owner",
    });

    createdWorkspace = {
      id: newWorkspace.id,
      name: workspaceName,
    };
  });

  return createdWorkspace;
}