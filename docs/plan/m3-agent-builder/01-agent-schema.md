# M3 Agent Builder — Plan 1: Agent Schema

Status: Pending
Branch: plan/m3/01-agent-schema

## Description
Add the `agents` table to the Drizzle schema plus a migration. Agents scope under `projects` exactly like `knowledgeBases`, and each project can host **multiple** agents (spec §6.1/§6.3). Each agent attaches its own subset of the project's knowledge bases via a `kbIds` array. Do **not** follow spec §9's outdated `workspaceId`/flat-`kbIds` sketch, which predates the project-scoped implementation.

## Goals
- `agents` table modeled on `knowledgeBases` (project-scoped, tenancy via project → workspace); multiple agents per project allowed (no unique constraint on projectId)
- Columns: id, projectId, name, systemPrompt, guardrails, examplePhrases, voiceId, language, kbIds, retrieval settings, behavior settings, status (draft|published), timestamps
- Migration generated/verified against the Drizzle + Neon setup used by M1/M2
- `npm run build` passes

## Workflow
Add the table + types in `src/lib/db/schema.ts` → generate a migration (same Drizzle migration workflow as M1/M2) → export the new select type → build and verify.

## Implementation Steps

### Step 1: Schema
- [ ] Add `agents` to `src/lib/db/schema.ts` after `knowledgeBases` (project-scoped, `references(() => projects.id, { onDelete: "cascade" })`)
- [ ] Columns: `id` (uuid pk defaultRandom), `projectId` (uuid notNull), `name` (text notNull, default `"Support Agent"`), `systemPrompt` (text notNull, default empty), `guardrails` (text notNull, default empty), `examplePhrases` (text[] notNull, default empty array), `voiceId` (text notNull, default `"aura-asteria-en"`), `language` (text notNull, default `"en"`), `kbIds` (uuid[] notNull, default empty array), `topK` (integer notNull, default 4), `similarityThreshold` (real notNull, default 0.3), `interruptionSensitivity` (text notNull, default `"medium"`), `endCallKeyword` (text notNull, default `"end call"`), `escalationMessage` (text notNull, default empty), `status` (text enum `["draft", "published"]` notNull default `"draft"`), `createdAt`, `updatedAt` (timestamp defaultNow/onUpdate)
- [ ] Add index on `projectId` (no unique constraint — multiple agents per project)
- [ ] Export `Agent` select type alongside the existing `$inferSelect` types

### Step 2: Migration
- [ ] Generate and apply the migration using the same Drizzle commands as M1/M2 (check `package.json` scripts)
- [ ] Verify the table exists and pgvector-free (plain text/array columns only)

### Step 3: Verify
- [ ] `npm run build` passes
- [ ] Commit with message `feat: agent schema + migration`

---

## Files to Modify
- `src/lib/db/schema.ts` — add `agents` table + `Agent` type
- `drizzle/*` — new migration (one file)

## Functional Components
- `Agent` select type — server-side row type used by the CRUD API (plan 02) and editor UI (plan 03)

## Data Model
- `agents` — id, projectId (FK → projects, cascade, multiple rows allowed per project), name, systemPrompt, guardrails, examplePhrases (text[]), voiceId, language, kbIds (uuid[]), topK (int), similarityThreshold (real), interruptionSensitivity, endCallKeyword, escalationMessage, status (draft|published), createdAt, updatedAt
- No new tables beyond `agents`.

## Boundaries
- Internal: `drizzle-orm/pg-core` types (uuid, text, integer, real, timestamp, index), same conventions as `knowledgeBases`.
- No API, no UI, no auth changes in this plan.

## Considerations
- Multiple agents per project: `projectId` is a plain FK with an index, **not** unique — use `onDelete: "cascade"` but leave duplicates valid.
- Deviation from spec §9 documented above: agents are project-scoped, not workspace-scoped; `kbIds` is a plain `uuid[]`, not a join table (agents attach up to a handful of KBs; a join table is overkill for this milestone and can be introduced later if multi-agent-per-KB grows).
- `updatedAt` needs a Drizzle `onUpdate` trigger — verify the exact Drizzle/Neon approach used in M1 before choosing between `.default(sql`now()`)` + app-side updates vs a DB trigger.
- Run plan 01 first; plans 02 and 03 depend on the `Agent` type.
