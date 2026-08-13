"use client";

import { useState } from "react";
import type { Agent } from "@/lib/db/schema";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  function openNew() {
    setEditingAgent(null);
    setSheetOpen(true);
  }

  function openEdit(id: string) {
    const agent = agents.find((a) => a.id === id) ?? null;
    setEditingAgent(agent);
    setSelectedId(id);
    setSheetOpen(true);
  }

  function handleSaved(agent: Agent | null) {
    if (agent) setSelectedId(agent.id);
    setSheetOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Agents
        </h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          New Agent
        </button>
      </div>

      <AgentList agents={agents} selectedId={selectedId} onSelect={openEdit} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>
              {editingAgent === null ? "New Agent" : "Edit Agent"}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AgentEditor
              projectId={projectId}
              agent={editingAgent}
              kbs={kbs}
              onSaved={handleSaved}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}