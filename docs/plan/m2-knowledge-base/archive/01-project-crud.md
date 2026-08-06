# M2 Knowledge Base — Plan 1: Project CRUD

Status: Completed

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
- [x] Add `projects` table to `src/lib/db/schema.ts`: `id` (uuid pk default), `workspaceId` (uuid FK → `workspaces.id`, notNull), `name` (text notNull), `createdAt` (timestamp default now). Export `Project` type via `$inferSelect`
- [x] Generate migration with `npx drizzle-kit generate`, review, and apply with `npm run db:migrate` (or `drizzle-kit push` per M1 convention)

### Step 2: Default project on signup
- [x] In `src/lib/auth.ts` `databaseHooks.user.create.after`, inside the existing `db.transaction`, after creating the workspace + membership, also insert a `projects` row with `name: "Default Project"` linked to the new workspace id
- [x] Keep the hook idempotent (skip project creation if the workspace already existed)

### Step 3: Projects API
- [x] Create `src/app/api/workspaces/[workspaceId]/projects/route.ts` with `GET` and `POST`
- [x] Shared auth guard: call `auth.api.getSession({ headers })`, return 401 if no session; verify the user is a member of `workspaceId` via a `memberships` query, return 403 if not
- [x] `POST` accepts `{ name }`, validates non-empty name, inserts project, returns 201 with the row
- [x] `GET` returns all projects for the workspace ordered by `createdAt`

### Step 4: Dashboard UI
- [x] Update `src/app/(product)/dashboard/page.tsx` to also query projects for the workspace (Drizzle `select` from `projects` where `workspaceId`)
- [x] Render the project list under the workspace info; add a small client component `src/components/new-project-form.tsx` that POSTs to `/api/workspaces/:id/projects` and refreshes (use `router.refresh()`)
- [x] Show an empty state ("No projects yet — create one")

### Step 5: Verify
- [x] Local check: sign up fresh → dashboard shows workspace + "Default Project"; create a second project via the form → appears in the list
- [x] `npm run build` passes
- [x] Commit with message `feat: project CRUD`

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

---

## Execution Notes

### Architecture
Adds a `projects` table owned by a workspace (multi-tenant at workspace level), a default project created via the existing Better Auth signup hook, a REST resource nested under `/api/workspaces/[workspaceId]/projects`, and a dashboard that lists projects with a client create form. Auth is enforced inside the route handlers (session → membership check), consistent with the M1 pattern and Next 16's guidance to verify auth per-route rather than rely on proxy/middleware.

### How each step was implemented

- **Step 1 — Schema:** added `projects` to `src/lib/db/schema.ts` (`id` uuid pk default, `workspaceId` FK → `workspaces.id` onDelete cascade, `name`, `createdAt`) and exported the `Project` type. Generated `drizzle/0002_melodic_dracula.sql` with `drizzle-kit generate`; the CLI `migrate` hung on the Neon pooler, so the migration SQL was applied directly via a scripted transaction plus a `__drizzle_migrations` journal insert. Verified columns via `information_schema`.
- **Step 2 — Default project on signup:** extended `databaseHooks.user.create.after` inside the existing `db.transaction`, inserting a `projects` row (`name: "Default Project"`) after the workspace + membership, reusing the same idempotency guard (early-return if the user already has a workspace).
- **Step 3 — Projects API:** new `GET`/`POST` handlers in `src/app/api/workspaces/[workspaceId]/projects/route.ts`. Both call `auth.api.getSession`, return 401 if unauthenticated, verify ownership via a `memberships` lookup returning 403 otherwise, `await params` per Next 16. `POST` trims + validates `name` (400 if missing), inserts, returns 201. `GET` orders by `createdAt` asc.
- **Step 4 — Dashboard UI:** updated `src/app/(product)/dashboard/page.tsx` to query the workspace's projects and render them under the workspace header with an empty state; added `src/components/new-project-form.tsx` (client) that POSTs and calls `router.refresh()`.
- **Step 5 — Verify:** fresh signup created a workspace + "Default Project" (confirmed via DB query); API GET listed the default, POST created "Second Project"; unauthenticated → 401, blank name → 400; `npm run build` passed. Test data cleaned up.

### Files Created

- `src/app/api/workspaces/[workspaceId]/projects/route.ts` — GET/POST projects handlers
- `src/components/new-project-form.tsx` — client "New Project" form
- `drizzle/0002_melodic_dracula.sql` + meta snapshot — projects table migration

### Files Modified

- `src/lib/db/schema.ts` — added `projects` table + `Project` type
- `src/lib/auth.ts` — default project on the signup hook
- `src/app/(product)/dashboard/page.tsx` — project list + create form + empty state
- `docs/plan/m2-knowledge-base/01-project-crud.md` — status to Completed
- `docs/project-state.md` — updated (projects table, new API endpoints, new files)

### Remaining / Known Gaps

- `drizzle-kit migrate` hung on the Neon pooled connection; migrations applied manually. Revisit if subsequent plans hit the same issue.
- Project detail page (knowledge bases, plan 02) is next; projects are currently flat rows with no navigation.
- The stale seed workspace from M1 manual testing remains (left untouched; it predates the projects table).
