# M2 Knowledge Base — Plan 5: Dashboard UI (shadcn Sidebar + Dialog)

Status: Pending

## Description
Polish the dashboard UI with shadcn/ui components. Two goals: (1) replace the inline "New Project" form with a shadcn `Dialog` modal that opens on button click and asks for a project name, and (2) restructure the dashboard into a shadcn `Sidebar` layout so all dashboard-related navigation (workspace info, projects list, and future M2 pages: KBs, sources, test panel) lives in a sidebar. Run this plan **last** in M2, after plans 02–04, so the sidebar has real destinations to link to.

## Goals
- shadcn/ui configured for the project (Tailwind v4 compatible init, `components.json`, deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/*`)
- "New Project" button opens a shadcn `Dialog` modal with a project name input; submitting POSTs to `/api/workspaces/:id/projects` and refreshes the list
- Dashboard reorganized into a shadcn `Sidebar` layout: workspace name in the header, nav items for projects and (where applicable) KBs/sources/test panel
- Existing dashboard content (project list, empty state, sign-out) preserved inside the new layout
- `npm run build` passes

## Workflow
Init shadcn (Tailwind v4: `npx shadcn@latest init` with base color, then `npx shadcn@latest add sidebar dialog button input` — or hand-write the components if the CLI prompts block) → refactor `src/components/new-project-form.tsx` to render a `Dialog` (trigger button opens modal, form inside the modal body) → create `src/components/dashboard-sidebar.tsx` (client, `SidebarProvider`/`SidebarInset` from shadcn) → restructure `src/app/(product)/dashboard/page.tsx` to wrap content in the sidebar layout, keeping the project list + empty state in the main inset → build and verify.

## Implementation Steps

### Step 1: shadcn setup
- [ ] Run shadcn init for Tailwind v4 (verify CLI path works; if prompts block automation, hand-create `components.json`, `src/lib/utils.ts` with `cn()`, and add `@theme`/CSS vars for the shadcn palette in `src/app/globals.css`)
- [ ] Add deps used by the components: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and the `@radix-ui/*` packages pulled in by `sidebar`, `dialog`, `button`, `input`
- [ ] Generate `src/components/ui/sidebar.tsx`, `dialog.tsx`, `button.tsx`, `input.tsx` (via `shadcn add` or committed shadcn sources), plus `src/lib/utils.ts` `cn()`

### Step 2: New Project dialog
- [ ] Rewrite `src/components/new-project-form.tsx` to use shadcn `Dialog`: a `Button` trigger ("New Project") opens the modal; inside: `DialogHeader`/`DialogTitle`, an `Input` bound to name state, and a submit `Button`; on submit POST to `/api/workspaces/${workspaceId}/projects`, close modal on success, `router.refresh()`
- [ ] Keep error handling: show API error inside the dialog (not the page), disable submit while pending

### Step 3: Sidebar layout
- [ ] Create `src/components/dashboard-sidebar.tsx` (client) using shadcn `SidebarProvider` + `Sidebar` (or a simpler layout if the generated sidebar is heavy): header with app name + workspace name, nav section "Projects" listing the project names, footer with `SignOutButton`
- [ ] Add a mobile-friendly toggle (shadcn `SidebarTrigger`) so the sidebar collapses on small screens
- [ ] Pass the projects list + workspace name into the sidebar from the server page (props)

### Step 4: Restructure dashboard page
- [ ] Update `src/app/(product)/dashboard/page.tsx` to render the `SidebarProvider` + `DashboardSidebar` wrapping a `SidebarInset`/main area
- [ ] Keep the project list (with links to project detail pages if plan 02 has created them, else plain rows) + empty state in the main inset; remove the old inline header/form
- [ ] Place the "New Project" `Dialog` trigger in the main inset (or sidebar footer) so it stays reachable

### Step 5: Verify
- [ ] Local check: dashboard shows sidebar with workspace name + projects; "New Project" opens a modal; creating a project closes modal and the new project appears in the sidebar + list
- [ ] Responsive check: sidebar collapses to a toggle on narrow viewport
- [ ] `npm run build` passes
- [ ] Commit with message `feat: shadcn dashboard UI (sidebar + dialog)`

---

## Files to Modify
- `src/components/new-project-form.tsx` — rewrite to use `Dialog`
- `src/components/dashboard-sidebar.tsx` — new, shadcn sidebar layout
- `src/app/(product)/dashboard/page.tsx` — wrap in sidebar layout, keep project list
- `src/components/ui/*` — new shadcn components (`sidebar`, `dialog`, `button`, `input`)
- `src/lib/utils.ts` — new, `cn()` helper
- `src/app/globals.css` — shadcn CSS variables (if not applied by init)
- `components.json` — new, shadcn config
- `package.json` — shadcn deps

## Functional Components

| Function | File | Role |
|----------|------|------|
| `NewProjectForm` | `src/components/new-project-form.tsx` | Opens a Dialog; creates project via API |
| `DashboardSidebar` | `src/components/dashboard-sidebar.tsx` | Sidebar nav: workspace + projects + sign out |
| `DashboardPage` | `src/app/(product)/dashboard/page.tsx` | Server page wrapping content in sidebar layout |
| `cn` | `src/lib/utils.ts` | Tailwind class merge helper |

## Data Model
- No schema changes. Reuses `projects` (id, name, workspaceId) read on the dashboard; POST payload `{ name }`.

## Boundaries
- External: shadcn/ui (Radix primitives), `next/navigation` (`useRouter`/`usePathname`), same projects API from plan 01.
- Sidebar is a client component fed by server-rendered props; navigation via Next `Link`.

## Considerations
- Run after plans 02–04 so sidebar nav can link to real KB/source/test routes.
- shadcn CLI may prompt interactively; if it can't run headless in CI/execution, hand-write the shadcn components from their published sources and set up `components.json` + `cn()` manually.
- Tailwind v4: shadcn uses CSS variables — ensure they're wired into `globals.css` (`@theme` / `:root`).
- Keep the demo friendly: modal makes "add project" discoverable, sidebar makes the multi-page M2 dashboard navigable.
