"use client";

import { useState } from "react";
import type { Agent } from "@/lib/db/schema";
import { AgentList } from "@/components/agent-list";
import { AgentEditor } from "@/components/agent-editor";

type KnowledgeBaseRow = { id: string; name: string; createdAt: Date };

export function AgentManager({
  projectId,
  agents,
  kbs,
}: {
  projectId: string;
  agents: Agent[];
  kbs: KnowledgeBaseRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    agents[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(agents.length === 0);

  const selectedAgent =
    agents.find((a) => a.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
    setCreating(false);
  }

  function handleNew() {
    setSelectedId(null);
    setCreating(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Agents
        </h2>
        <button
          type="button"
          onClick={handleNew}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          New Agent
        </button>
      </div>

      <AgentList
        agents={agents}
        selectedId={selectedId}
        creating={creating}
        onSelect={handleSelect}
      />

      {creating || selectedAgent ? (
        <AgentEditor
          key={selectedAgent?.id ?? "new"}
          projectId={projectId}
          agent={selectedAgent}
          kbs={kbs}
          onCreated={(agent) => {
            setSelectedId(agent.id);
            setCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}