# M1 Foundations — Plan 4: Workspace & Dashboard

Status: Completed

## Description
Auto-create a default workspace (with an owner membership) when a user signs up, and build the protected dashboard page that shows the current user's workspace. Handle existing users without workspaces by creating a default workspace on the fly. Deploy to Vercel and verify the milestone is demoable: **sign up and see a workspace**.

## Goals
- Signing up creates the Better Auth `user` + a default `workspaces` row + owner `memberships` row atomically
- `/dashboard` is protected and shows the workspace name and user email
- Dashboard handles existing users without workspaces by creating a default workspace on the fly
- Sign out works from the dashboard header
- Flow verified live on Vercel

## Workflow
Add a Better Auth `databaseHooks` hook that creates workspace + membership in a Drizzle transaction → build `/dashboard` as a server component that reads the session via `auth.api.getSession`, ensures workspace exists (creates if missing), queries the user's workspace via Drizzle, and renders it with a sign-out button → add a shared header → build → commit → deploy → verify the sign-up → dashboard flow in production.

## Implementation Steps

### Step 1: Workspace on signup
- [x] Modify `src/lib/auth.ts` to add `databaseHooks.user.create.after`: on new user, run `db.transaction` inserting a default `workspaces` row (name derived from user name, e.g. `${name}'s Workspace`) and an owner `memberships` row linked to `user.id`
- [x] Ensure the hook is a no-op if the user already has a workspace (idempotent)

### Step 2: Dashboard page
- [x] Create `src/app/dashboard/page.tsx` as a server component: call `auth.api.getSession({ headers: await headers() })`, `redirect("/login")` if there is no session, then query the user's workspace via Drizzle (`memberships` join `workspaces`)
- [x] If no workspace exists for the authenticated user, create a default workspace (`${name}'s Workspace`) and owner membership in a transaction (handles existing users without workspaces)
- [x] Render the workspace name, the user's email, and a client `SignOutButton` that calls `authClient.signOut()` from `src/lib/auth-client.ts`
- [x] Add a fallback message if workspace creation fails (should not happen in normal flow)

### Step 3: Header & layout
- [x] Update `src/app/layout.tsx` (or a dashboard-specific layout) to include a header with a link to the landing page, and a "Sign out" action when authenticated
- [x] Add a "Get started" / "Login" link from the landing page (`src/app/page.tsx`)

### Step 4: Verify & deploy
- [x] Local end-to-end check: sign up a fresh account in the browser → lands on `/dashboard` → sees the auto-created workspace and email → signs out → `/dashboard` redirects to `/login`
- [x] Test with an existing user without workspace: sign in → dashboard creates default workspace → shows workspace name
- [x] Run `npm run build` and confirm it passes
- [x] Commit with message `feat: workspace + protected dashboard`
- [x] Deploy to Vercel; ensure `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are set in production env
- [x] Verify the full sign-up → dashboard flow at the live URL

---

## Files to Modify
- `src/lib/auth.ts` — add `databaseHooks.user.create.after`
- `src/app/dashboard/page.tsx` — new, protected dashboard
- `src/app/layout.tsx` — header/nav
- `src/app/page.tsx` — landing page links
- `src/components/sign-out-button.tsx` — new, client sign-out button

## Functional Components

| Function | File | Role |
|----------|------|------|
| `auth` (databaseHooks) | `src/lib/auth.ts` | On user create, creates workspace + owner membership |
| `DashboardPage` | `src/app/dashboard/page.tsx` | Reads session, ensures workspace exists (creates if missing), renders dashboard |
| `SignOutButton` | `src/components/sign-out-button.tsx` | Calls `authClient.signOut` |

## Data Model
- Writes `workspaces` + `memberships` rows in a transaction (user is created by Better Auth). Dashboard also writes if workspace is missing.
- Reads the current user's `workspaces` row via `memberships`.

## Boundaries
- External: `better-auth` (`auth`, `authClient`), Drizzle, Vercel.
- Dashboard reads/writes data directly via Drizzle (server component); REST endpoints for workspaces are not needed in M1.
- Session comes from `auth.api.getSession`; no `src/actions/register.ts` exists (sign-up is handled by Better Auth).

## Considerations
- Guard against a user with no workspace — create a default workspace on the fly instead of showing a fallback (handles existing users who signed up before workspace hook was implemented).
- `databaseHooks.user.create.after` must be idempotent (skip if the workspace already exists).
- Dashboard page must check for workspace existence and create if missing (belt-and-suspenders approach).
- The demoable milestone criteria is met when a fresh sign-up lands on `/dashboard` showing a workspace.

---

## Execution Notes

### Architecture
The plan wraps the M1 flow around a self-healing "get or create" workspace helper rather than relying solely on the signup hook. Two layers of enforcement: (a) a Better Auth `databaseHooks.user.create.after` that creates workspace + owner membership atomically on signup, and (b) a `getOrCreateWorkspace` fallback inside the dashboard that creates a default workspace on the fly for pre-existing users. This mirrors the plan's Workflow (hook → server page → header) and Data Model (`workspaces` + `memberships`).

### How each step was implemented

- **Step 1 — Workspace on signup:** added `databaseHooks.user.create.after` in `src/lib/auth.ts`. It runs a `db.transaction` inserting a `workspaces` row (name derived from user's name) + an owner `memberships` row referencing `user.id`. Made idempotent (no-op if the user already has a workspace).
- **Step 2 — Dashboard page:** `src/app/(product)/dashboard/page.tsx` is a server component calling `auth.api.getSession({ headers })`, redirecting to `/login` if unauthenticated, then calling `getOrCreateWorkspace` (queries membership join workspace; creates both in a transaction if missing). Renders workspace name + user email + `SignOutButton`.
- **Step 3 — Header & layout:** root layout gained a header linking to the landing page; landing page links to login/signup; a client `SignOutButton` calls `authClient.signOut()`. Auth pages moved into a `src/app/(auth)` route group and dashboard into `src/app/(product)` for clean organization.
- **Step 4 — Verify & deploy:** local end-to-end (fresh signup → dashboard, existing user without workspace → auto workspace, sign-out redirect) confirmed; `npm run build` passes; deployed with `vercel --prod`. Env vars `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` set in Vercel production; live URL verified.

### Files Created

- `src/components/sign-out-button.tsx` — client component calling `authClient.signOut()`
- `src/app/(product)/dashboard/page.tsx` — protected dashboard (server component)
- `src/app/(auth)/login/*`, `src/app/(auth)/signup/*` — moved auth pages into a route group

### Files Modified

- `src/lib/auth.ts` — added `databaseHooks.user.create.after` signup hook
- `src/app/layout.tsx` — added dashboard header/nav
- `src/app/page.tsx` — landing page links to login/signup
- `docs/plan/m1-foundations/04-workspace-dashboard.md` — status to Completed
- `docs/project-state.md` — updated to reflect completion

### Remaining / Known Gaps

- Members/invites (scoped roles) are intentionally deferred to M6 (spec §4, §6.1).
- Project CRUD was added to the spec's flow 1 and M2 plan 01, but not yet implemented.
- Deployment protection/SSO may intercept some deep links; normal `/`, `/login`, `/signup`, `/dashboard` flows work.
