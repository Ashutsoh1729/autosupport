# Text Agent Runtime (Public Chat API)

Status: Pending
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
- [ ] In `src/lib/retrieval.ts`, generalize `retrieveChunks` to accept `kbIds: string[]`
      (replacing the single `kbId` parameter) and add an optional `minScore` argument.
- [ ] Use `inArray(chunks.kbId, kbIds)` so the SQL covers all attached KBs at once.
- [ ] Add `WHERE 1 - (embedding <=> $vector) >= minScore` when `minScore` is provided,
      defaulting to no threshold when omitted.
- [ ] Update the single caller `src/app/api/knowledge-bases/[kbId]/query/route.ts`
      to pass `[kbId]` and keep its existing behaviour.

### Step 2: Runtime helpers
- [ ] Create `src/lib/agent-runtime.ts` with `loadPublishedTextAgent(agentId)` that returns
      `null` for non-UUID / missing / non-text / non-published agents (single lookup).
- [ ] Add `buildAgentSystemPrompt(agent)` merging `systemPrompt`, `guardrails`, and
      `config.tone` into one grounded-support prompt string.
- [ ] Add `lastUserMessage(messages)` returning the trimmed last `user` message or `null`.

### Step 3: Public chat route
- [ ] Create `src/app/api/public/agents/[agentId]/chat/route.ts` (POST).
- [ ] Validate agent via `loadPublishedTextAgent`; 404 when invalid.
- [ ] Parse `messages`; require at least one message; take the last user message as query.
- [ ] Truncate history to the last 20 messages before handing to the model.
- [ ] Call `retrieveChunks(agent.kbIds, query, agent.topK, agent.similarityThreshold)`.
- [ ] If zero chunks, stream the canned `NO_CONTEXT_ANSWER` reply as `text/plain`.
- [ ] Otherwise `streamText({ model: chatModel, system, messages })` and return
      `result.textStream.toTextStreamResponse()`.

### Step 4: Public agent metadata route
- [ ] Create `src/app/api/public/agents/[agentId]/route.ts` (GET) returning only
      public fields: `{ id, name, status, config }` (greeting, tone, suggestedPrompts). 404 for unknown ids.
- [ ] This feeds the widget's initial greeting + suggested prompts (plan 06).

### Step 5: Verify
- [ ] `npm run build` and `npm run lint` pass.
- [ ] Test via curl: create a published text agent with KBs, then confirm a streaming
      answer arrives; confirm unpublished/voice/missing ids return 404.
- [ ] Confirm empty-KB / low-similarity queries return the canned no-context reply.

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