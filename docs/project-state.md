# Project State

> Maintained by the plan-executor skill after each completed plan.

## Current Status
- Milestone: M1 Foundations (in progress)
- Completed plans: `01-project-scaffold` (archived)
- Next plan: `02-database-schema` (pending)

## Key Files
- `src/app/page.tsx` — landing page (server component)
- `src/app/layout.tsx` — root layout + metadata
- `src/app/globals.css` — Tailwind v4 entry + theme
- `.env.example` — env template (`DATABASE_URL`, `BETTER_AUTH_SECRET`)
- `docs/spec.md` — product specification + milestones
- `docs/plan/m1-foundations/` — active M1 plans

## Key Functions Summary
- `Home` (`src/app/page.tsx`) — renders the branded landing page

## Dependencies
- `next` 16.3.0, `react` 19.2.8, `react-dom` 19.2.8
- dev: `tailwindcss` ^4, `@tailwindcss/postcss`, `typescript` ^5, `eslint` ^9, `eslint-config-next` 16.3.0

## Environment Variables
- `DATABASE_URL` — Neon Postgres connection string (placeholder on Vercel; real value comes in plan 2)
- `BETTER_AUTH_SECRET` — Better Auth secret (placeholder on Vercel; real value comes in plan 3)

## API Endpoints
- (none yet; Better Auth `/api/auth/*` comes in plan 3)

## Deployments
- Vercel project: `autosupport` (scope `ashutsoh1729s-projects`)
- Production URL: https://autosupport-peach.vercel.app
- Method: local CLI deploy (`vercel --prod`); GitHub integration deferred
