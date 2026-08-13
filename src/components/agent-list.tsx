"use client";

import { useState } from "react";
import { Code2Icon, MessageSquareTextIcon } from "lucide-react";
import type { Agent } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EmbedAgentDialog } from "@/components/embed-agent-dialog";
import { TestChatDialog } from "@/components/test-chat-dialog";

export function AgentList({
  agents,
  selectedId,
  onSelect,
}: {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [embedAgent, setEmbedAgent] = useState<Agent | null>(null);
  const [testAgent, setTestAgent] = useState<Agent | null>(null);

  if (agents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No agents yet — create one
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {agents.map((agent) => {
          const isPublishedText =
            agent.status === "published" && agent.channel === "text";
          return (
            <li key={agent.id}>
              <div
                className={`flex items-center rounded-lg border px-4 py-3 transition-colors ${
                  selectedId === agent.id
                    ? "border-zinc-900 bg-zinc-100 dark:border-zinc-200 dark:bg-zinc-800"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(agent.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {agent.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      agent.status === "published"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {agent.status === "published" ? "Published" : "Draft"}
                  </span>
                </button>
                {isPublishedText && (
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTestAgent(agent)}
                    >
                      <MessageSquareTextIcon />
                      Test chat
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEmbedAgent(agent)}
                    >
                      <Code2Icon />
                      Embed
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {testAgent && (
        <TestChatDialog
          agentId={testAgent.id}
          agentName={testAgent.name}
          open={true}
          onOpenChange={(o) => {
            if (!o) setTestAgent(null);
          }}
        />
      )}

      {embedAgent && (
        <EmbedAgentDialog
          agentId={embedAgent.id}
          agentName={embedAgent.name}
          open={true}
          onOpenChange={(o) => {
            if (!o) setEmbedAgent(null);
          }}
        />
      )}
    </>
  );
}
