"use client";

import { useState } from "react";

type RetrievedChunk = {
  content: string;
  sourceId: string;
  index: number;
  score: number;
};

type QueryResponse = {
  answer: string;
  chunks: RetrievedChunk[];
};

export function TestPanel({ kbId }: { kbId: string }) {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/knowledge-bases/${kbId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, topK }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Query failed");
        setResult(null);
        return;
      }
      setResult(data);
    } catch {
      setError("Query failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <form onSubmit={handleAsk} className="flex flex-col gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Ask a question about the sources in this knowledge base…"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            Top chunks
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {[1, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "Asking…" : "Ask"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Retrieving chunks and generating an answer…
        </p>
      )}

      {!loading && result && (
        <>
          <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Answer
            </h2>
            <p className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
              {result.answer}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Retrieved chunks ({result.chunks.length})
            </h2>
            {result.chunks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No chunks found — ingest sources first and make sure they are
                marked ready.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {result.chunks.map((chunk, i) => (
                  <li
                    key={`${chunk.sourceId}-${chunk.index}`}
                    className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        #{i + 1} · source {chunk.sourceId.slice(0, 8)} · chunk{" "}
                        {chunk.index}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        score {(chunk.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                      {chunk.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}