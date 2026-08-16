# Voice Agent Worker (LiveKit)

Status: Complete (live-verified end-to-end)
Branch: plan/m4/02-voice-worker

## Description
A standalone LiveKit agent worker that joins the room issued by plan 01 and runs the
voice pipeline end-to-end: Deepgram STT (Nova-3) → RAG retrieval over the agent's KBs →
AI SDK chat model → Deepgram TTS (Aura-2), with barge-in/turn-taking and an end-call keyword.
It loads the agent's own `systemPrompt`, `guardrails`, and `voiceConfig` (voice, language,
interruption sensitivity, greeting, escalation fallback) at join time, so each agent sounds
and behaves per its configuration.

## Goals
- Run a LiveKit `Worker` (in the app repo) that listens for jobs and joins the room.
- STT via Deepgram Nova-3 (streaming), TTS via Deepgram Aura-2.
- Answer generation reuses the existing AI SDK `chatModel` and `retrieveChunks` for RAG.
- Speak the agent's `config.greeting` on join; escalate with `escalationMessage` when retrieval is empty.
- Support interruption (barge-in) and a voice-configurable end-call keyword.
- Register the worker in `mprocs.yaml` so `mprocs` starts `next`, `inngest`, and the worker together.

## Workflow
1. Browser (plan 03) requests a session (plan 01), connects to the LiveKit room.
2. LiveKit routes the room to the worker via dispatch/job; the worker loads the agent by
   agent id (from room metadata or a job attribute).
3. Worker starts the `VoicePipelineAgent` with Deepgram STT + TTS and an LLM callback.
4. On each user turn: transcribed text → `retrieveChunks(agent.kbIds, query, topK, minScore)`
   → LLM answer grounded in the agent prompt + retrieved context → Aura-2 speaks it.
5. End-call keyword or session end tears down the agent and closes the room.

## Implementation Steps

### Step 1: Dependencies & worker skeleton
- [x] `npm install @livekit/agents @livekit/rtc-node @livekit/agents-plugin-deepgram`
- [x] Create `src/voice-agent/worker.ts` registering a LiveKit `Worker` on `LIVEKIT_URL` using the API key/secret.
      (v1.6.3 API: `defineAgent` + `cli.runApp(new ServerOptions(...))`; the CLI needs the `start` subcommand, so the
      mprocs command is `npx tsx src/voice-agent/worker.ts start`.)
- [x] Add `voice-agent: shell: "npx tsx src/voice-agent/worker.ts start"` to `mprocs.yaml`.

### Step 2: Agent loading
- [x] Add `loadPublishedVoiceAgent(agentId)` in `src/lib/agent-runtime.ts` (mirror `loadPublishedTextAgent`)
      returning the full agent row for a published `voice` agent or `null`.
- [x] Derive voice settings (Deepgram voice id, language, interruption sensitivity, end-call keyword)
      from `agent.voiceConfig`; derive greeting/escalation from `agent.config` (with safe defaults).

### Step 3: LLM + RAG callback
- [x] Create `src/lib/voice-answer.ts` exporting `answerTurn(query, agent, history)` that:
      calls `retrieveChunks(agent.kbIds, query, agent.topK, agent.similarityThreshold)`,
      builds the system prompt via `buildAgentSystemPrompt(agent)` (reuse from M3),
      and returns the `chatModel` streaming reply.
- [x] Return the canned `escalationMessage` streamed when zero chunks retrieved
      (`resolveEscalationMessage` prefers the agent's `escalationMessage` column, then `config.escalationMessage`).

### Step 4: Wire the pipeline
- [x] In `worker.ts`, configure the voice pipeline with Deepgram STT (`nova-3`, `nova-3-multilingual` for non-English),
      Deepgram TTS (`aura-2`, mapped from the agent's voice id), and the `answerTurn` callback via an
      `AgentSession` + `Agent.create` `onUserTurnCompleted` hook (the v1.6.3 replacement for `VoicePipelineAgent`);
      enable turn-detection/barge-in per `voiceConfig` (`turnHandling.interruption`).
- [x] Speak greeting on session start; watch for the end-call keyword to terminate.
- [x] Ensure the worker cleans up (close agent, end room) on disconnect
      (`deleteRoomOnClose` + shutdown callback + waiting on the session close event).

### Step 5: Verify
- [x] `npm run build` and `npm run lint` pass.
- [x] Start the worker; confirm it logs "ready" and registers with LiveKit Cloud (ran `npx tsx --env-file=.env src/voice-agent/worker.ts start` with LIVEKIT_* and DEEPGRAM keys; the `mprocs` `voice-agent` entry uses the same command).
- [x] Place a call (test caller + `livekit-cli`, standing in for plan 03's console) and confirm the agent greets,
      answers a RAG-grounded question, escalates on empty retrieval, and ends on the keyword — all four
      verified live: greeting "Hi. This is a sales agent...", RAG answer about the autosupport test kit,
      escalation fallback when the KB was empty, and room close on "end call".

---

## Files to Modify
- `src/voice-agent/worker.ts` — new LiveKit worker
- `src/lib/agent-runtime.ts` — add `loadPublishedVoiceAgent`
- `src/lib/voice-answer.ts` — new RAG→LLM answer builder
- `mprocs.yaml` — add `voice-agent` process
- `package.json` — LiveKit agent + Deepgram plugin deps

## Functional Components

| Function | File | Role |
|----------|------|------|
| `Worker` | `src/voice-agent/worker.ts` | Joins rooms, drives the voice pipeline |
| `VoicePipelineAgent` | `src/voice-agent/worker.ts` | STT→LLM→TTS orchestration with barge-in |
| `loadPublishedVoiceAgent(agentId)` | `src/lib/agent-runtime.ts` | Validated voice-agent loader |
| `answerTurn(query, agent, history)` | `src/lib/voice-answer.ts` | RAG + grounded LLM answer |

## Data Model
No new tables. Reads the `agents` row and its `config` / `voiceConfig` jsonb:
- `config.greeting`, `config.escalationMessage`, `config.tone`, `config.maxTurns`
- `voiceConfig.voice`, `voiceConfig.language`, `voiceConfig.interruptionSensitivity`, `voiceConfig.endCallKeyword`

## Boundaries
- The worker is a **separate process** from Next.js (same repo, started by `mprocs`), not a route handler.
- It authenticates to LiveKit with `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`, not user sessions.
- LiveKit Build free tier: 1,000 agent minutes/month — enough for the demo.
- No persistence of transcripts/calls here (that is M5 analytics).

## Considerations
- Latency is the demo's success metric: keep STT/TTS streaming, parallelize retrieval with the STT result.
- `voiceConfig` may be sparse for older agents — supply safe defaults for every field read.
- Reuse M3 helpers (`retrieveChunks`, `buildAgentSystemPrompt`) instead of duplicating prompt logic.
- The worker needs to know which agent a room belongs to: encode `agentId` in room metadata or the
  job payload from plan 01's session creation.
