# Plan: Move dashboard shell (sidebar) into a shared layout

Status: ✔ Approved — implement next (not yet done)

## Goal

Give every page under `/dashboard/**` a consistent layout by moving the
`SidebarProvider → DashboardSidebar → SidebarInset` shell into a shared
`dashboard/layout.tsx`, and remove the duplicated custom top navbars from the
child pages.

## Problem

Currently the shell is duplicated differently across routes:

- **`dashboard/page.tsx`** — renders `SidebarProvider` + `DashboardSidebar` + `SidebarInset` itself.
- **`projects/[projectId]/page.tsx`** — no sidebar; has its own top navbar with
  "← Projects" back link, "AutoSupport" brand link, and `SignOutButton`.
- **`knowledge-bases/[kbId]/page.tsx`** — same as above, top navbar with "← Project" back link, brand, `SignOutButton`.

The child pages' navbars duplicate what the sidebar already provides:

| Item in child navbar            | In sidebar? |
| ------------------------------- | ----------- |
| "AutoSupport" brand link        | Yes (SidebarHeader) |
| Workspace name                  | Yes (SidebarHeader) |
| Project navigation               | Yes (project list links) |
| `SignOutButton`                 | Yes (SidebarFooter) |

Only the **back link** is unique to the child navbars.

## Approach

1. **Create `src/app/(product)/dashboard/layout.tsx`** (async server component):
   - Auth check → `redirect("/login")` if no session.
   - `getOrCreateWorkspace` → workspace id + name.
   - Query project rows for the workspace.
   - Render:
     ```
     SidebarProvider
       DashboardSidebar (workspaceName, projects)
       SidebarInset
         header (SidebarTrigger + something, e.g. signed-in email)
         {children}
     ```
   - Keep the `getOrCreateWorkspace` helper here (moved out of `dashboard/page.tsx`).

2. **Strip `dashboard/page.tsx`** down to just its `<main>` content (title, project list, form). Remove the shell + redundant fetches it no longer owns.

3. **Strip `projects/[projectId]/page.tsx`**:
   - Remove the custom `<header>` navbar (back link, brand, `SignOutButton`).
   - Keep the server-side queries and `<main>` content.
   - Optionally add a lightweight "← Back" breadcrumb/link inside the content for back navigation.

4. **Strip `knowledge-bases/[kbId]/page.tsx`**:
   - Remove the custom `<header>` navbar.
   - Keep queries + `<main>` content.
   - Back navigation covered by the sidebar (project list) or a small in-content link.

## Notes / side effects

- The KB detail page also inherits the layout — this is intended (consistency).
- Parent route segment `(product)` has **no layout file yet**; a
  `dashboard/layout.tsx` is the natural home for this shell.
- Navbar removal means back navigation relies on the sidebar project list;
  if a prominent back affordance is wanted, add a small breadcrumb in content
  instead of a full header bar.
