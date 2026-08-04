# Project State

> Maintained by the plan-executor skill after each completed plan.

## Current Status
- Milestone: M1 Foundations (in progress)
- Completed plans: `01-project-scaffold`, `02-database-schema`, `03-authentication` (first two archived; 03 next to archive)
- Next plan: `04-workspace-dashboard` (pending)

## Key Files
- `src/app/page.tsx` — landing page (server component)
- `src/app/layout.tsx` — root layout + metadata
- `src/app/globals.css` — Tailwind v4 entry + theme
- `src/app/login/page.tsx` + `src/app/login/login-form.tsx` — sign-in page + client form
- `src/app/signup/page.tsx` + `src/app/signup/signup-form.tsx` — sign-up page + client form
- `src/app/dashboard/page.tsx` — protected dashboard (minimal placeholder; enhanced in plan 4)
- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler
- `src/lib/db.ts` — Drizzle `db` singleton over a `pg` Pool
- `src/lib/auth.ts` — Better Auth server config (Drizzle adapter + email/password)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/lib/db/schema.ts` — app tables: `workspaces`, `memberships` + types
- `src/lib/db/auth-schema.ts` — Better Auth tables: `user`, `session`, `account`, `verification` (CLI-generated)
- `drizzle.config.ts` — drizzle-kit config (Neon Postgres; schema list includes auth-schema)
- `drizzle/` — generated migrations (0000 initial, 0001 auth tables)
- `.env.example` — env template (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- `docs/spec.md` — product specification + milestones
- `docs/plan/m1-foundations/` — active M1 plans

## Key Functions Summary
- `Home` (`src/app/page.tsx`) — renders the branded landing page
- `LoginForm` (`src/app/login/login-form.tsx`) — calls `authClient.signIn.email`, redirects to `/dashboard`
- `SignupForm` (`src/app/signup/signup-form.tsx`) — calls `authClient.signUp.email`, redirects to `/dashboard`
- `DashboardPage` (`src/app/dashboard/page.tsx`) — `auth.api.getSession` + `redirect("/login")` guard (placeholder)
- `auth` (`src/lib/auth.ts`) — Better Auth instance (Drizzle adapter, email/password, `baseURL`)
- `authClient` (`src/lib/auth-client.ts`) — browser-side auth client
- `db`, `pool` (`src/lib/db.ts`) — Drizzle client + `pg` Pool singleton
- `workspaces`, `memberships` + type exports (`src/lib/db/schema.ts`) — table definitions
- `user`, `session`, `account`, `verification` (`src/lib/db/auth-schema.ts`) — Better Auth tables (CLI-generated)

## Dependencies
- `next` 16.3.0, `react` 19.2.8, `react-dom` 19.2.8
- `drizzle-orm`, `pg`, `better-auth`
- dev: `drizzle-kit`, `@types/pg`, `tailwindcss` ^4, `@tailwindcss/postcss`, `typescript` ^5, `eslint` ^9, `eslint-config-next` 16.3.0

## Environment Variables
- `DATABASE_URL` — Neon Postgres connection string (set locally in `.env`; placeholder on Vercel)
- `BETTER_AUTH_SECRET` — Better Auth secret (set locally in `.env`; must be set in Vercel)
- `BETTER_AUTH_URL` — app origin for Better Auth callbacks/redirects (`http://localhost:3000` locally; set to production URL on Vercel)

## API Endpoints
- `GET/POST /api/auth/*` — Better Auth endpoints (sign-up, sign-in, sign-out, get-session, etc.)

## Deployments
- Vercel project: `autosupport` (scope `ashutsoh1729s-projects`)
- Production URL: https://autosupport-peach.vercel.app
- Method: local CLI deploy (`vercel --prod`); GitHub integration deferred
