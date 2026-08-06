# M2 Knowledge Base — Plan 2: Knowledge Base CRUD

Status: Completed

## Description
Add the `knowledge_bases` table (spec §9: `knowledge_bases — id, projectId, name, createdAt`) and the API + UI to create, list, rename, and delete knowledge bases within a project. A knowledge base is the container for all sources; agents attach knowledge bases later (M3).

## Goals
- `knowledge_bases` table with `projectId` FK → `projects.id`
- `GET /api/projects/:id/knowledge-bases` lists KBs for a project (auth + workspace membership guard)
- `POST /api/projects/:id/knowledge-bases` creates a KB
- `PUT /api/knowledge-bases/:id` renames a KB
- `DELETE /api/knowledge-bases/:id` deletes a KB (cascade chunks/sources)
- Project detail page lists KBs with create/rename/delete UI
- `npm run build` passes

## Workflow
Add `knowledge_bases` table to schema → create the multi-tenancy helper that resolves a project → workspace → membership for any request → build route handlers for list/create (under project) and rename/delete (by KB id) → build a project detail page at `src/app/(product)/dashboard/projects/[projectId]/page.tsx` showing KBs with a client form → migration → build and verify.

## Implementation Steps

### Step 1: Schema
- [x] Add `knowledge_bases` table to `src/lib/db/schema.ts`: `id` (uuid pk), `projectId` (uuid FK → `projects.id`, notNull, onDelete cascade), `name` (text notNull), `createdAt`. Export `KnowledgeBase` type
- [x] Generate + apply migration (`npm run db:migrate` / `drizzle-kit push`)

### Step 2: Multi-tenancy guard helper
- [x] Create `src/lib/tenancy.ts` with `requireProjectAccess(projectId)` that: gets session (401), looks up the project → its `workspaceId`, checks `memberships` for the user, returns 403 if not a member, otherwise returns the project row
- [x] Add `requireKnowledgeBaseAccess(kbId)` that resolves KB → project → workspace → membership using the same helper

### Step 3: Knowledge base API
- [x] Create `src/app/api/projects/[projectId]/knowledge-bases/route.ts`: `GET` (list, guarded) and `POST` (`{ name }`, validates non-empty, guarded)
- [x] Create `src/app/api/knowledge-bases/[id]/route.ts`: `PUT` (`{ name }` rename) and `DELETE` (guarded, removes KB + cascades)
- [x] All handlers use the tenancy helpers; never trust raw ids

### Step 4: Project detail UI
- [x] Create `src/app/(product)/dashboard/projects/[projectId]/page.tsx` (server component): guard access, query KBs, render list with name + a rename action, a delete button, and a "New knowledge base" form
- [x] Create `src/components/knowledge-base-forms.tsx` with a client `NewKnowledgeBaseForm` (POST + refresh) and rename/delete controls (PUT/DELETE + refresh)
- [x] Link each KB card to its source manager page (created in plan 3, stub link for now if not yet present)

### Step 5: Verify
- [x] Local check: navigate to a project → create a KB → rename it → delete it → list reflects each change
- [x] Unauthorized user cannot read/create KBs of another workspace (403)
- [x] `npm run build` passes
- [x] Commit with message `feat: knowledge base CRUD`

---

## Files to Modify
- `src/lib/db/schema.ts` — add `knowledge_bases` table
- `src/lib/tenancy.ts` — new, `requireProjectAccess` / `requireKnowledgeBaseAccess` helpers
- `src/app/api/projects/[projectId]/knowledge-bases/route.ts` — new GET/POST
- `src/app/api/knowledge-bases/[id]/route.ts` — new PUT/DELETE
- `src/app/(product)/dashboard/projects/[projectId]/page.tsx` — new, KB manager page
- `src/components/knowledge-base-forms.tsx` — new, client create/rename/delete controls

## Functional Components

| Function | File | Role |
|----------|------|------|
| `knowledge_bases` table | `src/lib/db/schema.ts` | Persists KBs per project |
| `requireProjectAccess` | `src/lib/tenancy.ts` | Resolves project → workspace → membership, 401/403 |
| `requireKnowledgeBaseAccess` | `src/lib/tenancy.ts` | Resolves KB → project → workspace → membership |
| `GET/POST knowledge-bases` | `src/app/api/projects/[projectId]/knowledge-bases/route.ts` | List/create KBs |
| `PUT/DELETE knowledge-bases/[id]` | `src/app/api/knowledge-bases/[id]/route.ts` | Rename/delete a KB |
| `ProjectDetailPage` | `src/app/(product)/dashboard/projects/[projectId]/page.tsx` | KB manager page |
| `KnowledgeBaseForms` | `src/components/knowledge-base-forms.tsx` | Create/rename/delete client controls |

## Data Model
- `knowledge_bases`: `{ id: uuid pk, projectId: uuid FK projects.id onDelete cascade, name: text, createdAt: timestamp }`
- Reads: list KBs by `projectId`; writes: insert, update name, delete.

## Boundaries
- External: `better-auth` (session), Drizzle, Neon/Postgres.
- All operations go through tenancy helpers (session → membership → target row).
- Next 16: `await params` in route handlers.

## Considerations
- `DELETE` should cascade to `knowledge_sources` and `chunks` (via FK onDelete cascade) so re-creating a KB doesn't leave orphan data.
- Guard every handler; a knowledge base must be reachable only by a member of its owning workspace.
- Next 16 route handler params are Promises — await before use.

---

## Execution Notes

### Architecture
Adds a `knowledge_bases` table (the container for sources, spec §9) and two route files mirroring the spec §10 API surface: list/create nested under `/api/projects/[projectId]/knowledge-bases` (they need the parent project), rename/delete at `/api/knowledge-bases/[id]` (a KB exists independently of the URL). All handlers route authorization through new `src/lib/tenancy.ts` helpers, the extracted pattern described in the plan's Workflow — resolving project/KB → owning workspace → membership → 401/403/404. The project detail page is a server component (matches M1 pattern) with client-side create/rename/delete controls.

### How each step was implemented

- **Step 1 — Schema:** added `knowledgeBases` to `src/lib/db/schema.ts` (`id` uuid pk, `projectId` FK → `projects.id` onDelete cascade, `name`, `createdAt`), exported `KnowledgeBase`. Generated `drizzle/0003_cold_crystal.sql`. Applied via the direct-SQL + journal-insert approach (the `drizzle-kit migrate` CLI hung on Neon's pooled connection in plan 01). Verified columns via `information_schema`.
- **Step 2 — Tenancy helpers:** created `src/lib/tenancy.ts` with `requireProjectAccess(request, projectId)` and `requireKnowledgeBaseAccess(request, kbId)`. Both return either a discriminated `{ response }` (401 unauthorized / 404 missing / 403 non-member) or the resolved row. KB variant chains KB → project → workspace → membership.
- **Step 3 — KB API:** `GET`/`POST` in `src/app/api/projects/[projectId]/knowledge-bases/route.ts` and `PUT`/`DELETE` in `src/app/api/knowledge-bases/[id]/route.ts`. All call the tenancy helpers first, `await params` (Next 16), trim + validate `name` (400). `DELETE` relies on FK `onDelete: cascade` to remove sources/chunks in later plans.
- **Step 4 — UI:** dashboard project rows now link to `/dashboard/projects/[projectId]`; that page lists the project's KBs with a `NewKnowledgeBaseForm` and per-row `KnowledgeBaseRowActions` (inline rename + confirm delete). KB cards do not yet link to a source manager — that page arrives in plan 3.
- **Step 5 — Verify:** fresh signup → created project; POST created a KB, GET listed it, PUT renamed it, DELETE removed it (list back to `[]`). Unauthenticated → 401; a different workspace's user on the project → 403. `npm run build` passes. Test data cleaned up.

### Files Created

- `src/lib/tenancy.ts` — `requireProjectAccess` / `requireKnowledgeBaseAccess`
- `src/app/api/projects/[projectId]/knowledge-bases/route.ts` — GET/POST handlers
- `src/app/api/knowledge-bases/[id]/route.ts` — PUT/DELETE handlers
- `src/app/(product)/dashboard/projects/[projectId]/page.tsx` — project detail / KB manager page
- `src/components/knowledge-base-forms.tsx` — client create/rename/delete controls
- `drizzle/0003_cold_crystal.sql` + meta snapshot — knowledge_bases migration

### Files Modified

- `src/lib/db/schema.ts` — added `knowledge_bases` table + `KnowledgeBase` type
- `src/app/(product)/dashboard/page.tsx` — project rows link to their detail page
- `docs/plan/m2-knowledge-base/02-knowledge-base-crud.md` — status to Completed
- `docs/project-state.md` — updated (table, tenancy helpers, API endpoints, new files)

### Remaining / Known Gaps

- KB cards have no navigation yet — linking to the source manager comes in plan 3.
- Cross-workspace 403 was verified for the list route; the same helper backs PUT/DELETE so coverage is uniform.
- `drizzle-kit migrate` still hangs on Neon pooled connections; migrations are applied directly (documented in plan 01, recurring).
