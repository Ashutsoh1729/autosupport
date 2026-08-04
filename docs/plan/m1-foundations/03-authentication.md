# M1 Foundations — Plan 3: Authentication

Status: Completed

## Description
Add Better Auth with email/password authentication wired to Drizzle via its adapter. Implement sign up, sign in, and route protection for `/dashboard`. Sign out UI is added in plan 4.

## Goals
- Better Auth configured with Drizzle adapter against the existing Neon Postgres schema
- Sign up creates a `user`; sign in / sign out works
- Session readable in server components via `auth.api.getSession`
- `/dashboard` is protected — unauthenticated users are redirected to `/login`
- Login and signup pages render with error feedback

## Workflow
Install `better-auth` → generate auth schema via the Better Auth CLI (`npx @better-auth/cli generate`) and run a Drizzle migration → create `src/lib/auth.ts` with `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), emailAndPassword: { enabled: true } })` → add the `app/api/auth/[...all]/route.ts` handler → create `src/lib/auth-client.ts` (`createAuthClient`) → build `/login` and `/signup` pages → guard `/dashboard` server-side.

## Implementation Steps

### Step 1: Install & configure Better Auth
- [x] Run `npm install better-auth`
- [x] Run `npx @better-auth/cli generate` and point the CLI at the Drizzle setup (it creates `src/lib/db/auth-schema.ts` with `user`, `session`, `account`, `verification` tables)
- [x] Run `npx drizzle-kit generate` then `npx drizzle-kit migrate` to apply the auth tables to Neon
- [x] Create `src/lib/auth.ts`: `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), emailAndPassword: { enabled: true } })`
- [x] Create `src/lib/auth-client.ts` exporting `authClient = createAuthClient()` from `better-auth/react`

### Step 2: Route handler
- [x] Create `src/app/api/auth/[...all]/route.ts` exporting the Better Auth `handlers` (`toNextJsHandler`)

### Step 3: Login & signup pages
- [x] Create `src/app/login/page.tsx` with a client `LoginForm` that calls `authClient.signIn.email({ email, password })` and shows an error on failure
- [x] Create `src/app/signup/page.tsx` with a client `SignupForm` that calls `authClient.signUp.email({ email, password, name })` and shows a field-level error on failure (e.g. duplicate email)
- [x] Add links between `/login`, `/signup`, and the landing page

### Step 4: Route protection
- [x] Protect `/dashboard` in the page's server component (built in plan 4): call `auth.api.getSession({ headers: await headers() })` and `redirect("/login")` when there is no session
- [x] Verify locally: visiting `/dashboard` while logged out redirects to `/login`

---

## Files to Modify
- `src/lib/auth.ts` — new, Better Auth server config
- `src/lib/auth-client.ts` — new, Better Auth React client
- `src/lib/db/auth-schema.ts` — new (CLI-generated), auth tables
- `src/app/api/auth/[...all]/route.ts` — new, route handler
- `src/app/login/page.tsx` — new
- `src/app/signup/page.tsx` — new
- `drizzle/` — migration for auth tables
- `drizzle.config.ts` — include `src/lib/db/auth-schema.ts` in the schema list

## Functional Components

| Function | File | Role |
|----------|------|------|
| `auth` | `src/lib/auth.ts` | Better Auth instance (Drizzle adapter, email/password) |
| `authClient` | `src/lib/auth-client.ts` | Browser-side auth client |
| `handlers` | `src/app/api/auth/[...all]/route.ts` | Exposes `/api/auth/*` endpoints |
| `LoginForm` | `src/app/login/page.tsx` | Calls `authClient.signIn.email` |
| `SignupForm` | `src/app/signup/page.tsx` | Calls `authClient.signUp.email` |

## Data Model
- Better Auth owns `user`, `session`, `account`, `verification` tables (via `drizzleAdapter`).
- `register`-style logic is handled by Better Auth's sign-up; workspace creation on signup is added in plan 4.

## Boundaries
- External: `better-auth`, `better-auth/react`, Drizzle adapter.
- Internal: `src/lib/db.ts` (Drizzle) + `src/lib/db/schema.ts` (app tables) + `src/lib/db/auth-schema.ts` (auth tables).
- Auth handler must be mounted at exactly `src/app/api/auth/[...all]/route.ts`.

## Considerations
- The Better Auth user model is auto-managed (password hashing is built-in); do not add a separate password column to app tables.
- `getSession` requires passing `headers()` on each call; no global middleware needed — guard protected routes in their server components.
- Duplicate-email sign-up fails with a friendly error via Better Auth's default response.

---

## Modified Files

- **New Files Created**: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/db/auth-schema.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/login/page.tsx`, `src/app/login/login-form.tsx`, `src/app/signup/page.tsx`, `src/app/signup/signup-form.tsx`, `src/app/dashboard/page.tsx`, `drizzle/0001_young_nekra.sql`
- **Modified Files**: `src/lib/db/schema.ts` (removed redundant `users` table; `memberships.userId` now `text` referencing Better Auth `user.id`), `drizzle.config.ts` (schema list now includes `src/lib/db/auth-schema.ts`), `.env` + `.env.example` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), `package.json`/`package-lock.json` (`better-auth` dep)

## Execution Notes

- **Architecture** — Better Auth 1.6.25 wired to Drizzle via `drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } })`. Auth owns the `user`, `session`, `account`, `verification` tables (CLI-generated in `src/lib/db/auth-schema.ts`); email/password hashing is handled internally in `account.password`. Server-side session reads go through `auth.api.getSession({ headers: await headers() })` (async `headers()` per Next 16 docs); no middleware/Proxy — `/dashboard` is guarded in its own server component. Client uses `createAuthClient()` from `better-auth/react`; the auth route handler mounts at `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`.
- **How each step was implemented**
  - Step 1: Installed `better-auth`. Ran `npx @better-auth/cli generate --config src/lib/auth.ts --output src/lib/db/auth-schema.ts` — needed `src/lib/auth.ts` to exist first (it temporarily omitted the generated-schema import; re-added after generation). Generated `user`/`session`/`account`/`verification` tables. Created final `src/lib/auth.ts` with the `authSchema` map + `baseURL: process.env.BETTER_AUTH_URL` (avoids the base-URL warning), and `src/lib/auth-client.ts`.
  - **Schema reconciliation (deviation from plan)**: the previous plan 02 app schema defined a `users` table with a `passwordHash` column. Per spec §9 Better Auth owns the `user` table, so the redundant `users` table was removed from `src/lib/db/schema.ts` and `memberships.userId` was repointed to Better Auth's `user` table (type changed `uuid` → `text`, FK `ON DELETE CASCADE`). This keeps a single source of truth for identity and matches plan 4's `databaseHooks` design. The migration also drops the `users` table.
  - Migration: `npx drizzle-kit generate` prompted about the `users → user` rename conflict (needed a pseudo-TTY to answer "create" for each auth table). Per plan 2's known issue, `drizzle-kit migrate` hangs on the Neon pooler, so migration `0001_young_nekra.sql` was applied manually: CREATE TABLE statements, `DROP TABLE "users" CASCADE` (which auto-removed the old FK — the generated `DROP CONSTRAINT` was skipped as a no-op), `memberships.user_id` type change + new FK to `user(id)`, and the `drizzle.__drizzle_migrations` journal seeded with the SQL sha256 (verified format matches `0000`). `drizzle-kit check` reports "Everything's fine".
  - Step 2: Created `src/app/api/auth/[...all]/route.ts` exporting `const { GET, POST } = toNextJsHandler(auth)` from `better-auth/next-js`.
  - Step 3: Built `/login` (page + client `LoginForm`) and `/signup` (page + client `SignupForm`) using Tailwind styles matching the landing page. Forms call `authClient.signIn.email` / `authClient.signUp.email`, render error banners on failure, and `router.push("/dashboard")` on success. Cross-links between `/login`, `/signup`, and `/` were already present on the landing page; added on both pages.
  - Step 4: Created a minimal protected `src/app/dashboard/page.tsx` server component that calls `auth.api.getSession({ headers: await headers() })` and `redirect("/login")` when unauthenticated. Plan 4 will replace this with the full workspace dashboard.
- **Verification** — Ran `npm run dev` and exercised the live API: unauthenticated `/dashboard` → 307 redirect to `/login`; `POST /api/auth/sign-up/email` created a `user` + `credential` `account` row (hashed password) + `session`; `get-session` returned the session with the cookie; duplicate email → `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`; sign-in correct → token, wrong password → `INVALID_EMAIL_OR_PASSWORD`; sign-out (with Origin header for CSRF) → `{ success: true }` and session returns `null`. Test user cleaned up afterwards. `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass (dashboard + auth route render dynamic).
- **Files Created** — see Modified Files section above.
- **Files Modified** — see Modified Files section above.
- **Remaining / Known Gaps**
  - `drizzle-kit migrate` still hangs on the Neon pooler — future migrations must use the manual apply + journal-seed fallback (documented in plan 2).
  - CSRF requires an Origin header for mutating auth endpoints (browser sends it automatically; raw curl needs `-H "Origin: ..."`).
  - `BETTER_AUTH_URL` must be set to the production URL in Vercel before deploying (plan 4).
  - Dashboard is a placeholder (workspace auto-creation + header + sign-out button come in plan 4).
