# Project State

> Maintained by the plan-executor skill after each completed plan.

## Current Status
- Milestone: M2 Knowledge Base + Projects (in progress)
- Completed plans: M1 all (`01-project-scaffold`, `02-database-schema`, `03-authentication`, `04-workspace-dashboard`), M2 `01-project-crud` (all archived)
- Next plan: M2 `02-knowledge-base-crud`

## Key Files
- `src/app/page.tsx` — landing page (server component)
- `src/app/layout.tsx` — root layout + metadata
- `src/app/globals.css` — Tailwind v4 entry + theme
- `src/app/login/page.tsx` + `src/app/login/login-form.tsx` — sign-in page + client form (in `(auth)` route group)
- `src/app/signup/page.tsx` + `src/app/signup/signup-form.tsx` — sign-up page + client form (in `(auth)` route group)
- `src/app/dashboard/page.tsx` — protected dashboard showing workspace + projects (in `(product)` route group)
- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler
- `src/app/api/workspaces/[workspaceId]/projects/route.ts` — GET/POST projects (membership-guarded)
- `src/lib/db.ts` — Drizzle `db` singleton over a `pg` Pool
- `src/lib/auth.ts` — Better Auth server config (Drizzle adapter + email/password)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/lib/db/schema.ts` — app tables: `workspaces`, `memberships`, `projects` + types
- `src/lib/db/auth-schema.ts` — Better Auth tables: `user`, `session`, `account`, `verification` (CLI-generated)
- `drizzle.config.ts` — drizzle-kit config (Neon Postgres; schema list includes auth-schema)
- `drizzle/` — generated migrations (0000 initial, 0001 auth, 0002 projects)
- `.env.example` — env template (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- `docs/spec.md` — product specification + milestones
- `docs/plan/m1-foundations/` — archived M1 plans
- `docs/plan/m2-knowledge-base/` — M2 plans (01 archived)

## Key Functions Summary
- `Home` (`src/app/page.tsx`) — renders the branded landing page
- `LoginForm` (`src/app/login/login-form.tsx`) — calls `authClient.signIn.email`, redirects to `/dashboard`
- `SignupForm` (`src/app/signup/signup-form.tsx`) — calls `authClient.signUp.email`, redirects to `/dashboard`
- `DashboardPage` (`src/app/(product)/dashboard/page.tsx`) — `auth.api.getSession` guard + `getOrCreateWorkspace` (creates default workspace on the fly), queries + renders workspace projects, renders workspace name + email
- `auth` (`src/lib/auth.ts`) — Better Auth instance (Drizzle adapter, email/password, `databaseHooks.user.create.after` signup hook creating workspace + membership + default project, `baseURL`)
- `authClient` (`src/lib/auth-client.ts`) — browser-side auth client
- `db`, `pool` (`src/lib/db.ts`) — Drizzle client + `pg` Pool singleton
- `workspaces`, `memberships`, `projects` + type exports (`src/lib/db/schema.ts`) — table definitions
- `user`, `session`, `account`, `verification` (`src/lib/db/auth-schema.ts`) — Better Auth tables (CLI-generated)
- `SignOutButton` (`src/components/sign-out-button.tsx`) — client sign-out control in dashboard header
- `NewProjectForm` (`src/components/new-project-form.tsx`) — client form creating a project via the projects API + `router.refresh()`
- `GET/POST projects` handlers (`src/app/api/workspaces/[workspaceId]/projects/route.ts`) — list/create projects with session + membership guard

## Dependencies
- `next` 16.3.0, `react` 19.2.8, `react-dom` 19.2.8
- `drizzle-orm`, `pg`, `better-auth`
- dev: `drizzle-kit`, `@types/pg`, `tailwindcss` ^4, `@tailwindcss/postcss`, `typescript` ^5, `eslint` ^9, `eslint-config-next` 16.3.0

## Environment Variables
- `DATABASE_URL` — Neon Postgres connection string (set locally in `.env`; set in Vercel production)
- `BETTER_AUTH_SECRET` — Better Auth secret (set locally in `.env`; set in Vercel production)
- `BETTER_AUTH_URL` — app origin for Better Auth callbacks/redirects (`http://localhost:3000` locally; production URL on Vercel)

## API Endpoints
- `GET/POST /api/auth/*` — Better Auth endpoints (sign-up, sign-in, sign-out, get-session, etc.)
- `GET /api/workspaces/:id/projects` — list projects for a workspace (auth + membership)
- `POST /api/workspaces/:id/projects` — create a project `{ name }` (auth + membership)

## Deployments
- Vercel project: `autosupport` (scope `ashutsoh1729s-projects`)
- Production URL: https://autosupport-peach.vercel.app
- Method: local CLI deploy (`vercel --prod`); GitHub integration deferred
