# Voice Infra & Test Token

Status: In Progress
Branch: plan/m4/01-voice-infra

## Description
Wire the M4 voice-runtime foundation: LiveKit Cloud credentials (free Build tier),
the server SDK, and a tenancy-guarded endpoint that issues a short-lived LiveKit
room + access token for a **published voice** agent. This token is what the browser
test console (plan 03) and the voice agent worker (plan 02) use to join the same room.

## Goals
- Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and `DEEPGRAM_API_KEY` to `.env.example`.
- Install `livekit-server-sdk`.
- Create `src/lib/livekit.ts` with `createVoiceSession(agentId)` → `{ url, room, token }`.
- Add `POST /api/agents/[id]/test-token` returning the session for a published **voice** agent.
- Reject non-voice, unpublished, or inaccessible agents (404/400), mirroring existing tenancy guards.
- Verify token issuance with curl against a dev server.

## Workflow
1. Dashboard "Test call" (plan 03) or any caller hits `POST /api/agents/[id]/test-token`.
2. Route validates the agent belongs to the caller's workspace and is a published `voice` agent.
3. `src/lib/livekit.ts` creates a unique room name (agent-scoped), mints a LiveKit `AccessToken`
   with room-join grants for a caller identity, and returns `{ url, room, token }`.
4. The browser connects with `livekit-client` using that token; the worker (plan 02) joins via the room.

## Implementation Steps

### Step 1: Env & dependency
- [x] Add to `.env.example`: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `DEEPGRAM_API_KEY`.
- [x] `npm install livekit-server-sdk`.

### Step 2: LiveKit helper
- [x] Create `src/lib/livekit.ts` exporting `createVoiceSession(agentId: string)`.
- [x] Build `{ url, room, token }`: room name like `agent-<agentId>-<timestamp>`, token with
      `AccessToken({ identity, ttl: "15m", apiKey, apiSecret })` and grants to join/publish/subscribe
      the room. Read env from `process.env`.
- [x] Export `roomUrl`, `livekitApiKey`, `livekitApiSecret` getters with a clear error when unset.

### Step 3: Test-token route
- [x] Create `src/app/api/agents/[id]/test-token/route.ts` (POST).
- [x] Reuse `requireAgentAccess` (in `src/lib/tenancy.ts`) for ownership; 404 when missing.
- [x] Require `agent.channel === "voice"` and `agent.status === "published"`; else 400 with a clear message.
- [x] Return `NextResponse.json(await createVoiceSession(agent.id))`.

### Step 4: Verify
- [x] `npm run build` and `npm run lint` pass.
- [ ] Start dev server; sign in; curl the endpoint for a published voice agent → assert 200 with
      `{ url, room, token }`; assert 400 for draft/text agents and 404 for unknown ids.

---

## Files to Modify
- `.env.example` — new LiveKit + Deepgram keys
- `package.json` — add `livekit-server-sdk`
- `src/lib/livekit.ts` — new helper
- `src/app/api/agents/[id]/test-token/route.ts` — new endpoint

## Functional Components

| Function | File | Role |
|----------|------|------|
| `createVoiceSession(agentId)` | `src/lib/livekit.ts` | Creates LiveKit room + short-lived access token |
| `POST /api/agents/[id]/test-token` | `route.ts` | Tenancy-guarded token issuance for voice agents |

## Data Model
No new tables. Consumes the existing `agents` row (`channel`, `status`). Returns a plain JSON
session object:
```ts
{ url: string; room: string; token: string }
```

## Boundaries
- Token is short-lived (15 min), room-scoped, join/publish/subscribe only — no admin grants.
- The endpoint is authenticated (user session via Better Auth) and tenancy-guarded.
- Voice agents only; draft or text agents are rejected.

## Considerations
- LiveKit free Build tier: 1,000 agent minutes / month, no credit card — fine for a portfolio demo.
- Guard against unset env: fail fast with a descriptive error rather than a LiveKit SDK stack trace.
- Room name uniqueness: include a timestamp; the worker (plan 02) will need the room name, so keep
  the format deterministic (e.g. `agent-<agentId>-<epochMs>`).
