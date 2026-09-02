"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Code2Icon,
  MessageSquareTextIcon,
  PhoneCallIcon,
  Trash2Icon,
} from "lucide-react";
import type { Agent } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmbedAgentDialog } from "@/components/embed-agent-dialog";
import { TestCallDialog } from "@/components/test-call-dialog";
import { TestChatDialog } from "@/components/test-chat-dialog";

export function AgentList({
  agents,
  selectedId,
  onSelect,
  onDeleted,
}: {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [embedAgent, setEmbedAgent] = useState<Agent | null>(null);
  const [testAgent, setTestAgent] = useState<Agent | null>(null);
  const [callAgent, setCallAgent] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to delete agent");
        return;
      }
      toast.success("Agent deleted");
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      onDeleted?.(deletedId);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

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
          const isPublishedVoice =
            agent.status === "published" && agent.channel === "voice";
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
                {isPublishedVoice && (
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCallAgent(agent)}
                    >
                      <PhoneCallIcon />
                      Test call
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${agent.name}`}
                  className="ml-2 shrink-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => setDeleteTarget(agent)}
                >
                  <Trash2Icon />
                </Button>
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

      {callAgent && (
        <TestCallDialog
          agentId={callAgent.id}
          agentName={callAgent.name}
          open={true}
          onOpenChange={(o) => {
            if (!o) setCallAgent(null);
          }}
        />
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete agent?</DialogTitle>
            <DialogDescription>
              Delete {deleteTarget?.name} and its chat history permanently?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
