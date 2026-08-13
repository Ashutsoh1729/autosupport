# Text Agent Runtime (Public Chat API)

Status: Completed
Branch: plan/m3/05-agent-text-runtime

## Description
A public, unauthenticated streaming chat endpoint that lets a published **text**
agent answer questions by retrieving across all of its attached knowledge bases
(RAG) and grounding the LLM in the agent's own `systemPrompt`, `guardrails`, and
`config.tone`. This is the runtime surface that the embeddable widget (plan 06)
and the dashboard test chat both consume.

## Goals
- Serve `POST /api/public/agents/[agentId]/chat` — streaming answer with no session required.
- Retrieve across **all** KBs attached to the agent (`agent.kbIds`), not a single KB.
- Respect the agent's `topK` and `similarityThreshold` in retrieval.
- Ground the LLM with the agent's `systemPrompt` + `guardrails` + `config.tone`.
- Return a plain text stream (`text/plain`) so a zero-dependency widget can consume it.
- Only published `text`-channel agents are answerable; everything else returns 404/410.
- Truncate conversation history to a bounded window to cap cost/abuse.
- Emit a canned "no context" reply (streamed) when retrieval finds nothing.

## Workflow
1. External client `POST /api/public/agents/[agentId]/chat` with
   `{ messages: [{ role, content }, ...] }` (conversation history).
2. Server validates the agent exists, is a `text` agent, and is `published`.
3. Server takes the **last user message** as the query, embeds it, and retrieves
   the best chunks across `agent.kbIds` filtered by `similarityThreshold`, limited by `topK`.
4. Server builds a system prompt from `systemPrompt` + `guardrails` + `tone`.
5. `streamText` returns the grounded answer; response is streamed back as `text/plain`.

## Implementation Steps

### Step 1: Multi-KB retrieval
- [x] In `src/lib/retrieval.ts`, generalize `retrieveChunks` to accept `kbIds: string[]`
      (replacing the single `kbId` parameter) and add an optional `minScore` argument.
- [x] Use `inArray(chunks.kbId, kbIds)` so the SQL covers all attached KBs at once.
- [x] Add `WHERE 1 - (embedding <=> $vector) >= minScore` when `minScore` is provided,
      defaulting to no threshold when omitted.
- [x] Update the single caller `src/app/api/knowledge-bases/[kbId]/query/route.ts`
      to pass `[kbId]` and keep its existing behaviour.

### Step 2: Runtime helpers
- [x] Create `src/lib/agent-runtime.ts` with `loadPublishedTextAgent(agentId)` that returns
      `null` for non-UUID / missing / non-text / non-published agents (single lookup).
- [x] Add `buildAgentSystemPrompt(agent)` merging `systemPrompt`, `guardrails`, and
      `config.tone` into one grounded-support prompt string.
- [x] Add `lastUserMessage(messages)` returning the trimmed last `user` message or `null`.

### Step 3: Public chat route
- [x] Create `src/app/api/public/agents/[agentId]/chat/route.ts` (POST).
- [x] Validate agent via `loadPublishedTextAgent`; 404 when invalid.
- [x] Parse `messages`; require at least one message; take the last user message as query.
- [x] Truncate history to the last 20 messages before handing to the model.
- [x] Call `retrieveChunks(agent.kbIds, query, agent.topK, agent.similarityThreshold)`.
- [x] If zero chunks, stream the canned `NO_CONTEXT_ANSWER` reply as `text/plain`.
- [x] Otherwise `streamText({ model: chatModel, system, messages })` and return
      `result.textStream.toTextStreamResponse()`.

### Step 4: Public agent metadata route
- [x] Create `src/app/api/public/agents/[agentId]/route.ts` (GET) returning only
      public fields: `{ id, name, status, config }` (greeting, tone, suggestedPrompts). 404 for unknown ids.
- [x] This feeds the widget's initial greeting + suggested prompts (plan 06).

### Step 5: Verify
- [x] `npm run build` and `npm run lint` pass.
- [x] Test via curl: create a published text agent with KBs, then confirm a streaming
      answer arrives; confirm unpublished/voice/missing ids return 404.
- [x] Confirm empty-KB / low-similarity queries return the canned no-context reply.

---

## Files to Modify
- `src/lib/retrieval.ts` — multi-KB + threshold retrieval
- `src/app/api/knowledge-bases/[kbId]/query/route.ts` — updated caller
- `src/lib/agent-runtime.ts` — new helpers
- `src/app/api/public/agents/[agentId]/chat/route.ts` — new public chat endpoint
- `src/app/api/public/agents/[agentId]/route.ts` — new public metadata endpoint

## Functional Components

| Function | File | Role |
|----------|------|------|
| `retrieveChunks(kbIds, query, topK, minScore)` | `src/lib/retrieval.ts` | Multi-KB vector search with threshold |
| `loadPublishedTextAgent(agentId)` | `src/lib/agent-runtime.ts` | Validates text/published agent or null |
| `buildAgentSystemPrompt(agent)` | `src/lib/agent-runtime.ts` | Composes grounded prompt from agent config |
| `lastUserMessage(messages)` | `src/lib/agent-runtime.ts` | Extracts the current query |
| `POST /api/public/agents/[agentId]/chat` | `chat/route.ts` | Streaming grounded answer |
| `GET /api/public/agents/[agentId]` | `route.ts` | Public metadata for widget bootstrap |

## Data Model
No new tables. Consumes the existing `agents` row:
- `channel === "text"`, `status === "published"`, `kbIds: uuid[]`, `topK: int`, `similarityThreshold: real`,
  `systemPrompt`, `guardrails`, `config: { tone, greeting, suggestedPrompts, ... }`.

Request body (chat):
```ts
{ messages: Array<{ role: "user" | "assistant"; content: string }> }
```

## Boundaries
- **No session auth** — this is a public endpoint; security comes from the agent
  being published and the bounded history window. Rate limiting is out of scope (note).
- Chat-response contract: streaming `text/plain`. Non-stream paths are `application/json` errors with `{ error }`.
- Voice agents are never answerable here (404).

## Considerations
- Embedding + `chatModel` calls are the same provider-agnostic utilities in `src/lib/ai.ts`.
- `chatModel` prompt uses the agent's system prompt, not the hardcoded M2 KB-query prompt.
- Add a plain-text answer even for the no-context case so the widget doesn't need a special branch.
- Rate limiting, streaming failure retries, and model provider fallbacks are deferred.

---

## Execution Notes

### Architecture
- The public chat endpoint is deliberately auth-free: `loadPublishedTextAgent` gates on
  UUID validity + agent existing + `channel === "text"` + `status === "published"` (all in one
  lookup), so unpublished/voice/missing agents all return 404 uniformly.
- Conversation history is client-supplied (`messages`) and truncated server-side to the last
  20 messages (`MAX_HISTORY`) before calling the model — no session storage.
- The grounded prompt is assembled with `buildAgentSystemPrompt` (systemPrompt + guardrails +
  tone) plus a `Context:` block of retrieved chunks, so the model answers only from the KB.

### How each step was implemented
- **Step 1 (multi-KB retrieval):** `retrieveChunks` now takes `kbIds: string[]` and an optional
  `minScore` (similarity threshold). Because the query is raw SQL, the kb list is inlined as
  `ARRAY[${id1}::uuid, ...]` rather than drizzle's `inArray` (the raw `ANY(${kbIds}::uuid[])`
  form broke because drizzle flattens array params into a single scalar — caught in testing).
  The only prior caller (`[kbId]/query/route.ts`) passes `[kbId]`, preserving M2 behaviour.
- **Step 2 (runtime helpers):** `loadPublishedTextAgent`, `buildAgentSystemPrompt`,
  `lastUserMessage`, and `parseChatMessages` live in the new `src/lib/agent-runtime.ts`.
  `parseChatMessages` also performs validation and returns a `{ messages | error }` union so the
  route stays thin.
- **Step 3 (chat route):** `POST /api/public/agents/[agentId]/chat` streams the answer.
  Two deviations from the plan text: (a) `result.toTextStreamResponse()` is used instead of
  `result.textStream.toTextStreamResponse()` — in AI SDK v7 the helper is on the streamText
  result, not the inner stream; (b) a `textStreamResponse(text)` helper streams the canned
  no-context reply through a `ReadableStream` so error/no-hit cases return the same
  `text/plain` contract as a normal answer.
- **Step 4 (metadata route):** `GET /api/public/agents/[agentId]` returns only public fields
  (`id`, `name`, `status`, `channel`, `config` with greeting/tone/suggestedPrompts/maxTurns).

### Files Created
- `src/lib/agent-runtime.ts` — public-runtime helpers + message parsing/validation
- `src/app/api/public/agents/[agentId]/chat/route.ts` — streaming grounded-answer endpoint
- `src/app/api/public/agents/[agentId]/route.ts` — public agent metadata endpoint

### Files Modified
- `src/lib/retrieval.ts` — multi-KB (`ARRAY[...]::uuid`) + `minScore` threshold support
- `src/app/api/knowledge-bases/[kbId]/query/route.ts` — updated to new `retrieveChunks` signature

### Verification
- `npm run build` + `npm run lint` pass.
- curl tests: published text agent streams grounded answers (single + follow-up history); empty
  KB returns the canned no-context reply as `text/plain`; empty body / no-user-message / >20
  messages (malformed payload) return 400; unpublished agent and missing UUID return 404.
- The chat model answered follow-ups correctly using conversation history.

### Remaining / Known Gaps
- No rate limiting or per-agent usage caps on the public endpoint.
- Greeting is returned in metadata but not auto-injected into the first assistant turn
  (widget renders it client-side; see plan 06).
- `config.maxTurns` is metadata only — enforcement lives in the widget/test chat, not the API.
- Streaming failure retries and LLM provider fallback (Gemini↔OpenRouter) not implemented.