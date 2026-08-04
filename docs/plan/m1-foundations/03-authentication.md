# M1 Foundations — Plan 3: Authentication

Status: Pending

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
- [ ] Run `npm install better-auth`
- [ ] Run `npx @better-auth/cli generate` and point the CLI at the Drizzle setup (it creates `src/lib/db/auth-schema.ts` with `user`, `session`, `account`, `verification` tables)
- [ ] Run `npx drizzle-kit generate` then `npx drizzle-kit migrate` to apply the auth tables to Neon
- [ ] Create `src/lib/auth.ts`: `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), emailAndPassword: { enabled: true } })`
- [ ] Create `src/lib/auth-client.ts` exporting `authClient = createAuthClient()` from `better-auth/react`

### Step 2: Route handler
- [ ] Create `src/app/api/auth/[...all]/route.ts` exporting the Better Auth `handlers` (`toNextJsHandler`)

### Step 3: Login & signup pages
- [ ] Create `src/app/login/page.tsx` with a client `LoginForm` that calls `authClient.signIn.email({ email, password })` and shows an error on failure
- [ ] Create `src/app/signup/page.tsx` with a client `SignupForm` that calls `authClient.signUp.email({ email, password, name })` and shows a field-level error on failure (e.g. duplicate email)
- [ ] Add links between `/login`, `/signup`, and the landing page

### Step 4: Route protection
- [ ] Protect `/dashboard` in the page's server component (built in plan 4): call `auth.api.getSession({ headers: await headers() })` and `redirect("/login")` when there is no session
- [ ] Verify locally: visiting `/dashboard` while logged out redirects to `/login`

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
