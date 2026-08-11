"use client";

import Link from "next/link";
import { FolderIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/sign-out-button";

export type SidebarProject = {
  id: string;
  name: string;
};

export function DashboardSidebar({
  workspaceName,
  projects,
}: {
  workspaceName: string;
  projects: SidebarProject[];
}) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex flex-col gap-1 px-2 py-1">
          <Link href="/" className="text-base font-semibold">
            AutoSupport
          </Link>
          <p className="text-xs text-muted-foreground">{workspaceName}</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.length === 0 ? (
                <SidebarMenuItem>
                  <span className="px-2 text-sm text-muted-foreground">
                    No projects yet
                  </span>
                </SidebarMenuItem>
              ) : (
                projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <FolderIcon />
                        <span>{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SignOutButton />
      </SidebarFooter>
    </Sidebar>
  );
}