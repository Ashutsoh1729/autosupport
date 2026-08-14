# Agent Evaluation Product Loop (Idea)

Status: Idea / brainstorm
Date: 2026-08-14
Context: What remains after the core milestones (agent builder, text + voice runtime, analytics) — turning the platform from "infra" into a product where users measurably improve their agents.

## The core loop

Platform provides **eval evidence** -> user tweaks **knobs** -> re-runs evals -> sees precision / cost / latency deltas.

- Platform side: eval harness, tunable knobs, telemetry (traces, transcripts, retrieval hits/misses, latency, cost).
- User side: content, prompt & config tuning informed by eval data.
- Relationship: observability supplies the *data*; evaluation supplies the *score*; eval sits on top of observability.

## Knobs to offer (each with cost/precision/latency shown per eval run)

1. **RAG configuration** — topK, similarity threshold, chunking size/overlap, embedding model, hybrid keyword+semantic, reranking, metadata filtering.
2. **Knowledge content** (biggest lever) — evals surface which questions fail because a KB chunk is missing/bad; user fixes the source doc -> re-test. Ship a "worst questions" view.
3. **Prompt & guardrails** — system prompt, tone, escalation message, max turns (evals show where it escalates or goes off-tone).
4. **Model & voice** — cheaper/faster vs smarter model; voice choice, barge-in sensitivity, latency.

## Key addition: regression evals

- User saves a fixed test-question set; every config change auto-runs it and shows deltas vs previous version.
- Turns evals from a one-off tool into "the way you ship agent improvements."

## What we improve from aggregated (anonymized) eval data

- Better platform defaults (recommended chunking, "your KBs have weak coverage on X").
- The eval harness itself.

## Open questions

- Privacy: what can be aggregated/anonymized vs kept per-workspace.
- Where evals live in the UX (dashboard tab, agent editor, CI-style regression runner).
