import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projects, knowledgeBases } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { getOrCreateWorkspace } from "@/lib/auth/workspace";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar, SidebarProject } from "@/components/dashboard-sidebar";
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const sidebarProjects: SidebarProject[] = projectRows.map((project) => ({
    id: project.id,
    name: project.name,
  }));

  const projectNames = Object.fromEntries(
    sidebarProjects.map((p) => [p.id, p.name]),
  );

  const projectIds = projectRows.map((p) => p.id);
  const kbRows = projectIds.length
    ? await db
        .select({ id: knowledgeBases.id, name: knowledgeBases.name })
        .from(knowledgeBases)
        .where(inArray(knowledgeBases.projectId, projectIds))
    : [];
  const kbNames = Object.fromEntries(kbRows.map((kb) => [kb.id, kb.name]));

  return (
    <SidebarProvider>
      <DashboardSidebar
        workspaceName={workspace.name}
        projects={sidebarProjects}
      />
      <SidebarInset className="bg-zinc-50 dark:bg-black">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <DashboardBreadcrumbs
            projectNames={projectNames}
            kbNames={kbNames}
          />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
