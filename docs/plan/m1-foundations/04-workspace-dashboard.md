# M1 Foundations — Plan 4: Workspace & Dashboard

Status: Pending

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
- [ ] Deploy to Vercel; ensure `DATABASE_URL` and `BETTER_AUTH_SECRET` are set in production env
- [ ] Verify the full sign-up → dashboard flow at the live URL

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
