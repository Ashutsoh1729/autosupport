# M2 Knowledge Base — Plan 1: Project CRUD

Status: Pending

## Description
Add the `projects` table (spec §9: `projects — id, workspaceId, name, createdAt`), create a default project for the workspace on signup, and build the workspace dashboard's project list + create project API and UI. Every project belongs to a workspace, preserving multi-tenant isolation.

## Goals
- `projects` table in the Drizzle schema with `workspaceId` FK → `workspaces.id`
- Signup creates a default project (named e.g. "Default Project") in the same transaction as the workspace
- `GET /api/workspaces/:id/projects` lists projects for a workspace (auth + membership-scoped)
- `POST /api/workspaces/:id/projects` creates a project (auth + membership-scoped)
- Dashboard page lists the user's projects and has a "New Project" form
- `npm run build` passes

## Workflow
Define the `projects` table in `src/lib/db/schema.ts` → extend the Better Auth `databaseHooks.user.create.after` hook in `src/lib/auth.ts` to also insert a default project inside the existing transaction → add route handlers `src/app/api/workspaces/[workspaceId]/projects/route.ts` (GET + POST) with a session + membership guard → update `src/app/(product)/dashboard/page.tsx` to query and list projects and add a client form to create one → generate + run a Drizzle migration → build and verify.

## Implementation Steps

### Step 1: Schema
- [ ] Add `projects` table to `src/lib/db/schema.ts`: `id` (uuid pk default), `workspaceId` (uuid FK → `workspaces.id`, notNull), `name` (text notNull), `createdAt` (timestamp default now). Export `Project` type via `$inferSelect`
- [ ] Generate migration with `npx drizzle-kit generate`, review, and apply with `npm run db:migrate` (or `drizzle-kit push` per M1 convention)

### Step 2: Default project on signup
- [ ] In `src/lib/auth.ts` `databaseHooks.user.create.after`, inside the existing `db.transaction`, after creating the workspace + membership, also insert a `projects` row with `name: "Default Project"` linked to the new workspace id
- [ ] Keep the hook idempotent (skip project creation if the workspace already existed)

### Step 3: Projects API
- [ ] Create `src/app/api/workspaces/[workspaceId]/projects/route.ts` with `GET` and `POST`
- [ ] Shared auth guard: call `auth.api.getSession({ headers })`, return 401 if no session; verify the user is a member of `workspaceId` via a `memberships` query, return 403 if not
- [ ] `POST` accepts `{ name }`, validates non-empty name, inserts project, returns 201 with the row
- [ ] `GET` returns all projects for the workspace ordered by `createdAt`

### Step 4: Dashboard UI
- [ ] Update `src/app/(product)/dashboard/page.tsx` to also query projects for the workspace (Drizzle `select` from `projects` where `workspaceId`)
- [ ] Render the project list under the workspace info; add a small client component `src/components/new-project-form.tsx` that POSTs to `/api/workspaces/:id/projects` and refreshes (use `router.refresh()`)
- [ ] Show an empty state ("No projects yet — create one")

### Step 5: Verify
- [ ] Local check: sign up fresh → dashboard shows workspace + "Default Project"; create a second project via the form → appears in the list
- [ ] `npm run build` passes
- [ ] Commit with message `feat: project CRUD`

---

## Files to Modify
- `src/lib/db/schema.ts` — add `projects` table + `Project` type
- `src/lib/auth.ts` — default project on signup hook
- `src/app/api/workspaces/[workspaceId]/projects/route.ts` — new GET/POST handlers
- `src/app/(product)/dashboard/page.tsx` — project list + create form
- `src/components/new-project-form.tsx` — new, client create form

## Functional Components

| Function | File | Role |
|----------|------|------|
| `projects` table | `src/lib/db/schema.ts` | Persists projects per workspace |
| `auth` (databaseHooks) | `src/lib/auth.ts` | Creates default project on signup |
| `GET / POST projects` | `src/app/api/workspaces/[workspaceId]/projects/route.ts` | List/create projects with membership guard |
| `DashboardPage` | `src/app/(product)/dashboard/page.tsx` | Lists projects for the workspace |
| `NewProjectForm` | `src/components/new-project-form.tsx` | Client form to create a project |

## Data Model
- `projects`: `{ id: uuid pk, workspaceId: uuid FK workspaces.id, name: text, createdAt: timestamp }`
- Written on signup and via POST; read on dashboard and GET endpoint.

## Boundaries
- External: `better-auth` (session), Drizzle, Neon/Postgres.
- All project queries/inserts are scoped by `workspaceId` resolved from the authenticated user's membership.
- Route handler params follow Next.js App Router convention: `params` is a `Promise` in Next 16 (await it).

## Considerations
- Multi-tenant isolation: never accept a raw `workspaceId` without checking membership.
- Next 16 route handler: `await params` before reading `params.workspaceId`.
- Default project keeps the "sign up → see a project" demo story intact (spec flow 1).
