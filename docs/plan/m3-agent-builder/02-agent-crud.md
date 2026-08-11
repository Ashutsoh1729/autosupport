# M3 Agent Builder — Plan 2: Agent CRUD API

Status: Pending

## Description
Build the REST API for agents: create/read per project, update/delete per agent id, and publish/unpublish. Follow the exact pattern of the M2 knowledge-base routes: tenancy-guarded via a `requireAgentAccess` helper mirroring `requireKnowledgeBaseAccess` in `src/lib/tenancy.ts`. Returns DTOs (no ORM rows leaked to the client).

## Goals
- `GET/POST /api/projects/[projectId]/agents` — list + create (one agent per project; POST upserts if one exists)
- `PUT/DELETE /api/agents/[id]` — update (partial fields) + delete (cascade chunks? no — agent owns no children; just the row)
- `POST /api/agents/[id]/publish` — set status published/draft
- All routes 401/403/404-guarded exactly like `requireKnowledgeBaseAccess`
- `npm run build` passes

## Workflow
Add `requireAgentAccess` to `src/lib/tenancy.ts` → add `GET/POST /api/projects/[projectId]/agents/route.ts` → add `PUT/DELETE /api/agents/[id]/route.ts` → add `POST /api/agents/[id]/publish/route.ts` → curl-test each → build and verify.

## Implementation Steps

### Step 1: Tenancy helper
- [ ] Add `requireAgentAccess(request, agentId)` to `src/lib/tenancy.ts` mirroring `requireKnowledgeBaseAccess`: load agent → load owning project → check membership → return `{ agent }` or `{ response }`
- [ ] Add `requireProjectAccess` reuse for the project-scoped list/create route (already exists)

### Step 2: List + create
- [ ] `GET /api/projects/[projectId]/agents` → `requireProjectAccess`, return `[agent]` (empty array if none)
- [ ] `POST /api/projects/[projectId]/agents` → validate body (name, systemPrompt, guardrails, examplePhrases, voiceId, language, kbIds, topK, similarityThreshold, interruptionSensitivity, endCallKeyword, escalationMessage) → if a draft agent already exists for the project, return 409 with a clear error; the client should PUT instead
- [ ] Return 201 with the created agent (status defaults to draft)

### Step 3: Update + delete
- [ ] `PUT /api/agents/[id]` → `requireAgentAccess`, validate partial body, update only provided fields, return updated agent
- [ ] `DELETE /api/agents/[id]` → `requireAgentAccess`, delete row, return 204
- [ ] Do NOT allow updating `status` via PUT (publish endpoint owns it) — ignore or 400 if present

### Step 4: Publish
- [ ] `POST /api/agents/[id]/publish` with `{ published: boolean }` → set status accordingly
- [ ] Validation: publishing with an empty `systemPrompt` or empty `kbIds` → 400 (cannot publish a shell agent)
- [ ] Return updated agent

### Step 5: Verify
- [ ] curl (or a quick script): create → list → update → publish → 409-on-duplicate-create → delete, each with an authed session and a 401/403 negative case
- [ ] `npm run build` passes
- [ ] Commit with message `feat: agent CRUD + publish API`

---

## Files to Modify
- `src/lib/tenancy.ts` — add `requireAgentAccess`
- `src/app/api/projects/[projectId]/agents/route.ts` — new, GET + POST
- `src/app/api/agents/[id]/route.ts` — new, PUT + DELETE
- `src/app/api/agents/[id]/publish/route.ts` — new, POST

## Functional Components
| Function | File | Role |
|----------|------|------|
| `requireAgentAccess` | `src/lib/tenancy.ts` | Auth + tenancy check for agent routes |
| `GET/POST .../agents` | `src/app/api/projects/[projectId]/agents/route.ts` | List / create agent for a project |
| `PUT/DELETE .../agents/[id]` | `src/app/api/agents/[id]/route.ts` | Update / delete agent |
| `POST .../agents/[id]/publish` | `src/app/api/agents/[id]/publish/route.ts` | Publish / unpublish agent |

## Data Model
- Reads/writes the `agents` table from plan 01. No schema changes here.

## Boundaries
- Internal: `@/lib/tenancy`, `@/lib/db`, `@/lib/db/schema`, Drizzle `eq`/`and`, Next `NextResponse`.
- No UI in this plan. No changes to `agents` table shape.

## Considerations
- "One agent per project" simplifies publish validation and the editor (plan 03) to a single record; revisit only if a future milestone needs multiple agents per project.
- Follow M2's route conventions exactly (folder-per-route, Next 15 params as `Promise<{ id }>` if M2 uses that).
- Keep validation zod-free for now if the codebase doesn't use zod; inline field checks match M2 style.
