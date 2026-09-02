import { streamText } from "ai";
import { ReadableStream } from "node:stream/web";
import { chatModel } from "@/lib/ai";
import { retrieveChunks } from "@/lib/retrieval";
import {
  buildAgentSystemPrompt,
  type ChatMessage,
} from "@/lib/agent-runtime";
import type { Agent } from "@/lib/db/schema";

const DEFAULT_ESCALATION =
  "Sorry, I couldn't find an answer to that in my knowledge base. " +
  "Let me connect you with someone who can help.";

const MAX_HISTORY = 20;

/**
 * The message the agent speaks when retrieval over its knowledge bases returns
 * zero chunks. Prefers the agent's own escalationMessage (column or config),
 * falling back to a canned message.
 */
export function resolveEscalationMessage(agent: Agent): string {
  const fromConfig = (
    agent.config as { escalationMessage?: string } | undefined
  )?.escalationMessage;
  return (
    agent.escalationMessage.trim() || fromConfig?.trim() || DEFAULT_ESCALATION
  );
}

/** Streams a single canned message as a string ReadableStream. */
function streamTextResponse(text: string): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

/**
 * Builds and streams a RAG-grounded answer for a voice turn, mirroring the M3
 * text chat pipeline: retrieve chunks over the agent's KBs, compose the system
 * prompt with `buildAgentSystemPrompt`, and stream the shared `chatModel`
 * response. When no chunks match, streams the canned escalation message
 * instead.
 *
 * `history` is the conversation so far (the current query included as the last
 * item); it is trimmed to the last {@link MAX_HISTORY} messages.
 */
export function answerTurn(
  query: string,
  agent: Agent,
  history: ChatMessage[],
): Promise<ReadableStream<string>> {
  return (async () => {
    const topK = Math.min(10, Math.max(1, agent.topK || 4));
    const threshold = agent.similarityThreshold ?? 0;
    const chunks = await retrieveChunks(agent.kbIds, query, topK, threshold);

    if (chunks.length === 0) {
      return streamTextResponse(resolveEscalationMessage(agent));
    }

    const context = chunks
      .map(
        (chunk) =>
          `[source ${chunk.sourceId} chunk ${chunk.index}]\n${chunk.content}`,
      )
      .join("\n\n");

    const system = buildAgentSystemPrompt(agent);
    const conversation = history
      .slice(-MAX_HISTORY)
      .map((message) =>
        `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`,
      )
      .join("\n");
    const prompt = `${system}\n\nContext:\n${context}\n\nConversation:\n${conversation}\n\nAssistant:`;

    const result = await streamText({
      model: chatModel,
      system,
      prompt,
    });
    return result.textStream as unknown as ReadableStream<string>;
  })();
}