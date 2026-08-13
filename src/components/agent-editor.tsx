"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent } from "@/lib/db/schema";
import { VOICES, LANGUAGES } from "@/lib/voices";

type KnowledgeBaseRow = { id: string; name: string; createdAt: Date };

function toFieldState(value?: string): string {
  return value ?? "";
}

function toPhrasesInput(phrases: string[] | undefined | null): string {
  return (phrases ?? []).join(", ");
}

function parsePhrases(input: string): string[] {
  return input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function AgentEditor({
  projectId,
  agent,
  kbs,
  onSaved,
}: {
  projectId: string;
  agent: Agent | null;
  kbs: KnowledgeBaseRow[];
  onSaved: (agent: Agent) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(toFieldState(agent?.name));
  const [systemPrompt, setSystemPrompt] = useState(
    toFieldState(agent?.systemPrompt),
  );
  const [guardrails, setGuardrails] = useState(toFieldState(agent?.guardrails));
  const [examplePhrases, setExamplePhrases] = useState(
    toPhrasesInput(agent?.examplePhrases),
  );
  const [voiceId, setVoiceId] = useState(
    toFieldState(agent?.voiceId) || VOICES[0].id,
  );
  const [language, setLanguage] = useState(
    toFieldState(agent?.language) || LANGUAGES[0].code,
  );
  const [kbIds, setKbIds] = useState<string[]>(agent?.kbIds ?? []);
  const [topK, setTopK] = useState(String(agent?.topK ?? 4));
  const [similarityThreshold, setSimilarityThreshold] = useState(
    String(agent?.similarityThreshold ?? 0.3),
  );
  const [interruptionSensitivity, setInterruptionSensitivity] = useState(
    toFieldState(agent?.interruptionSensitivity) || "medium",
  );
  const [endCallKeyword, setEndCallKeyword] = useState(
    toFieldState(agent?.endCallKeyword) || "end call",
  );
  const [escalationMessage, setEscalationMessage] = useState(
    toFieldState(agent?.escalationMessage),
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleKb(id: string) {
    setKbIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  }

  function buildPayload() {
    return {
      name,
      systemPrompt,
      guardrails,
      examplePhrases: parsePhrases(examplePhrases),
      voiceId,
      language,
      kbIds,
      topK: Number(topK),
      similarityThreshold: Number(similarityThreshold),
      interruptionSensitivity,
      endCallKeyword,
      escalationMessage,
    };
  }

  async function persist() {
    const res = agent
      ? await fetch(`/api/agents/${agent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        })
      : await fetch(`/api/projects/${projectId}/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Failed to save agent");
      return null;
    }
    setError(null);
    return data as Agent;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      router.refresh();
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    try {
      let target = agent;
      if (!target) {
        target = await persist();
        if (!target) return;
      }
      const res = await fetch(`/api/agents/${target.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to publish agent");
        return;
      }
      router.refresh();
      onSaved(data);
    } finally {
      setSaving(false);
    }
  }

  const publishDisabled =
    !systemPrompt.trim() || kbIds.length === 0 || saving;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Identity
        </h4>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Name</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            System prompt
          </span>
          <textarea
            rows={5}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful support agent for..."
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Example phrases (comma separated)
          </span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            value={examplePhrases}
            onChange={(e) => setExamplePhrases(e.target.value)}
            placeholder="How can I refund this?, Shipping times"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Guardrails</span>
          <textarea
            rows={3}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            value={guardrails}
            onChange={(e) => setGuardrails(e.target.value)}
            placeholder="Never promise discounts, always confirm order numbers..."
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Voice
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Voice</span>
            <select
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Language</span>
            <select
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Knowledge
        </h4>
        {kbs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No knowledge bases yet — create one above to attach it
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {kbs.map((kb) => (
              <li key={kb.id}>
                <label className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-50">
                  <input
                    type="checkbox"
                    checked={kbIds.includes(kb.id)}
                    onChange={() => toggleKb(kb.id)}
                  />
                  {kb.name}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Chunks to retrieve (topK)
            </span>
            <input
              type="number"
              min={1}
              max={10}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Similarity threshold
            </span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Behavior
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Interruption sensitivity
            </span>
            <select
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={interruptionSensitivity}
              onChange={(e) => setInterruptionSensitivity(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              End-call keyword
            </span>
            <input
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={endCallKeyword}
              onChange={(e) => setEndCallKeyword(e.target.value)}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Escalation fallback message
          </span>
          <textarea
            rows={3}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            value={escalationMessage}
            onChange={(e) => setEscalationMessage(e.target.value)}
            placeholder="I couldn't answer that — let me connect you with a human agent."
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishDisabled}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Publishing..." : "Publish"}
        </button>
        {publishDisabled ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {!systemPrompt.trim()
              ? "Needs a system prompt"
              : kbIds.length === 0
                ? "Needs at least one attached knowledge base"
                : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}