"use client";

import type { Agent } from "@/lib/db/schema";

export function AgentList({
  agents,
  selectedId,
  creating,
  onSelect,
}: {
  agents: Agent[];
  selectedId: string | null;
  creating: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {creating ? (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            New Agent
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Draft
          </span>
        </div>
      ) : null}

      {agents.map((agent) => (
        <button
          key={agent.id}
          type="button"
          onClick={() => onSelect(agent.id)}
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
            selectedId === agent.id
              ? "border-zinc-900 bg-zinc-100 dark:border-zinc-200 dark:bg-zinc-800"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          }`}
        >
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {agent.name}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              agent.status === "published"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {agent.status === "published" ? "Published" : "Draft"}
          </span>
        </button>
      ))}

      {agents.length === 0 && !creating ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No agents yet — create one
        </p>
      ) : null}
    </div>
  );
}