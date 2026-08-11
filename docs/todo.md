# Todo / Backlog

## Pipeline: Hybrid retrieval + reranker

Add keyword search and a reranker to the ingestion + retrieval pipeline as a future improvement.

### Current state
- **Ingestion** (`src/lib/inngest.ts` `chunkSource`): extract → chunk (~500 chars, 100 overlap) → embed (Gemini `gemini-embedding-001`, 768 dims) → store **only** the vector embedding in the pgvector `chunks` table (HNSW cosine index). No keyword/text index.
- **Retrieval** (`src/lib/retrieval.ts` `retrieveChunks`): embed query → pgvector cosine similarity top-K (default 5, clamp 1–10), scoped to `kbId`. Purely semantic; no BM25/keyword, no reranker.

### Desired (future)
1. **Hybrid retrieval**: index the same chunks for keyword search (BM25 or Postgres full-text) alongside the vector embeddings, and query both at retrieval time.
2. **Merge + dedup**: vector and keyword results overlap (same chunks indexed twice), so dedup candidates by chunk id before ranking.
3. **Reranker**: re-rank the merged candidate set (not the whole corpus) with a cross-encoder before passing the top chunks to the LLM for the grounded answer.

### Notes
- Candidates retrieved first (larger top-K, e.g. 20–50), rerank, then trim to the final top-K fed to the LLM.
- Reranker adds a model dependency + latency; worth it mainly as the KB grows beyond a few hundred chunks.