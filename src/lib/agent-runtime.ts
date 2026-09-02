import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, type Agent } from "@/lib/db/schema";
import { isValidUuid } from "@/lib/retrieval";

const TEXT_CHANNEL = "text" as const;
const VOICE_CHANNEL = "voice" as const;
const PUBLISHED = "published" as const;

/**
 * Loads an agent only if it is a UUID, exists, is a text-channel agent, and is
 * published. Returns null otherwise. Used by public (unauthenticated) routes.
 */
export async function loadPublishedTextAgent(
  agentId: string,
): Promise<Agent | null> {
  if (!isValidUuid(agentId)) return null;

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) return null;
  if (agent.channel !== TEXT_CHANNEL) return null;
  if (agent.status !== PUBLISHED) return null;
  return agent;
}

/**
 * Loads an agent only if it is a UUID, exists, is a voice-channel agent, and is
 * published. Returns null otherwise. Used by the voice agent worker when a call
 * is dispatched to the room.
 */
export async function loadPublishedVoiceAgent(
  agentId: string,
): Promise<Agent | null> {
  if (!isValidUuid(agentId)) return null;

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) return null;
  if (agent.channel !== VOICE_CHANNEL) return null;
  if (agent.status !== PUBLISHED) return null;
  return agent;
}

/**
 * Composes a grounded-support system prompt from the agent's own settings.
 * The agent's systemPrompt is the primary instruction; guardrails and tone are
 * appended as additional constraints when present.
 */
export function buildAgentSystemPrompt(agent: Agent): string {
  const parts: string[] = [];
  parts.push(
    agent.systemPrompt.trim() ||
      "You are a helpful support assistant. Answer using ONLY the provided context.",
  );
  parts.push(
    "Answer using only the provided context. State facts exactly as the context does. If the context does not contain the answer, say you don't know — do not guess or invent information outside the context.",
  );
  if (agent.guardrails.trim()) {
    parts.push(`Guardrails:\n${agent.guardrails.trim()}`);
  }
  const tone = (agent.config as { tone?: string } | undefined)?.tone;
  if (tone?.trim()) {
    parts.push(`Tone: ${tone.trim()}`);
  }
  return parts.join("\n\n");
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const MAX_HISTORY = 20;

/**
 * Returns the trimmed content of the last user message, or null if there is
 * none in the provided history.
 */
export function lastUserMessage(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && messages[i].content.trim()) {
      return messages[i].content.trim();
    }
  }
  return null;
}

/**
 * Validates and normalizes an incoming raw payload into a ChatMessage[].
 * Returns an error message string on failure, or null on success.
 */
export function parseChatMessages(raw: unknown): {
  messages: ChatMessage[] | null;
  error?: string;
} {
  if (!raw || typeof raw !== "object" || !("messages" in raw)) {
    return { messages: null, error: "messages is required" };
  }
  const rawMessages = (raw as { messages: unknown }).messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { messages: null, error: "messages must be a non-empty array" };
  }
  const messages: ChatMessage[] = [];
  for (const m of rawMessages) {
    if (
      !m ||
      typeof m !== "object" ||
      !("role" in m) ||
      !("content" in m) ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      !m.content.trim()
    ) {
      return { messages: null, error: "invalid message in history" };
    }
    messages.push({ role: m.role, content: m.content.trim() });
  }
  return { messages: messages.slice(-MAX_HISTORY) };
}
