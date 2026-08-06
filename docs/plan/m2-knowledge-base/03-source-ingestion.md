# M2 Knowledge Base — Plan 3: Source Management & Ingestion

Status: Pending

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
- [ ] Add `knowledge_sources` table: `id` (uuid pk), `kbId` (uuid FK `knowledge_bases.id` onDelete cascade), `type` (text: 'text'|'file'|'url'), `status` (text: 'queued'|'processing'|'ready'|'failed', default 'queued'), `contentRef` (text, nullable; R2 object key / stored URL / raw text), `name` (text), `error` (text nullable), `createdAt`
- [ ] Add `chunks` table: `id` (uuid pk), `kbId` (fk onDelete cascade), `sourceId` (fk `knowledge_sources.id` onDelete cascade), `index` (int), `content` (text), `embedding` (`vector({ dimensions: 1536 })`), `createdAt`
- [ ] Configure pgvector: add a `CREATE EXTENSION IF NOT EXISTS vector` step + an index on `embedding` (IVFFlat or HNSW). Drizzle `vector` column via `drizzle-orm/pg-core` `vector()`
- [ ] Add deps: `inngest`, `@ai-sdk/google`/`ai` (embed/embedMany), R2 S3 client (`@aws-sdk/client-s3`) — pinned to spec §7 (Vercel AI SDK + Gemini embeddings + R2 + Inngest)
- [ ] Generate + apply migration

### Step 2: Inngest setup
- [ ] Create `src/lib/inngest.ts` exporting `inngest` client + `chunkSource` function (id e.g. `process/knowledge-source`) with the ingestion steps
- [ ] Create `src/app/api/inngest/route.ts` serving the Inngest handler for dev/prod
- [ ] Create `src/lib/providers.ts`: export the Gemini embedding model (`@ai-sdk` `embeddingModel` with `gemini-embedding-model`) and LLM(s) used for optional enrichment, using `AI_SDK / GEMINI` env keys

### Step 3: Source-create handlers
- [ ] `POS /api/knowledge-bases/[kbId]/sources/text` — auth-guarded, accept `{ content, name }`, `type='text'`, persist `contentRef=content`, enqueue Inngest, return row
- [ ] `POST /api/knowledge-bases/[kbId]/sources/url` — accept `{ url, name }`, type='url', persist `contentRef=url`, enqueue (fetch happens inside the Inngest job), return row
- [ ] `POST /api/knowledge-bases/[kbId]/sources/file` — authenticate, accept multipart `file`, verify type in (PDF,TXT,MD), stream upload to R2, store object key in `contentRef`, enqueue, return row
- [ ] `GET /api/knowledge-bases/[kbId]/sources` — list sources (guarded)
- [ ] Delete source handler (`DELETE /api/sources/[id]`) that also removes R2 object if type=file and cascades chunks

### Step 4: Ingestion job
- [ ] In `src/lib/inngest.ts` chunkContent: set source status to `processing` → extract content (text/URL via `fetch` text, file via R2 `get` + parse PDF via a text-extraction lib, TXT/MD direct) → chunk into ~500-char overlapping chunks → for each chunk call `embed()` via Gemini embedding model → batch insert into `chunks` → set `status='ready'` (or `'failed'` + `error`)
- [ ] Wrap job in try/catch so failures flip status to 'failed'

### Step 5: Sources UI
- [ ] Create `src/app/(product)/dashboard/projects/[projectId]/knowledge-bases/[kbId]/page.tsx` (server) listing sources with status badge per row
- [ ] Add client text/URL/file upload forms (POST to the 3 endpoints), poll or refresh to show `ready` after ingestion

### Step 6: Verify
- [ ] Local: add a text source → status flips queued→processing→ready; DB row in `chunks` for chunks with embeddings
- [ ] Upload a PDF/URL/file → ready; bad file → failed with error
- [ ] `npm run build` passes

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