# Embeddable Chat Widget + Dashboard Test Chat

Status: Completed
Branch: plan/m3/06-agent-chat-widget

## Description
A zero-dependency embeddable chat widget (vanilla JS) that owners drop into any
HTML / Next.js / React site to put a published **text** agent on their page, plus
an in-dashboard **Test chat** panel so the agent can be tried right after
publishing, without visiting an external site. Both consume the public runtime API
from plan 05, streaming answers as `text/plain`.

## Goals
- `public/chat-widget.js` — script that renders a floating chat bubble + panel for a published text agent.
- Widget configurable via `data-*` attributes on the script tag (agent id, title, position, accent color).
- Live streaming of answers via `fetch` + `ReadableStream` reader, zero dependencies.
- Greeting + suggested prompts fetched from the public metadata endpoint to bootstrap the panel.
- Embed snippet (with HTML / Next.js `next/script` / React instructions) shown in the dashboard after an agent is published.
- Dashboard **Test chat** dialog that talks to the same public endpoint, for quick manual testing.

## Workflow
1. Owner publishes a text agent → dashboard shows an "Embed" action with a copyable snippet.
2. On their site they paste `<script src=".../chat-widget.js" data-agent="<id>"></script>` (or `next/script`).
3. On load, the widget `GET`s the public metadata endpoint; renders bubble/panel with greeting + suggested prompts.
4. User sends a message → widget `POST`s to the public chat endpoint, reads the stream, and appends the answer live, enforcing `config.maxTurns`.
5. In the dashboard, a "Test chat" button on a published text agent opens the same kind of panel (React), so the owner verifies behaviour without deploying the widget.

## Implementation Steps

### Step 1: Vanilla widget script
- [x] Create `public/chat-widget.js` as a monolithic, dependency-free IIFE.
- [x] Read config from `document.currentScript.dataset`: `agent` (required), `title`, `position` (`bottom-right`/`bottom-left`/`top-right`/`top-left`), `accent` (hex).
- [x] Fetch `GET /api/public/agents/<id>`; render nothing if the agent is not published/text (404 / non-published).
- [x] On first open, request the greeting + suggested prompts; render a floating bubble button that toggles a chat panel.
- [x] Panel: message list, input, send button; render Chat-missing/in-flight states; disable input once `config.maxTurns` reached.
- [x] On send: `POST /api/public/agents/<id>/chat` with `{ messages }` history; read `response.body` via `ReadableStream` + `TextDecoder`, appending streamed text to the last assistant bubble.
- [x] Error handling: toasts/inline error bubble on non-200 or network failure; retry button.

### Step 2: Embed snippet UI
- [x] Create `src/components/embed-agent-dialog.tsx` (shadcn Dialog) that shows:
      raw `<script>` snippet for plain HTML, `next/script` snippet for Next.js App Router, and a `<script>` for React index.html; with a "Copy" button per variant.
- [x] Compute the snippet's `src` from `window.location.origin` + `/chat-widget.js`.
- [x] Render an "Embed" button in the agent list/editor row, enabled only for published text agents.

### Step 3: Dashboard test chat
- [x] Create `src/components/test-chat-dialog.tsx` (React) reusing the same streaming fetch logic; call it with an agent id.
- [x] Add a "Test chat" button in the agent list/editor row (published text agents), linking to the public chat endpoint.
- [x] Reuse sonner for errors and the same `config.maxTurns` enforcement.

### Step 4: Verify
- [x] `npm run build` and `npm run lint` pass.
- [x] Create + publish a text agent; open Test chat in dashboard; confirm streaming answers work.
- [x] Put `public/chat-widget.js` snippet on a throwaway static HTML page; confirm bubble renders, greeting appears, and streaming chat works end-to-end.
- [x] Confirm unpublished / voice agents show no Embed/Test buttons.

---

## Files to Modify
- `public/chat-widget.js` — new vanilla JS widget
- `src/components/embed-agent-dialog.tsx` — new Embed snippet dialog
- `src/components/test-chat-dialog.tsx` — new dashboard Test chat dialog
- `src/components/agent-list.tsx` (or `agent-editor.tsx`) — Embed + Test chat buttons

## Functional Components

| Function | File | Role |
|----------|------|------|
| Widget IIFE + main | `public/chat-widget.js` | Renders bubble/panel, streams answers, enforces maxTurns |
| `readStream` (reader loop) | `public/chat-widget.js` | Consumes `text/plain` stream from chat endpoint |
| `EmbedAgentDialog` | `src/components/embed-agent-dialog.tsx` | Copyable HTML/Next/React snippets |
| `TestChatDialog` | `src/components/test-chat-dialog.tsx` | In-dashboard chat testing |

## Data Model
No new tables. Public metadata payload from plan 05:
```ts
{ id, name, status, config: { greeting, tone, suggestedPrompts, maxTurns } }
```
Chat request/response contracts are identical to the plan-05 public endpoint.

## Boundaries
- Widget is served from `public/` at the app's own origin (`<origin>/chat-widget.js`), so no CORS setup needed.
- No localStorage persistence of history in v1 (state held in memory per session).
- The widget never exposes internal data; it only calls the two public endpoints.

## Considerations
- Widget must be plain JS with no imports — keep it self-contained; avoid TS/JSX build steps for it.
- Use `window.location.origin` for the snippet URL to support preview/staging environments automatically.
- `maxTurns` enforcement in the widget avoids unbounded LLM cost from public use.
- Voice agents and unpublished text agents must not expose Embed/Test actions.
- History is memory-only; refreshing the page starts a fresh conversation (acceptable for M3, note for M6 persistence).

---

## Execution Notes

### Architecture
- The embeddable widget is a single dependency-free IIFE (`public/chat-widget.js`) served from
  the app's own origin. It reads config from `data-*` attributes on its `<script>` tag, fetches
  the public metadata endpoint (plan 05) for greeting/suggested prompts/maxTurns, and streams
  answers from the public chat endpoint via a `ReadableStream` reader.
- **Cross-site embedding:** the widget's API base is derived from the script's own `src` URL
  (not `window.location.origin`), so it works when pasted into arbitrary HTML/Next/React sites.
  Because the widget runs on the host page but calls this app's API, the two public endpoints
  now send `Access-Control-Allow-Origin: *` and handle OPTIONS preflight via a shared
  `src/lib/public-cors.ts` helper.
- The dashboard Test chat dialog (`TestChatDialog`) and the embed dialog
  (`EmbedAgentDialog`) are shadcn Radix dialogs wired into `AgentList` — both only appear for
  published text agents.

### How each step was implemented
- **Step 1 (widget):** `public/chat-widget.js` is a self-contained IIFE. Bubble button opens a
  slide panel; greeting + suggested-prompt chips render on first open; `maxTurns` disables the
  input once the user-turn budget is spent. Streaming uses `fetch` → `read()` → `TextDecoder`.
  Verified with a headless Node DOM harness: mounts root, opens panel, renders greeting, and
  streams a mock reply into the assistant bubble.
- **Step 2 (embed UI):** `EmbedAgentDialog` shows three copyable variants (plain HTML
  `<script>`, Next.js `next/script` + import, React `<script>` in `index.html`) with a
  per-variant copy button. The script URL uses `window.location.origin` so the snippet stays
  valid across preview/staging/prod.
- **Step 3 (test chat):** `TestChatDialog` renders a full chat widget in a dialog, posts
  `{ messages }` history to the public chat endpoint, and appends the streamed reply
  incrementally. Suggested prompts are rendered as quick-action buttons; enforced `maxTurns`.

### Files Created
- `public/chat-widget.js` — zero-dependency embeddable chat widget
- `src/components/embed-agent-dialog.tsx` — embed snippet dialog (HTML/Next/React + copy)
- `src/components/test-chat-dialog.tsx` — dashboard test chat dialog
- `src/lib/public-cors.ts` — shared CORS headers + OPTIONS + `withCors` helper

### Files Modified
- `src/components/agent-list.tsx` — row now a button (select) + action cluster (Test chat/Embed)
  for published text agents
- `src/app/api/public/agents/[agentId]/route.ts` — CORS on metadata responses + OPTIONS
- `src/app/api/public/agents/[agentId]/chat/route.ts` — CORS on all responses incl. stream

### Verification
- `npm run build` + `npm run lint` pass.
- curl: metadata + chat return `access-control-allow-origin: *` on every response path
  (200/404/stream); OPTIONS preflight returns 204.
- Headless Node DOM harness proved the widget mounts, opens, renders the greeting, sends a
  message, and appends the streamed answer.
- `public/chat-widget.js` passes `node --check`.

### Remaining / Known Gaps
- No `localStorage`/`sessionStorage` history persistence — refreshing the page starts a fresh
  conversation (deferred to M6).
- Widget has no config UI (title/position/accent are manual `data-*` attrs).
- No inline `iframe` sandbox or CSP guidance yet.
- Test chat / widget share the model only through the public endpoint; no per-agent turn
  reporting/analytics (M5).