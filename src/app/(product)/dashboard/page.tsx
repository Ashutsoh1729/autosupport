import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { NewProjectForm } from "@/components/new-project-form";

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
    <div className="flex flex-1 flex-col items-center px-6 py-8 bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Workspace: {workspace.name}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Projects</h2>
            <NewProjectForm workspaceId={workspace.id} />
          </div>

          {projectRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No projects yet — create one
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {projectRows.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="block rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent"
                  >
                    <p className="font-medium">{project.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
