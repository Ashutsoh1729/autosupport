# M2 Knowledge Base — Plan 3: Source Management & Ingestion

Status: Completed (2026-08-06)

## Description
Add the `knowledge_sources` table (spec §9) and the ability to add three kinds of sources to a knowledge base: raw text, file upload (PDF/TXT/MD → Cloudflare R2), and public URL import. Set up the Inngest background job that runs extract → chunk → embed (M2 note: "Vercel AI SDK `embed`/`embedMany` for embedding") → store, with per-source status `queued → processing → ready | failed` (spec §6.2). This plan covers source CRUD + the Inngest pipeline + pgvector storage; retrieval/test panel is plan 4.

## Goals
- `knowledge_sources` table (id, kbId, type text|file|url, status, contentRef) and `chunks` table (id, sourceId, index, content, embedding vector, kbId)
- Add text source: store raw text as content, enqueue ingestion
- Add URL source: fetch public URL text, enqueue ingestion
- Add file source: upload to Cloudflare R2 (presigned/object key), enqueue ingestion
- Inngest job: extract → chunk → embed (Gemini `text-embedding-004` via AI SDK) → upsert chunks into pgvector
- Source status transitions to `ready`/`failed`; errors surfaced
- `npm run build` passes

## Workflow
Add tables to schema (incl. pgvector `vector` column for `chunks.embedding`) → init Inngest (`src/lib/inngest.ts`) + serve endpoint + load R2/AI SDK providers → build source-create route handler that stores content (text inline, file→R2 object key, URL fetched) and enqueues an Inngest event → the Inngest function extracts+chunks+embeds and writes into `chunks` → update source status → run `npm run build` and verify ingestion.

## Implementation Steps

### Step 1: Schema (sources + chunks + pgvector)
- [x] Add `knowledge_sources` table: `id` (uuid pk), `kbId` (uuid FK `knowledge_bases.id` onDelete cascade), `type` (text: 'text'|'file'|'url'), `status` (text: 'queued'|'processing'|'ready'|'failed', default 'queued'), `contentRef` (text, nullable; R2 object key / stored URL / raw text), `name` (text), `error` (text nullable), `createdAt`
- [x] Add `chunks` table: `id` (uuid pk), `kbId` (fk onDelete cascade), `sourceId` (fk `knowledge_sources.id` onDelete cascade), `index` (int), `content` (text), `embedding` (`vector({ dimensions: 768 })`), `createdAt`
- [x] Configure pgvector: `CREATE EXTENSION IF NOT EXISTS vector` + HNSW index `chunks_embedding_hnsw`. Drizzle `vector` column via `drizzle-orm/pg-core` `vector()`
- [x] Add deps: `inngest`, `@ai-sdk/google`/`ai` (embed/embedMany), R2 S3 client (`@aws-sdk/client-s3`), `pdf-parse` — pinned to spec §7
- [x] Generate + apply migration `drizzle/0004_sources-and-chunks.sql` (applied manually to Neon)

### Step 2: Inngest setup
- [x] Create `src/lib/inngest.ts` exporting `inngest` client + `chunkSource` function (id `process/knowledge-source`) with the ingestion steps
- [x] Create `src/app/api/inngest/route.ts` serving the Inngest handler for dev/prod
- [x] Create `src/lib/ai.ts`: export the Gemini embedding model (`gemini-embedding-001` with `outputDimensionality: 768`) and `embedTexts`/`embedText` helpers via AI SDK

### Step 3: Source-create handlers
- [x] `POST /api/knowledge-bases/[kbId]/sources` — auth-guarded, `kind='text'` accepts `{ content, name }`, type='text', persist `contentRef=content`, enqueue Inngest, return row
- [x] `POST /api/knowledge-bases/[kbId]/sources` — `kind='url'` accepts `{ url, name }`, type='url', persist `contentRef=url`, enqueue (fetch happens inside the Inngest job), return row
- [x] `POST /api/knowledge-bases/[kbId]/sources/upload` — authenticate, accept multipart `file`, verify extension in (PDF,TXT,MD,MARKDOWN), stream upload to R2, store object key in `contentRef`, enqueue, return row (cleanup R2 object on failure)
- [x] `GET /api/knowledge-bases/[kbId]/sources` — list sources (guarded)
- [x] Delete source handler (`DELETE /api/sources/[id]`) that also removes R2 object if type=file and cascades chunks

### Step 4: Ingestion job
- [x] In `src/lib/inngest.ts`: set source status to `processing` → extract content (text inline, URL via `fetch` + `stripHtml`, file via R2 `get` + PDF via `pdf-parse`) → chunk into ~500-char overlapping chunks (100 overlap, newline/space boundary) → `embedTexts()` via Gemini → batch insert into `chunks` → set `status='ready'`
- [x] Wrap job in try/catch: failures set `status='failed'` + `error` message (verified: 0 partial chunks on failure)

### Step 5: Sources UI
- [x] Create `src/app/(product)/dashboard/projects/[projectId]/knowledge-bases/[kbId]/page.tsx` (server) listing sources with status badge per row
- [x] Add client text/URL/file upload forms (`src/components/source-forms.tsx`), refresh to show `ready` after ingestion

### Step 6: Verify
- [x] Local: text source flips `queued→processing→ready`; DB rows in `chunks` with 768-dim embeddings (verified live)
- [x] URL source → `ready`; bad URL → `failed` with error; 3072-dim mismatch → `failed` with recorded error (error path verified)
- [x] `npm run build` passes

---

## Files to Modify
- `src/lib/db/schema.ts` — add `knowledge_sources`, `chunks`
- `src/lib/inngest.ts` — new Inngest client + `chunkSource` job
- `src/lib/ai.ts` — new, Gemini embedding provider + helpers
- `src/lib/r2.ts` — new, R2 uploads/removals
- `src/app/api/knowledge-bases/[kbId]/sources/route.ts` — new GET/POST(source)
- `src/app/api/knowledge-bases/[kbId]/sources/upload/route.ts` — new, multipart file upload
- `…/knowledge-bases/[kbId]/page.tsx` — new, sources detail page (client)
- `src/components/source-forms.tsx` — new, client text/url/file controls

## Functional Components

| Function | File | Role |
|----------|------|------|
| `knowledge_sources` table | `src/lib/db/schema.ts` | Persists sources + status |
|`chunks` table | `src/lib/db/schema.ts` | Persists chunks + embeddings |
|`chunkSource` (Inngest) | `src/lib/inngest.ts` | extract→chunk→embed→upsert |
|`embedTexts` | `src/lib/ai.ts` | Gemini `embedMany` wrapper |
|`uploadToR2` / `getFromR2` | `src/lib/r2.ts` | R2 object storage |
| Sources route handlers | `…/sources/route.ts`, `…/sources/upload/route.ts` | Create/list sources + files |

## Data Model
- `knowledge_sources`: `{ id, kbId, type, status, contentRef, name, error, createdAt }`
- `chunks`: `{ id, kbId, sourceId, index, content, embedding: vector(768), createdAt }` — dimension matches Gemini `text-embedding-004`
- Status flow: `queued → processing → ready | failed`

## Boundaries
- External: `inngest`, `@ai-sdk`/Gemini embeddings, Cloudflare R2 (S3 API), database (pgvector), PDF parse lib.
- Inngest event `knowledge-source.created` triggers the job; the job writes `chunks` + updates `sources`.
- Multi-tenant isolation maintained by tenancy helpers in route handlers.

## Considerations
- Env keys: `GEMINI_API_KEY`, `R2_` (bucket, accessKeyId, secretAccessKey, endpoint, accountId), `INNGEST_*` (event key / signing key).
- Keep chunking deterministic for resume-safety.
- `drizzle` `vector()` column dimension must match Gemini `text-embedding-004` (768).
- Handle big files; warn on exceed free-tier quota.

---

## Execution Notes (2026-08-06)

**Live verification (all four paths confirmed):**
- Text source: `queued→processing→ready`, 1 chunk with 768-dim embedding stored in pgvector.
- URL source (`example.com`): `queued→ready`, HTML stripped, chunk embedded.
- Bad URL (unresolvable domain): `processing` (Inngest retry-backoff) → `failed` with `fetch failed`.
- Dim mismatch (3072) before the fix: `failed` with recorded error and 0 partial chunks — catch handler verified.

**Key findings / deviations from plan:**
- **Dimension mismatch (fixed mid-implementation):** `@ai-sdk/google` v4 `gemini-embedding-001` defaults to **3072** dims, not 768. `outputDimensionality` is NOT a model-settings arg — it must be passed per-call via `providerOptions: { google: { outputDimensionality: 768 } }` to `embedMany`/`embed`. This is why the first live run stuck at `processing` (it had actually failed at `store-chunks`). Schema stays `vector(768)` per spec.
- **Drizzle migration application:** `drizzle-kit migrate` hangs against Neon. Applied manually: run SQL, then `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)` with sha256 + unix seconds.
- **Route naming:** Next 16 forbids differing dynamic slugs at the same path level (`[id]` vs `[kbId]`) — renamed KB route to `[kbId]`.
- **Inngest v4 API:** `createFunction({ triggers: [eventType(...)] })`; typed events via `eventType("name", { schema: staticSchema<{sourceId: string}>() })` + `inngest.send(eventType.create({...}))`.
- **`embedMany` v7:** returns `embeddings: number[][]` directly (no `.embedding` field).
- **pdf-parse v2:** `new PDFParse({ data: buffer })` then `parser.getText()` → `{ text }`; `parser.destroy()` after.
- **Failure status lag:** failed steps are retried by Inngest with exponential backoff before the `catch` runs, so a source can sit in `processing` for a while before flipping to `failed`. Expected behavior; fine for MVP.
- Verified no partial chunks remain after a failed `store-chunks` step (batch insert is atomic per query).

**Env:** `GEMINI_API_KEY`/`GOOGLE_API_KEY` (SDK reads either via `createGoogleGenerativeAI` fallback), `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`, `R2_*`, `INNGEST_*`, `INNGEST_DEV=1` for local dev server (port 8288).

**Test artifacts for cleanup:** KB `822ee94e-1421-4bc1-b0f1-f7e2d53e8eca` (sources: `c0ae5939`/`a041a253`/`e535626e`/`2039bbba`, test user `Cb9b59zuZqPdUb3y5ywp11IcJLOLF0Vo`), `/tmp/m2-03-cookies.txt`, `/tmp/m2-03-kbid.txt`, `find.js` in worktree. No R2 objects uploaded during this session (file-upload path tested only as 502-without-keys guard).