import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar, SidebarProject } from "@/components/dashboard-sidebar";
import { SignOutButton } from "@/components/sign-out-button";

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

  const sidebarProjects: SidebarProject[] = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <SidebarProvider>
      <DashboardSidebar
        workspaceName={workspace.name}
        projects={sidebarProjects}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <p className="text-sm text-muted-foreground">
              Signed in as {session.user.email}
            </p>
          </div>
          <SignOutButton />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
