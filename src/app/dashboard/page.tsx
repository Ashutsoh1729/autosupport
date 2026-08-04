import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SignOutButton } from "@/components/sign-out-button";

type WorkspaceInfo = {
  id: string;
  name: string;
};

async function getOrCreateWorkspace(userId: string, userName: string | null): Promise<WorkspaceInfo> {
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
  const workspaceName = userName
    ? `${userName}'s Workspace`
    : "My Workspace";

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

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link
          href="/"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          AutoSupport
        </Link>
        <SignOutButton />
      </header>

      {/* Dashboard content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-md flex-col gap-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Workspace: {workspace.name}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {session.user.email}
          </p>
        </div>
      </main>
    </div>
  );
}
