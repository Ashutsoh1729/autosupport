# Voice Agent Platform — Product Specification

## 1. Overview

A self-serve SaaS platform where businesses can create AI-powered customer support agents that answer calls with a natural-sounding voice. Any business owner signs up, feeds the platform their knowledge (FAQ, documents, website content), configures an agent's personality and voice, and deploys it — then the agent handles real conversations, escalates when needed, and provides transcripts and analytics.

The product is built to demonstrate a complete, production-minded voice AI platform: multi-tenant accounts, a knowledge base engine, an agent builder, a live voice runtime, and an analytics dashboard.

## 2. Goals

- Showcase a full-stack product: auth, multi-tenancy, RAG knowledge base, bot configuration, real-time voice, and analytics.
- Run on a free tier for a portfolio demo (no card required to test).

## 3. Non-Goals (MVP)

- Billing/payments (future).
- PSTN phone-number provisioning (optional stretch: inbound number).
- Visual flow/node builder (future; single-prompt agents only).
- Multi-agent orchestration and warm transfers (future).
- Enterprise compliance (SOC 2, HIPAA).

## 4. Users & Roles

| Role            | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| Owner           | Creates the workspace, manages everything                            |
| Member (future) | Invited users with scoped permissions                                |
| End customer    | The real person who calls/visits and talks to the agent (no account) |

## 5. Core User Flows

1. **Sign up** → create an account and a default workspace.
2. **Build a knowledge base** → upload files (PDF/TXT/MD), add raw text, or import a URL; the system chunks and indexes it.
3. **Create an agent** → set a name, system prompt/personality, guardrails, select a voice + language, and attach one or more knowledge bases.
4. **Test the agent** → open the test console, press call, and converse via browser mic/speaker.
5. **Deploy (stretch)** → get a phone number or embeddable widget link.
6. **Review** → view call history, transcripts, recordings, and simple analytics.

## 6. Functional Requirements

### 6.1 Accounts & Workspaces

- Email/password auth (Better Auth), optional social login (Google) later.
- Each user gets a workspace; agents and knowledge bases belong to a workspace (multi-tenant isolation).
- Members (future): invite + role scoping.

### 6.2 Knowledge Base Engine

- Sources: text input, file upload (PDF, TXT, MD; DOCX later), public URL import.
- Pipeline: extract → chunk → embed → store in vector DB (pgvector) with workspace isolation.
- Per-source status: queued → processing → ready | failed.
- Test panel: ask a question and see retrieved chunks + answer.

### 6.3 Agent Builder

- Identity: name, system prompt, example phrases, guardrails.
- Voice: pick from provider voice list; language selection.
- Knowledge: attach KB(s), retrieval settings (chunk count, similarity threshold).
- Behavior: interruption sensitivity, end-call keyword handling, escalation fallback message.
- Save as draft → publish.

### 6.4 Voice Runtime (Browser Widget — primary)

- Real-time pipeline: STT → (RAG retrieval) → LLM → TTS, streamed with turn-taking/barge-in.
- Browser-based call via WebRTC (mic + speaker), no telephony needed.
- Optional stretch: inbound phone number (US) via telephony provider.

### 6.5 Call Analytics

- Per call: status, duration, timestamps, full transcript, optional recording, outcome summary.
- Workspace dashboard: total calls, avg duration, top intents (future), recent calls.

### 6.6 Admin Dashboard

- Overview page, KB manager, agent list + editor, test console, call history.

## 7. Tech Stack

> Pin one concrete choice per layer. Plans are created from this table — ambiguity here causes plan drift.

| Layer            | Choice                                                   |
| ---------------- | -------------------------------------------------------- |
| Frontend/Backend | Next.js (App Router) + TypeScript, route handlers        |
| Database         | Neon (Postgres) + pgvector extension                     |
| ORM              | Drizzle ORM + `pg` driver                                |
| Auth             | Better Auth (email/password) + Drizzle adapter         |
| Voice runtime    | LiveKit (Build free tier) — WebRTC + Agents              |
| STT              | Deepgram (free credits)                                  |
| TTS              | Deepgram / ElevenLabs                                    |
| LLM              | DeepSeek (primary) / Gemini Flash, swap-able             |
| Embeddings       | OpenAI / Cohere / Gemini                                 |
| Deploy           | Vercel free tier; Neon free tier for DB                  |

## 8. High-Level Architecture

```
[Browser]  ── WebRTC ──▶  [LiveKit Room]
                             │ audio
                             ▼
                     [Voice Agent Worker]
                       STT → retrieve(KB) → LLM → TTS
                             │
                     [Vector DB (pgvector)]
                             │
[Next.js App] ── REST ──▶ [API routes] ──▶ [Postgres]
  dashboard/builder            │
                     [Background jobs: chunk+embed]
```

- The Next.js app serves the dashboard and admin API.
- The voice agent worker bridges WebRTC audio to the STT → RAG → LLM → TTS loop.
- Knowledge base ingestion runs as a background job.

## 9. Data Model (Initial)

Better Auth manages auth tables via its Drizzle adapter: `user`, `session`, `account`, `verification`. Application tables:

- `workspaces` — id, name, createdAt
- `memberships` — workspaceId, userId, role (owner/member)
- `knowledge_bases` — id, workspaceId, name, createdAt
- `knowledge_sources` — id, kbId, type (text|file|url), status, contentRef
- `chunks` — id, sourceId, index, content, embedding (vector), kbId
- `agents` — id, workspaceId, name, systemPrompt, guardrails, voiceId, language, kbIds, status (draft|published)
- `calls` — id, workspaceId, agentId, status, startedAt, endedAt, durationMs, transcriptJson, recordingUrl (optional), summary

## 10. API Surface (High Level)

- `POST /api/auth/*`
- `GET/POST /api/workspaces`
- `GET/POST/PUT/DELETE /api/knowledge-bases`
- `GET/POST /api/knowledge-bases/:id/sources` (upload/text/url)
- `GET/POST /api/agents` ; `PUT /api/agents/:id` ; `POST /api/agents/:id/publish`
- `POST /api/agents/:id/test-token` (issue short-lived voice session token)
- `GET /api/calls` ; `GET /api/calls/:id`
- `POST /api/agents/:id/query` (text Q&A against KB for test panel)

## 11. Free-Tier Constraints & Demo Budget

- LiveKit Build: 1,000 agent minutes/mo, 5 concurrent sessions — plenty for a demo.
- Deepgram: $200 starter credits.
- LLM/embeddings: free-tier quotas (DeepSeek credits / Gemini Flash).
- Browser-widget voice avoids all telephony cost.
- Design the test console so a 2–5 minute call fully demonstrates the product.

## 12. MVP Scope (Milestones)

1. **M1 — Foundations**: Next.js app, auth, workspace, DB schema, deployable on Vercel.
2. **M2 — Knowledge Base**: text/upload ingestion, chunking, embedding, retrieval, KB test panel.
3. **M3 — Agent Builder**: agent CRUD, prompt/guardrails/voice config, publish.
4. **M4 — Voice Runtime**: LiveKit browser call end-to-end (STT→RAG→LLM→TTS), test console.
5. **M5 — Analytics**: call persistence, transcripts, recordings, dashboard.
6. **M6 (Stretch)**: inbound phone number, widget embed, members.

## 13. Risks & Considerations

- Voice latency: keep pipeline slim (streaming STT/TTS, parallel retrieve).
- Hallucination: ground answers in KB; strict "answer from context only" instructions; guardrails.
- Multi-tenant isolation: every query scoped by workspaceId; test leakage.
- Provider free-tier limits: monitor minutes/tokens; document limits.
- Browser mic permissions & audio UX for demo machines.
