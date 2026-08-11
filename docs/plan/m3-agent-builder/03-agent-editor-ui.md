# M3 Agent Builder — Plan 3: Agent List + Editor UI

Status: Pending
Branch: plan/m3/03-agent-editor-ui

## Description
Build the agent builder UI. Each project can host **multiple** agents, so the project detail page gains an agent list section: an "New Agent" action, a list of existing agents (name + status badge), and an editor for the selected agent. The editor covers identity, voice, knowledge (attach one or more of the project's KBs — reusable across agents), and behavior, plus draft/publish controls. Reads/writes the CRUD API from plan 02.

## Goals
- Agent list section on `projects/[projectId]/page.tsx`: "New Agent" button, cards/rows showing each agent's name + status badge (Draft/Published)
- Create a new agent (POST) → opens its editor; select an existing agent → opens its editor
- Editor sections match spec §6.3: Identity, Voice, Knowledge, Behavior
- Voice list: static catalog of provider voice IDs/labels (Deepgram `aura-*` + ElevenLabs fallback) — a small `src/lib/voices.ts`
- Knowledge: multi-select from the project's KBs (any subset; KBs shared across agents); retrieval settings (topK, similarity threshold)
- Save (draft) and Publish buttons; publish validates non-empty prompt + at least one attached KB (mirrors plan 02)
- Client form with saved status feedback; `npm run build` passes

## Workflow
Add `src/lib/voices.ts` catalog → add `src/components/agent-list.tsx` (list + create) → add `src/components/agent-editor.tsx` (client, per-agent form + save/publish) → wire both into `projects/[projectId]/page.tsx` → build and verify.

## Implementation Steps

### Step 1: Voice catalog
- [ ] Add `src/lib/voices.ts`: `export const VOICES = [{ id: "aura-asteria-en", label: "Asteria (English)" }, ...]` — Deepgram `aura-*` set plus `aura-orion-en`, `aura-zeus-en`, etc. Include `id` + `label` + optional `languages` hint. This is a static list until the LiveKit/Deepgram runtime (M4) may replace it with a fetched list.

### Step 2: Agent list + create
- [ ] Add `src/components/agent-list.tsx` (server- or client- hydrated) — receives `projectId` + initial `agents`; renders "New Agent" button and one row/card per agent (name + status badge)
- [ ] "New Agent" → `POST /api/projects/[projectId]/agents` with empty defaults (name `"New Agent"`), then select the returned agent in the editor; on API error show inline message
- [ ] Selecting an agent row raises a `selectedAgentId` state (lifted to the project page or a parent client component) so the editor below switches agents

### Step 3: Agent editor component
- [ ] Add `src/components/agent-editor.tsx` (client) — props: `projectId`, `agent` (nullable), `kbs` (project KBs for the multi-select), `voiceCatalog`, `onSelectAgent` (change which agent is edited)
- [ ] Sections:
  - Identity: `name` input, `systemPrompt` textarea, `examplePhrases` comma-separated input → array, `guardrails` textarea
  - Voice: `<select>` over `VOICES`, `language` `<select>` (en, es, etc.)
  - Knowledge: multi-select checkbox list of the project's KBs bound to `kbIds` (each agent keeps its own selection — no sharing conflicts); `topK` number input, `similarityThreshold` number input (0–1)
  - Behavior: `interruptionSensitivity` select (low/medium/high), `endCallKeyword` input, `escalationMessage` textarea
- [ ] Save button: PUT to `/api/agents/[id]` (or POST to `/api/projects/[projectId]/agents` if no agent yet), show success/inline error, refresh server data (`router.refresh()`)
- [ ] Publish button: POST `/api/agents/[id]/publish` `{ published: true }`; disable + explain if `systemPrompt` empty or no KBs attached (mirrors plan 02's 400)

### Step 4: Project page wiring
- [ ] Update `src/app/(product)/dashboard/projects/[projectId]/page.tsx` (server) to fetch all agents for the project (via the plan 02 API or direct DB read consistent with M2's page pattern) plus project KBs + VOICES
- [ ] Render `AgentList` + `AgentEditor` in a client wrapper (lift `selectedAgentId`): default selection = first agent if any, else show editor in "new agent" mode
- [ ] Keep existing project page content (KBs list, sources, etc.) intact; add the agent section

### Step 5: Verify
- [ ] Local check: project page lists agents; "New Agent" creates one and opens its editor; create a second agent → list shows both, each with its own KB selection
- [ ] Edit fields, Save, reload → values persist per agent; switching agents shows each one's own config
- [ ] Publish on empty agent → blocked with message; publish with prompt + KB → status flips to Published (badge updates in list)
- [ ] Voice/language selects reflect saved values
- [ ] `npm run build` passes
- [ ] Commit with message `feat: agent builder UI (list + editor)`

---

## Files to Modify
- `src/lib/voices.ts` — new, static voice catalog
- `src/components/agent-list.tsx` — new, agent rows + create button
- `src/components/agent-editor.tsx` — new, per-agent editor form + save/publish
- `src/app/(product)/dashboard/projects/[projectId]/page.tsx` — add agent section (list + editor), fetch agents

## Functional Components
| Function | File | Role |
|----------|------|------|
| `VOICES` | `src/lib/voices.ts` | Static provider voice catalog |
| `AgentList` | `src/components/agent-list.tsx` | Project-page list of agents + create |
| `AgentEditor` | `src/components/agent-editor.tsx` | Per-agent builder form + save/publish |
| `ProjectPage` | `src/app/(product)/dashboard/projects/[projectId]/page.tsx` | Server page hosting list + editor |

## Data Model
- No schema changes. Reads/writes the `agents` table (plan 01) via the API (plan 02). Reads project KBs for the multi-select.

## Boundaries
- Internal: plan 02 API (`/api/projects/[projectId]/agents`, `/api/agents/[id]`, `/api/agents/[id]/publish`), `@/lib/voices.ts`, Next server/client split.
- No new routes; no runtime/LiveKit yet (that's M4).

## Considerations
- Multiple agents per project means the editor must be **per-selected-agent**: shared state holds `selectedAgentId`; form fields reset when it changes.
- KBs are shared across agents — the multi-select just records which KBs each agent uses; no copy, no exclusivity.
- Voice list is static for M3; M4 replaces it with the provider's live list when the runtime lands.
- `examplePhrases` as comma-separated input keeps the form simple; a tag-input is polish if time allows.
- Reuse M2's shadcn `Dialog`/`Button`/`Input`/`Select` components (now on `main`).
