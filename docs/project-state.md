# Project State

> Maintained by the plan-executor skill after each completed plan.

## Current Status
- Milestone: M2 Knowledge Base + Projects (in progress)
- Completed plans: M1 all (`01-project-scaffold`, `02-database-schema`, `03-authentication`, `04-workspace-dashboard`), M2 all (`01-project-crud`, `02-knowledge-base-crud`, `03-source-ingestion`, `04-retrieval-test-panel`, `05-dashboard-ui`) — all archived
- Next plan: M3 `01-agent-builder`

## Key Files
- `src/app/page.tsx` — landing page (server component)
- `src/app/layout.tsx` — root layout + metadata
- `src/app/globals.css` — Tailwind v4 entry + theme
- `src/app/login/page.tsx` + `src/app/login/login-form.tsx` — sign-in page + client form (in `(auth)` route group)
- `src/app/signup/page.tsx` + `src/app/signup/signup-form.tsx` — sign-up page + client form (in `(auth)` route group)
- `src/app/(product)/dashboard/page.tsx` — protected dashboard: `SidebarProvider` + `DashboardSidebar` wrapping `SidebarInset` (project list + "New Project" dialog), shows workspace + signed-in email (in `(product)` route group)
- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler
- `src/app/api/workspaces/[workspaceId]/projects/route.ts` — GET/POST projects (membership-guarded)
- `src/app/api/projects/[projectId]/knowledge-bases/route.ts` — GET/POST knowledge bases (tenancy-guarded)
- `src/app/api/knowledge-bases/[id]/route.ts` — PUT/DELETE knowledge base (tenancy-guarded)
- `src/app/api/knowledge-bases/[kbId]/route.ts` — PUT/DELETE knowledge base (tenancy-guarded; renamed from `[id]` to fix Next 16 dynamic-slug clash)
- `src/app/api/knowledge-bases/[kbId]/sources/route.ts` — GET/POST sources (text + url kinds, tenancy-guarded)
- `src/app/api/knowledge-bases/[kbId]/sources/upload/route.ts` — multipart file upload (PDF/TXT/MD → R2)
- `src/app/api/sources/[id]/route.ts` — DELETE source (removes R2 object for file type)
- `src/app/api/inngest/route.ts` — Inngest serve handler (GET/POST/PUT)
- `src/app/api/knowledge-bases/[kbId]/query/route.ts` — POST query: guarded retrieval + grounded LLM answer (chatbot backend, not gated)
- `src/app/(product)/dashboard/projects/[projectId]/page.tsx` — project detail / KB manager page
- `src/app/(product)/dashboard/projects/[projectId]/knowledge-bases/[kbId]/page.tsx` — KB detail / sources page
- `src/lib/tenancy.ts` — `requireProjectAccess` / `requireKnowledgeBaseAccess` multi-tenant guards
- `src/lib/retrieval.ts` — `retrieveChunks` (embed + pgvector top-K), `isValidUuid`, `clampTopK`
- `src/lib/ai.ts` — Gemini embedding model (`gemini-embedding-001`, 768 dims via `providerOptions.google.outputDimensionality`) + `embedTexts`/`embedText`; provider-agnostic `chatModel` (Gemini default / OpenRouter)
- `src/lib/inngest.ts` — Inngest client + `chunkSource` job (extract → chunk → embed → store) + `chunkText`/`extractSourceText` + `sendKnowledgeSourceCreated`
- `src/lib/r2.ts` — R2 upload/get/remove + `sourceObjectKey`
- `src/lib/db.ts` — Drizzle `db` singleton over a `pg` Pool
- `src/lib/auth.ts` — Better Auth server config (Drizzle adapter + email/password)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/lib/db/schema.ts` — app tables: `workspaces`, `memberships`, `projects`, `knowledge_bases`, `knowledge_sources`, `chunks` (pgvector HNSW index) + types
- `src/lib/db/auth-schema.ts` — Better Auth tables: `user`, `session`, `account`, `verification` (CLI-generated)
- `drizzle.config.ts` — drizzle-kit config (Neon Postgres; schema list includes auth-schema)
- `drizzle/` — generated migrations (0000 initial, 0001 auth, 0002 projects, 0003 knowledge_bases, 0004 sources + chunks)
- `components.json` — shadcn/ui config (radix-nova style, neutral base, `@/` aliases)
- `src/lib/utils.ts` — `cn()` Tailwind class-merge helper (clsx + tailwind-merge)
- `src/components/ui/` — shadcn components: `sidebar.tsx`, `dialog.tsx`, `button.tsx`, `input.tsx`, `separator.tsx`, `sheet.tsx`, `tooltip.tsx`, `skeleton.tsx`
- `src/hooks/use-mobile.ts` — `useIsMobile` matchMedia hook (shadcn sidebar dependency)
- `src/components/dashboard-sidebar.tsx` — client sidebar (workspace header, projects nav, sign-out)
- `.env.example` — env template (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GEMINI_*`, `R2_*`, `INNGEST_*`)
- `docs/spec.md` — product specification + milestones
- `docs/plan/m1-foundations/` — archived M1 plans
- `docs/plan/m2-knowledge-base/` — M2 plans (01–05 archived in `archive/`; active tracking in `TODO.md`)

## Key Functions Summary
- `Home` (`src/app/page.tsx`) — renders the branded landing page
- `LoginForm` (`src/app/login/login-form.tsx`) — calls `authClient.signIn.email`, redirects to `/dashboard`
- `SignupForm` (`src/app/signup/signup-form.tsx`) — calls `authClient.signUp.email`, redirects to `/dashboard`
- `DashboardPage` (`src/app/(product)/dashboard/page.tsx`) — `auth.api.getSession` guard + `getOrCreateWorkspace` (creates default workspace on the fly), queries projects + workspace name, renders `SidebarProvider` layout with sidebar (workspace name + project nav) and main inset (project list + New Project dialog)
- `DashboardSidebar` (`src/components/dashboard-sidebar.tsx`) — client sidebar: AutoSupport + workspace header, "Projects" nav (links to project detail), `SignOutButton` footer
- `NewProjectForm` (`src/components/new-project-form.tsx`) — shadcn `Dialog` modal; POSTs name to the projects API, closes + `router.refresh()` on success, error shown inside dialog
- `auth` (`src/lib/auth.ts`) — Better Auth instance (Drizzle adapter, email/password, `databaseHooks.user.create.after` signup hook creating workspace + membership + default project, `baseURL`)
- `authClient` (`src/lib/auth-client.ts`) — browser-side auth client
- `db`, `pool` (`src/lib/db.ts`) — Drizzle client + `pg` Pool singleton
- `workspaces`, `memberships`, `projects`, `knowledgeBases` + type exports (`src/lib/db/schema.ts`) — table definitions
- `user`, `session`, `account`, `verification` (`src/lib/db/auth-schema.ts`) — Better Auth tables (CLI-generated)
- `SignOutButton` (`src/components/sign-out-button.tsx`) — client sign-out control in sidebar footer
- `GET/POST projects` handlers (`src/app/api/workspaces/[workspaceId]/projects/route.ts`) — list/create projects with session + membership guard
- `requireProjectAccess` / `requireKnowledgeBaseAccess` (`src/lib/tenancy.ts`) — resolve project/KB → workspace → membership, 401/403/404
- `GET/POST knowledge-bases` handlers (`src/app/api/projects/[projectId]/knowledge-bases/route.ts`) — list/create KBs (tenancy-guarded)
- `PUT/DELETE knowledge-bases` handlers (`src/app/api/knowledge-bases/[kbId]/route.ts`) — rename/delete KB (tenancy-guarded)
- `GET/POST sources` handlers (`src/app/api/knowledge-bases/[kbId]/sources/route.ts`) — list sources; create text/url source + enqueue Inngest (tenancy-guarded)
- `POST sources/upload` handler (`src/app/api/knowledge-bases/[kbId]/sources/upload/route.ts`) — multipart file upload (PDF/TXT/MD → R2, `sourceObjectKey`), enqueues Inngest
- `DELETE source` handler (`src/app/api/sources/[id]/route.ts`) — delete source; removes R2 object for file type, cascades chunks
- `ProjectDetailPage` (`src/app/(product)/dashboard/projects/[projectId]/page.tsx`) — KB manager page (KB names link to detail page)
- `KnowledgeBaseDetailPage` (`…/knowledge-bases/[kbId]/page.tsx`) — lists sources with status badges + add/delete controls
- `NewKnowledgeBaseForm` / `KnowledgeBaseRowActions` (`src/components/knowledge-base-forms.tsx`) — create/rename/delete KB client controls
- `SourceForms` / `SourceRowActions` (`src/components/source-forms.tsx`) — text/URL/file source forms + delete control
- `chunkSource` (`src/lib/inngest.ts`) — Inngest fn: `load-source` → `mark-processing` → `extract-text` → `chunk-text` → `embed-chunks` → `store-chunks` → `mark-ready`, catch → `mark-failed` (id `process/knowledge-source`, trigger `knowledge-source.created`)
- `chunkText` (`src/lib/inngest.ts`) — ~500-char chunks, 100 overlap, newline/space boundaries
- `extractSourceText` (`src/lib/inngest.ts`) — text inline, URL via fetch + `stripHtml`, file via R2 + `pdf-parse`
- `embedTexts` / `embedText` (`src/lib/ai.ts`) — Gemini `embedMany`/`embed` wrappers with `outputDimensionality: 768`
- `chatModel` (`src/lib/ai.ts`) — LLM for grounded answers; Gemini `languageModel` (`GEMINI_CHAT_MODEL`, default `gemini-2.5-flash`) or OpenRouter OpenAI-compatible chat model when `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` are set
- `retrieveChunks` / `isValidUuid` / `clampTopK` (`src/lib/retrieval.ts`) — embed query + pgvector `<=>` cosine search scoped to `kbId`, topK default 5 clamp 1–10
- `POST query` handler (`src/app/api/knowledge-bases/[kbId]/query/route.ts`) — tenancy-guarded retrieval + `generateText` grounded answer; returns `{ answer, chunks }`
- `uploadToR2` / `getFromR2` / `removeFromR2` (`src/lib/r2.ts`) — R2 object storage (S3 API)

## Dependencies
- `next` 16.3.0, `react` 19.2.8, `react-dom` 19.2.8
- `drizzle-orm`, `pg`, `better-auth`
- `inngest` ^4, `ai` ^7, `@ai-sdk/google`, `@ai-sdk/openai-compatible`, `@aws-sdk/client-s3`, `pdf-parse` ^2
- dev: `drizzle-kit`, `@types/pg`, `tailwindcss` ^4, `@tailwindcss/postcss`, `typescript` ^5, `eslint` ^9, `eslint-config-next` 16.3.0
- UI: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `radix-ui` (unified), `tw-animate-css` (shadcn/ui via `shadcn` CLI; `components.json`)

## Environment Variables
- `DATABASE_URL` — Neon Postgres connection string (set locally in `.env`; set in Vercel production)
- `BETTER_AUTH_SECRET` — Better Auth secret (set locally in `.env`; set in Vercel production)
- `BETTER_AUTH_URL` — app origin for Better Auth callbacks/redirects (`http://localhost:3000` locally; production URL on Vercel)
- `GEMINI_API_KEY` / `GOOGLE_API_KEY` — Gemini API key for embeddings (`src/lib/ai.ts` falls back between the two)
- `GEMINI_EMBEDDING_MODEL` — embedding model id (default `gemini-embedding-001`, 768 dims)
- `GEMINI_CHAT_MODEL` — Gemini chat model for grounded answers (default `gemini-2.5-flash`)
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL` — optional: route the chat model through OpenRouter (OpenAI-compatible) instead of Gemini
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — Cloudflare R2 (S3 API) for file sources
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` — Inngest cloud keys (optional for dev); `INNGEST_DEV=1` for local dev server

## API Endpoints
- `GET/POST /api/auth/*` — Better Auth endpoints (sign-up, sign-in, sign-out, get-session, etc.)
- `GET /api/workspaces/:id/projects` — list projects for a workspace (auth + membership)
- `POST /api/workspaces/:id/projects` — create a project `{ name }` (auth + membership)
- `GET /api/projects/:id/knowledge-bases` — list KBs for a project (tenancy-guarded)
- `POST /api/projects/:id/knowledge-bases` — create a KB `{ name }` (tenancy-guarded)
- `PUT /api/knowledge-bases/:kbId` — rename a KB `{ name }` (tenancy-guarded)
- `DELETE /api/knowledge-bases/:kbId` — delete a KB (tenancy-guarded, cascades)
- `GET /api/knowledge-bases/:kbId/sources` — list sources (tenancy-guarded)
- `POST /api/knowledge-bases/:kbId/sources` — create source `{ kind: 'text', content, name }` or `{ kind: 'url', url, name }`; enqueues `knowledge-source.created` (tenancy-guarded)
- `POST /api/knowledge-bases/:kbId/sources/upload` — multipart `file` (PDF/TXT/MD/MARKDOWN) → R2; enqueues ingestion (tenancy-guarded)
- `DELETE /api/sources/:id` — delete source (removes R2 object if file, cascades chunks; tenancy-guarded)
- `POST /api/knowledge-bases/:kbId/query` — embed question, pgvector retrieval, grounded answer `{ answer, chunks }` (tenancy-guarded, not gated)
- `GET/POST/PUT /api/inngest` — Inngest serve handler (dev + prod)

## Deployments
- Vercel project: `autosupport` (scope `ashutsoh1729s-projects`)
- Production URL: https://autosupport-peach.vercel.app
- Method: local CLI deploy (`vercel --prod`); GitHub integration deferred
