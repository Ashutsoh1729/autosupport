import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, memberships, projects } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { SignOutButton } from "@/components/sign-out-button";
import { NewProjectForm } from "@/components/new-project-form";

type WorkspaceInfo = {
  id: string;
  name: string;
};

async function getOrCreateWorkspace(
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

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const workspace = await getOrCreateWorkspace(
    session.user.id,
    session.user.name,
  );

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id))
    .orderBy(asc(projects.createdAt));

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
      <main className="flex flex-1 flex-col items-center px-6 py-8">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Workspace: {workspace.name}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as {session.user.email}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Projects
              </h2>
              <NewProjectForm workspaceId={workspace.id} />
            </div>

            {projectRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No projects yet — create one
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {projectRows.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {project.name}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
