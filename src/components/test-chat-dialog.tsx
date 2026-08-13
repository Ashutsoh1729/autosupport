"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Meta = {
  id: string;
  name: string;
  status: string;
  channel: string;
  config: {
    greeting?: string;
    suggestedPrompts?: string[];
    maxTurns?: number;
  };
};

export function TestChatDialog({
  agentId,
  agentName,
  open,
  onOpenChange,
}: {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  const maxTurns = meta?.config.maxTurns ?? 0;
  const userTurns = messages.filter((m) => m.role === "user").length;
  const turnLimitReached = maxTurns > 0 && userTurns >= maxTurns;

  useEffect(() => {
    if (!open) return;
    fetch(`/api/public/agents/${agentId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: Meta = await res.json();
        setMeta(data);
        const greeting = data.config?.greeting;
        if (greeting) {
          const initial: ChatMessage[] = [{ role: "assistant", content: greeting }];
          historyRef.current = initial;
          setMessages(initial);
        }
      })
      .catch(() => setMetaError(true));
  }, [open, agentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy || turnLimitReached) return;

    const nextHistory = [...historyRef.current, { role: "user" as const, content: value }];
    historyRef.current = nextHistory;
    setMessages(nextHistory);
    setDraft("");
    setBusy(true);

    const assistantIndex = nextHistory.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`/api/public/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `status ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIndex] = { role: "assistant", content: full };
          return next;
        });
      }
      full += decoder.decode();
      const finalHistory = [
        ...historyRef.current,
        { role: "assistant" as const, content: full },
      ];
      historyRef.current = finalHistory;
      setMessages(finalHistory);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test chat failed");
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[560px] max-w-xl flex-col">
        <DialogHeader>
          <DialogTitle>Test chat — {agentName}</DialogTitle>
          <DialogDescription>
            Chat with the published agent against its knowledge bases.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border p-3"
        >
          {metaError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Could not load the agent. Make sure it is published and is a text agent.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "self-end bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "self-start border bg-zinc-50 dark:bg-zinc-800"
              }`}
            >
              {m.content || (busy ? "…" : "")}
            </div>
          ))}
          {meta?.config.suggestedPrompts?.map((p, i) => (
            <Button
              key={i}
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={busy || turnLimitReached}
              onClick={() => send(p)}
            >
              {p}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(draft);
            }}
            placeholder={turnLimitReached ? "Conversation limit reached" : "Type a message…"}
            disabled={busy || turnLimitReached}
          />
          <Button
            type="button"
            onClick={() => send(draft)}
            disabled={busy || turnLimitReached || !draft.trim()}
          >
            {busy ? "Replying…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
