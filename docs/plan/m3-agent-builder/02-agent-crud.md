# M3 Agent Builder — Plan 2: Agent CRUD API

Status: Pending
Branch: plan/m3/02-agent-crud

## Description
Build the REST API for agents: create/read per project, update/delete per agent id, and publish/unpublish. Follow the exact pattern of the M2 knowledge-base routes: tenancy-guarded via a `requireAgentAccess` helper mirroring `requireKnowledgeBaseAccess` in `src/lib/tenancy.ts`. A project can have **multiple** agents (no create-conflict), and each agent carries its own `kbIds`. Returns DTOs (no ORM rows leaked to the client).

## Goals
- `GET/POST /api/projects/[projectId]/agents` — list + create (multiple agents per project allowed; no 409/upsert logic)
- `PUT/DELETE /api/agents/[id]` — update (partial fields) + delete (just the agent row)
- `POST /api/agents/[id]/publish` — set status published/draft
- Validate attached `kbIds` belong to the same project as the agent (KB-project tenancy)
- All routes 401/403/404-guarded exactly like `requireKnowledgeBaseAccess`
- `npm run build` passes

## Workflow
Add `requireAgentAccess` to `src/lib/tenancy.ts` → add `GET/POST /api/projects/[projectId]/agents/route.ts` → add `PUT/DELETE /api/agents/[id]/route.ts` → add `POST /api/agents/[id]/publish/route.ts` → curl-test each → build and verify.

## Implementation Steps

### Step 1: Tenancy helper
- [ ] Add `requireAgentAccess(request, agentId)` to `src/lib/tenancy.ts` mirroring `requireKnowledgeBaseAccess`: load agent → load owning project → check membership → return `{ agent }` or `{ response }`
- [ ] Add `requireProjectAccess` reuse for the project-scoped list/create route (already exists)

### Step 2: List + create
- [ ] `GET /api/projects/[projectId]/agents` → `requireProjectAccess`, return `Agent[]` (empty array if none)
- [ ] `POST /api/projects/[projectId]/agents` → validate body (name, systemPrompt, guardrails, examplePhrases, voiceId, language, kbIds, topK, similarityThreshold, interruptionSensitivity, endCallKeyword, escalationMessage) → **no duplicate-create conflict**: multiple agents per project is allowed, always create a new row
- [ ] Validate supplied `kbIds` all belong to this project (select knowledge_bases where projectId = this project and id in kbIds; if any missing → 400)
- [ ] Return 201 with the created agent (status defaults to draft)

### Step 3: Update + delete
- [ ] `PUT /api/agents/[id]` → `requireAgentAccess`, validate partial body, update only provided fields, return updated agent
- [ ] If body has `kbIds`, validate against the project's KBs (same check as create)
- [ ] `DELETE /api/agents/[id]` → `requireAgentAccess`, delete row, return 204
- [ ] Do NOT allow updating `status` via PUT (publish endpoint owns it) — ignore or 400 if present

### Step 4: Publish
- [ ] `POST /api/agents/[id]/publish` with `{ published: boolean }` → set status accordingly
- [ ] Validation: publishing with an empty `systemPrompt` or empty `kbIds` → 400 (cannot publish a shell agent)
- [ ] Return updated agent

### Step 5: Verify
- [ ] curl (or a quick script): create two agents on one project → list shows both → update each → publish → delete, per agent id, with an authed session and a 401/403 negative case
- [ ] Negative: create/update with a `kbId` from a different project → 400
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
- Multiple agents per project is core to M3: never treat projectId as unique; every agent route works by `[id]`.
- `kbIds` cross-project validation relies on `requireAgentAccess`'s project resolution + a project-KB check; reuse the knowledge-bases query in `requireKnowledgeBaseAccess` if possible.
- Follow M2's route conventions exactly (folder-per-route, Next 15 params as `Promise<{ id }>` if M2 uses that).
- Keep validation zod-free for now if the codebase doesn't use zod; inline field checks match M2 style.
