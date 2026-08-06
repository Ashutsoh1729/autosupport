# M2 Knowledge Base — Plan 2: Knowledge Base CRUD

Status: Pending

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
- [ ] Add `knowledge_bases` table to `src/lib/db/schema.ts`: `id` (uuid pk), `projectId` (uuid FK → `projects.id`, notNull, onDelete cascade), `name` (text notNull), `createdAt`. Export `KnowledgeBase` type
- [ ] Generate + apply migration (`npm run db:migrate` / `drizzle-kit push`)

### Step 2: Multi-tenancy guard helper
- [ ] Create `src/lib/tenancy.ts` with `requireProjectAccess(projectId)` that: gets session (401), looks up the project → its `workspaceId`, checks `memberships` for the user, returns 403 if not a member, otherwise returns the project row
- [ ] Add `requireKnowledgeBaseAccess(kbId)` that resolves KB → project → workspace → membership using the same helper

### Step 3: Knowledge base API
- [ ] Create `src/app/api/projects/[projectId]/knowledge-bases/route.ts`: `GET` (list, guarded) and `POST` (`{ name }`, validates non-empty, guarded)
- [ ] Create `src/app/api/knowledge-bases/[id]/route.ts`: `PUT` (`{ name }` rename) and `DELETE` (guarded, removes KB + cascades)
- [ ] All handlers use the tenancy helpers; never trust raw ids

### Step 4: Project detail UI
- [ ] Create `src/app/(product)/dashboard/projects/[projectId]/page.tsx` (server component): guard access, query KBs, render list with name + a rename action, a delete button, and a "New knowledge base" form
- [ ] Create `src/components/knowledge-base-forms.tsx` with a client `NewKnowledgeBaseForm` (POST + refresh) and rename/delete controls (PUT/DELETE + refresh)
- [ ] Link each KB card to its source manager page (created in plan 3, stub link for now if not yet present)

### Step 5: Verify
- [ ] Local check: navigate to a project → create a KB → rename it → delete it → list reflects each change
- [ ] Unauthorized user cannot read/create KBs of another workspace (403)
- [ ] `npm run build` passes
- [ ] Commit with message `feat: knowledge base CRUD`

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
