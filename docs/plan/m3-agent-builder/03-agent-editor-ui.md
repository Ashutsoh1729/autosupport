# M3 Agent Builder — Plan 3: Agent Editor UI

Status: Pending

## Description
Build the agent builder UI. Each project gets an agent editor surfaced from the project detail page: an identity section (name, system prompt, example phrases, guardrails), a voice section (provider voice picker + language), a knowledge section (attach KBs + retrieval settings), a behavior section (interruption sensitivity, end-call keyword, escalation message), and draft/publish controls. Reads/writes the CRUD API from plan 02.

## Goals
- Agent editor reachable from the project detail page (a link/card on `projects/[projectId]/page.tsx`)
- Form sections match spec §6.3: Identity, Voice, Knowledge, Behavior
- Voice list: static catalog of provider voice IDs/labels (Deepgram `aura-*` + ElevenLabs fallback) — a small `src/lib/voices.ts`
- Attach KBs via multi-select from the project's KBs; save retrieval settings (topK, similarity threshold)
- Save (draft) and Publish buttons; publish validates non-empty prompt + attached KBs (mirrors plan 02)
- Client form with optimistic-ish UX (saved toast / status badge); `npm run build` passes

## Workflow
Add `src/lib/voices.ts` catalog → add `src/components/agent-editor.tsx` (client, sections + save/publish) → add `src/components/agent-card.tsx` (project page entry + status badge) → wire into `projects/[projectId]/page.tsx` → build and verify.

## Implementation Steps

### Step 1: Voice catalog
- [ ] Add `src/lib/voices.ts`: `export const VOICES = [{ id: "aura-asteria-en", label: "Asteria (English)" }, ...]` — Deepgram `aura-*` set plus `aura-orion-en`, `aura-zeus-en`, etc. Include `id` + `label` + optional `languages` hint. This is a static list until the LiveKit/Deepgram runtime (M4) may replace it with a fetched list.

### Step 2: Agent editor component
- [ ] Add `src/components/agent-editor.tsx` (client) — receives `projectId`, `agent` (nullable), `kbs` (project KBs for the multi-select), `voiceCatalog`
- [ ] Sections:
  - Identity: `name` input, `systemPrompt` textarea, `examplePhrases` comma-separated input → array, `guardrails` textarea
  - Voice: `<select>` over `VOICES`, `language` `<select>` (en, es, etc.)
  - Knowledge: multi-select checkbox list of the project's KBs bound to `kbIds`; `topK` number input, `similarityThreshold` number input (0–1)
  - Behavior: `interruptionSensitivity` select (low/medium/high), `endCallKeyword` input, `escalationMessage` textarea
- [ ] Save button: PUT to `/api/agents/[id]` (or POST to `/api/projects/[projectId]/agents` if no agent yet), show success/inline error, refresh server data (`router.refresh()`)
- [ ] Publish button: POST `/api/agents/[id]/publish` `{ published: true }`; disable + explain if `systemPrompt` empty or no KBs attached (mirrors plan 02's 400)

### Step 3: Project page wiring
- [ ] Add `src/components/agent-card.tsx`: shows agent name, status badge (Draft/Published), voice label; links to the editor section (anchor) or toggles a route — simplest is rendering `AgentEditor` inline on the project page with an anchor link
- [ ] Update `src/app/(product)/dashboard/projects/[projectId]/page.tsx` (server) to fetch the agent (via the plan 02 API or direct DB read consistent with M2's page pattern), pass agent + KBs + VOICES to `AgentEditor`
- [ ] Keep existing project page content (KBs list, sources, etc.) intact; add the agent block as a section

### Step 4: Verify
- [ ] Local check: project page shows agent card + editor; edit fields, Save, reload → values persist; Publish on empty agent → blocked with message; publish with prompt + KB → status flips to Published
- [ ] Voice/language selects reflect saved values
- [ ] `npm run build` passes
- [ ] Commit with message `feat: agent builder UI`

---

## Files to Modify
- `src/lib/voices.ts` — new, static voice catalog
- `src/components/agent-editor.tsx` — new, client editor form
- `src/components/agent-card.tsx` — new, project page entry + status badge
- `src/app/(product)/dashboard/projects/[projectId]/page.tsx` — add agent section

## Functional Components
| Function | File | Role |
|----------|------|------|
| `VOICES` | `src/lib/voices.ts` | Static provider voice catalog |
| `AgentEditor` | `src/components/agent-editor.tsx` | Full agent builder form + save/publish |
| `AgentCard` | `src/components/agent-card.tsx` | Project-page agent entry + status badge |
| `ProjectPage` | `src/app/(product)/dashboard/projects/[projectId]/page.tsx` | Server page hosting the editor |

## Data Model
- No schema changes. Reads/writes the `agents` table (plan 01) via the API (plan 02). Reads project KBs for the multi-select.

## Boundaries
- Internal: plan 02 API (`/api/projects/[projectId]/agents`, `/api/agents/[id]`, `/api/agents/[id]/publish`), `@/lib/voices.ts`, Next server/client split.
- No new routes; no runtime/LiveKit yet (that's M4).

## Considerations
- Voice list is static for M3; M4 replaces it with the provider's live list when the runtime lands.
- `examplePhrases` as comma-separated input keeps the form simple; a tag-input is polish if time allows.
- If M2's dashboard UI (plan 05) is merged, reuse its shadcn `Dialog`/`Button`/`Input`/`Select` components; otherwise match whatever UI primitives exist on main.
