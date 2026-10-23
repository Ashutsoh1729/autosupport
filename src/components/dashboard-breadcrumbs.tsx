"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Crumb = {
  label: string;
  href?: string;
};

function buildCrumbs(
  pathname: string,
  projectNames: Record<string, string>,
): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/dashboard" }];

  // /dashboard/projects/[projectId]
  if (parts[1] === "projects" && parts[2]) {
    const projectId = parts[2];
    const projectLabel = projectNames[projectId] ?? projectId.slice(0, 8);
    const isKbPage = parts[3] === "knowledge-bases" && parts[4];

    crumbs.push({
      label: projectLabel,
      href: isKbPage ? `/dashboard/projects/${projectId}` : undefined,
    });

    // /dashboard/projects/[projectId]/knowledge-bases/[kbId]
    if (isKbPage) {
      crumbs.push({
        label: parts[4]!.slice(0, 8),
      });
    }
  }

  return crumbs;
}

export function DashboardBreadcrumbs({
  projectNames = {},
}: {
  projectNames?: Record<string, string>;
}) {
  const pathname = usePathname();
  const crumbs = useMemo(
    () => buildCrumbs(pathname ?? "", projectNames),
    [pathname, projectNames],
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
