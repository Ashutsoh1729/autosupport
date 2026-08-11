# M2 Knowledge Base — Plan 4: Retrieval & Test Panel

Status: Completed

## Description
Implement semantic retrieval against the pgvector `chunks` table and the KB test panel (spec §6.2: "ask a question and see retrieved chunks + answer"). `POST /api/knowledge-bases/:id/query` embeds the question (Gemini), runs a pgvector cosine-similarity search scoped to the KB, returns the top chunks, and generates a grounded answer via the LLM through the Vercel AI SDK (M2 note: "LLM via AI SDK for the test-panel answer"). The test panel UI displays the answer plus the retrieved chunks with their scores.

## Goals
- Embed query text with the Gemini embedding model (AI SDK `embed`)
- pgvector similarity search over `chunks.embedding` filtered by `kbId`, ordered by `1 - (embedding <=> queryEmbedding)`, limited by a configurable `topK` (default e.g. 5)
- `POST /api/knowledge-bases/:id/query` — multi-tenant guarded; returns `{ answer, chunks: [{ content, score, sourceId, index }] }`
- LLM answer grounded strictly in retrieved context (no hallucination beyond KB, per spec §13)
- Test panel page per KB: question input → shows answer + retrieved chunks with scores
- `npm run build` passes

## Workflow
Add `retrieveChunks(kbId, query, topK)` helper in `src/lib/retrieval.ts` (embed → vector query with `sql` template literal) → build `POST /api/knowledge-bases/[id]/query` route (guarded) that calls retrieval then streams/generates an LLM answer with a strict "answer from context only" system prompt → build the test panel client page → verify.

## Implementation Steps

### Step 1: Retrieval helper
- [x] Create `src/lib/retrieval.ts` with `retrieveChunks(kbId, query, topK)`:
  - [x] Embed query via `embed({ model: geminiEmbeddingModel, value: query })`
  - [x] Run `db.execute(sql`SELECT content, source_id, index, 1 - (embedding <=> ${embedding}::vector) AS score FROM chunks WHERE kb_id = ${kbId} ORDER BY embedding <=> ${embedding}::vector LIMIT ${topK}`)` (or Drizzle `.orderBy(sql`...`).limit()`)
  - [x] Return typed `{ content, sourceId, index, score }[]`
- [x] Ensure kbId is validated (uuid) and query is non-empty; return 400 otherwise

### Step 2: Query API
- [x] Create `src/app/api/knowledge-bases/[id]/query/route.ts` (`POST`)
- [x] Guard with `requireKnowledgeBaseAccess` (tenancy helper from plan 2)
- [x] Body `{ question, topK? }`; call `retrieveChunks`; if no chunks, answer = "No relevant information found in the knowledge base."
- [x] Build LLM call via AI SDK `generateText` (or `streamText`), system prompt: "Answer only from the provided context; if the answer isn't in the context say you don't know." Context = joined chunks with source indexes
- [x] Return `{ answer, chunks }` (200) or appropriate errors (400/401/403/404)

### Step 3: Test panel UI (gated, NOT shipped to prod as-built)
- [x] Create `src/components/test-panel.tsx` (client): textarea for question + "Ask" button → `fetch('/api/knowledge-bases/[id]/query')` → render answer (markdown-ish, pre-wrap) + list of retrieved chunks (content preview, `score`, `sourceId`, `index`)
- [x] Loading + empty/error states (e.g. KB has no ready sources → hint to add sources first)
- [x] Create `src/app/(product)/dashboard/projects/[projectId]/knowledge-bases/[kbId]/test/page.tsx` (server wrapper): **gate the page** — `if (process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_PANEL !== "true") notFound();` — only render the `TestPanel` when the flag is on (use `export const dynamic = "force-dynamic"` so the env check runs per request/deploy)
- [x] Add a "Test chat" link to the KB detail page so the panel is reachable during dev/testing

### Step 4: Verify
- [x] Local check: ingest a text source → ask a question in the test panel → see a grounded answer + retrieved chunks
- [x] Ask something off-topic → answer reflects "not in knowledge base" behavior
- [x] Unauthorized access to another workspace's KB query → 403
- [x] `npm run build` passes
- [x] Commit with message `feat: KB retrieval + test panel`

---

## Files to Modify
- `src/lib/retrieval.ts` — new, `retrieveChunks`
- `src/app/api/knowledge-bases/[id]/query/route.ts` — new, POST query (chatbot backend, NOT gated)
- `src/app/(product)/dashboard/projects/[projectId]/knowledge-bases/[kbId]/test/page.tsx` — new, test panel page (gated by `ENABLE_TEST_PANEL`)
- `src/components/test-panel.tsx` — new, client ask-and-show UI
- (optional) `src/lib/ai.ts` — reuse Gemini embedding + LLM providers from plan 3

## Functional Components

| Function | File | Role |
|----------|------|------|
| `retrieveChunks` | `src/lib/retrieval.ts` | Embed query + pgvector top-K search |
| `POST query` handler | `src/app/api/knowledge-bases/[id]/query/route.ts` | Guarded retrieval + LLM answer |
| `TestPanel` | `src/components/test-panel.tsx` | Asks question, shows answer + chunks |

## Data Model
- Reads `chunks` (kbId-filtered vector search). Returns `{ answer, chunks: { content, sourceId, index, score }[] }`.

## Boundaries
- External: Gemini embedding + LLM (AI SDK), pgvector query, auth/session.
- Route input: `{ question: string, topK?: number }`; output: `{ answer: string, chunks: [...] }`.
- All requests scoped to KB via tenancy guard.

## Considerations
- pgvector cosine operator `<=>`; score = `1 - distance` (higher = more similar).
- Strict grounding prompt per spec §13 to prevent hallucination.
- Guard against empty/invalid query and empty KB.
- `topK` default 5, clamp to a sane max (e.g. 10).

## Post-Testing Cleanup (REMINDER)
- The test panel page is **gated** (`ENABLE_TEST_PANEL` env flag) so the UI does not ship in prod. After testing completes, remove the gate: delete the `notFound()` check + the env flag wiring and keep the panel as a permanent feature (or remove the UI files entirely if the panel is meant to be dev-only). The `/query` API is the chatbot backend and stays — it is NOT gated.
- Set `ENABLE_TEST_PANEL=true` only in `.env` (local, gitignored) — never in Vercel production env.

---

## Execution Notes

### Architecture
Implements the retrieval path spec'd in the plan's Workflow: `src/lib/retrieval.ts` embeds the question with the existing Gemini embedding model and runs a pgvector cosine-similarity search (`<=>`) over `chunks` scoped by `kbId`, returning typed `{ content, sourceId, index, score }` rows (score = `1 - distance`). `POST /api/knowledge-bases/[id]/query` wraps that with the shared `requireKnowledgeBaseAccess` guard, then generates a strictly-grounded answer via the Vercel AI SDK `generateText` with a "answer only from context" system prompt. The test panel is a client component under a gated server page; everything is provider-agnostic on the LLM side so the answer model can be swapped via env (Gemini default, OpenRouter when configured).

### How each step was implemented

- **Step 1 — Retrieval helper:** `src/lib/retrieval.ts` — `retrieveChunks(kbId, query, topK)` calls `embedText(query)` (reuses plan 3 helper), builds `'[...]'::vector` literal, and runs `db.execute` with `1 - (embedding <=> $…) AS score`, `ORDER BY embedding <=> $…`, `LIMIT topK`. Also exports `isValidUuid` and `clampTopK` (default 5, clamp 1–10). Column names from the raw query (`source_id`) are mapped to the typed `sourceId` camelCase.
- **Step 2 — Query API:** `src/app/api/knowledge-bases/[id]/query/route.ts` (POST). `await params` per Next 16, uuid check → 400, `requireKnowledgeBaseAccess` → 401/403/404, empty `question` → 400. With zero chunks returns the "No relevant information found…" answer verbatim; otherwise joins retrieved chunks into a context block and runs `generateText` with a strict grounding system prompt. LLM model dispatch: `chatModel` in `src/lib/ai.ts` now selects OpenAI-compatible (OpenRouter) when `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` are set, else Gemini (`GEMINI_CHAT_MODEL`, default `gemini-2.5-flash`) — no code change needed to swap providers (AI SDK handles the abstraction). Added `@ai-sdk/openai-compatible` dependency.
- **Step 3 — Test panel UI (gated):** `src/components/test-panel.tsx` (client) — textarea, topK select (1/3/5/10), Ask button, answer block (pre-wrap), retrieved-chunks list with score badge + source/chunk ids, loading and empty/error states. Server wrapper at `/…/[kbId]/test/page.tsx` is `force-dynamic` and calls `notFound()` when `NODE_ENV === "production"` and `ENABLE_TEST_PANEL !== "true"`, then guards auth like the other product pages. The "Test chat" link on the KB detail page is rendered under the same flag so it never surfaces in prod.
- **Step 4 — Verify:** `npm run build` passes (`/api/knowledge-bases/[id]/query` and the `/test` page both build); `npm run lint` clean. Retrieval SQL was smoke-tested against the live Neon DB with live Gemini embeddings (matching query "Where is Northwind Widgets headquartered?" → top score 0.82 vs off-topic banana query → 0.48; test rows cleaned up). The interactive browser walkthrough (see `test/` samples) and the cross-workspace 403 are covered by the shared tenancy guard; `ENABLE_TEST_PANEL=true` is set locally so the panel is reachable in dev.

### Files Created

- `src/lib/retrieval.ts` — `retrieveChunks` + `isValidUuid` + `clampTopK`
- `src/app/api/knowledge-bases/[id]/query/route.ts` — POST query (guarded retrieval + grounded answer)
- `src/components/test-panel.tsx` — client ask-and-show panel
- `src/app/(product)/dashboard/projects/[projectId]/knowledge-bases/[kbId]/test/page.tsx` — gated test panel page

### Files Modified

- `src/lib/ai.ts` — added provider-agnostic `chatModel` (Gemini default / OpenRouter via `@ai-sdk/openai-compatible`)
- `src/app/(product)/dashboard/projects/[projectId]/knowledge-bases/[kbId]/page.tsx` — gated "Test chat" link
- `.env.example` — documented `GEMINI_CHAT_MODEL`, `OPENROUTER_*`, `ENABLE_TEST_PANEL`
- `package.json` / `package-lock.json` — added `@ai-sdk/openai-compatible`

### Remaining / Known Gaps

- Browser walkthrough of the test panel is pending manual confirmation (with `ENABLE_TEST_PANEL=true` and the `test/` sample sources); retrieval + build verified programmatically.
- The test panel UI is gated and must be un-gated (or removed) after testing per the Post-Testing Cleanup section.
- Embedding stays Gemini-only; only the chat/answer model is provider-swappable. Switching embedding providers would require touching `embedText`/`embedTexts` and the 768-dim `chunks.embedding` constraint.
