# Embeddable Chat Widget + Dashboard Test Chat

Status: Pending
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
- [ ] Create `public/chat-widget.js` as a monolithic, dependency-free IIFE.
- [ ] Read config from `document.currentScript.dataset`: `agent` (required), `title`, `position` (`bottom-right`/`bottom-left`/`top-right`/`top-left`), `accent` (hex).
- [ ] Fetch `GET /api/public/agents/<id>`; render nothing if the agent is not published/text (404 / non-published).
- [ ] On first open, request the greeting + suggested prompts; render a floating bubble button that toggles a chat panel.
- [ ] Panel: message list, input, send button; render Chat-missing/in-flight states; disable input once `config.maxTurns` reached.
- [ ] On send: `POST /api/public/agents/<id>/chat` with `{ messages }` history; read `response.body` via `ReadableStream` + `TextDecoder`, appending streamed text to the last assistant bubble.
- [ ] Error handling: toasts/inline error bubble on non-200 or network failure; retry button.

### Step 2: Embed snippet UI
- [ ] Create `src/components/embed-agent-dialog.tsx` (shadcn Dialog) that shows:
      raw `<script>` snippet for plain HTML, `next/script` snippet for Next.js App Router, and a `<script>` for React index.html; with a "Copy" button per variant.
- [ ] Compute the snippet's `src` from `window.location.origin` + `/chat-widget.js`.
- [ ] Render an "Embed" button in the agent list/editor row, enabled only for published text agents.

### Step 3: Dashboard test chat
- [ ] Create `src/components/test-chat-dialog.tsx` (React) reusing the same streaming fetch logic; call it with an agent id.
- [ ] Add a "Test chat" button in the agent list/editor row (published text agents), linking to the public chat endpoint.
- [ ] Reuse sonner for errors and the same `config.maxTurns` enforcement.

### Step 4: Verify
- [ ] `npm run build` and `npm run lint` pass.
- [ ] Create + publish a text agent; open Test chat in dashboard; confirm streaming answers work.
- [ ] Put `public/chat-widget.js` snippet on a throwaway static HTML page; confirm bubble renders, greeting appears, and streaming chat works end-to-end.
- [ ] Confirm unpublished / voice agents show no Embed/Test buttons.

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