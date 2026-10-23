import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getOrCreateWorkspace } from "@/lib/auth/workspace";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar, SidebarProject } from "@/components/dashboard-sidebar";

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

  return (
    <SidebarProvider>
      <DashboardSidebar
        workspaceName={workspace.name}
        projects={sidebarProjects}
      />
      <SidebarInset className="bg-zinc-50 dark:bg-black">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <p className="text-sm text-muted-foreground">
            Signed in as {session.user.email}
          </p>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
