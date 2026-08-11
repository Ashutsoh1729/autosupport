# M2 Knowledge Base — Execution TODO (persisted)

> Session-scoped todos are lost between sessions; this file keeps the plan state.

## M2 status
- [x] Plan 01 — Project CRUD (archived)
- [x] Plan 02 — Knowledge Base CRUD (archived)
- [x] Plan 03 — Source Ingestion (archived, merged)
- [x] Plan 04 — Retrieval & Test Panel (archived)
- [x] Plan 05 — Dashboard UI (shadcn sidebar + dialog) — **archived, PR open**

## Plan 05 (implemented, PR open)
- [x] `git fetch origin && git checkout main && git pull` (pick up PR #10)
- [x] Branch: reset local `plan/05-dashboard-ui` from main (force-push later; stale branch only holds an already-merged doc commit)
- [x] shadcn setup (Tailwind v4): `npx shadcn@latest init -y -b radix -p nova` + `add button input dialog sidebar`; generated `components.json`, `src/lib/utils.ts` `cn()`, oklch CSS vars in `globals.css`; deps `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `radix-ui`, `tw-animate-css`
- [x] Rewrite `src/components/new-project-form.tsx` to a shadcn `Dialog` (button trigger → modal with name input → POST → close + `router.refresh()`)
- [x] Create `src/components/dashboard-sidebar.tsx` (client) — SidebarProvider/Sidebar, workspace name, projects nav, SignOutButton, mobile toggle
- [x] Restructure `src/app/(product)/dashboard/page.tsx` into sidebar layout; keep project list + empty state in main inset
- [x] `npm run build` passes; update plan checkboxes; append Execution Notes
- [x] Archive `05-dashboard-ui.md`; update `docs/project-state.md`
- [x] **Post-Testing Cleanup**: removed test panel UI — deleted `src/components/test-panel.tsx` and the `[kbId]/test` route, removed the "Test chat" link + `ENABLE_TEST_PANEL` gate from the KB detail page, dropped the env var from `.env.example`/docs, and narrowed the `test/` gitignore to root-only (`/test/`) so it no longer shadows app routes. Kept the `POST /api/knowledge-bases/[kbId]/query` chatbot backend + retrieval lib.
- [ ] **ACTION: user merges PR** (dashboard UI PR on `plan/05-dashboard-ui`)

## General notes
- Branch strategy: each plan on `plan/<name>`; branch from main AFTER the PR for the prior plan is merged (user merges).
- Root `/test/` dir is gitignored (sample sources for ingestion/retrieval).