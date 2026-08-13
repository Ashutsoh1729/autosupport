import { NextResponse } from "next/server";
import { streamText } from "ai";
import { chatModel } from "@/lib/ai";
import { retrieveChunks } from "@/lib/retrieval";
import {
  buildAgentSystemPrompt,
  lastUserMessage,
  loadPublishedTextAgent,
  parseChatMessages,
} from "@/lib/agent-runtime";
import {
  optionsResponse,
  withCors,
  corsHeaders,
} from "@/lib/public-cors";

export const runtime = "nodejs";

const NO_CONTEXT_ANSWER =
  "Sorry, I couldn't find an answer to that in my knowledge base.";

function textStreamResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return withCors(
    new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }),
  );
}

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  const agent = await loadPublishedTextAgent(agentId);
  if (!agent) {
    return withCors(
      NextResponse.json({ error: "Agent not available" }, { status: 404 }),
    );
  }

  const body = await request.json().catch(() => null);
  const { messages, error } = parseChatMessages(body);
  if (error || !messages) {
    return withCors(
      NextResponse.json(
        { error: error ?? "messages is required" },
        { status: 400 },
      ),
    );
  }

  const query = lastUserMessage(messages);
  if (!query) {
    return withCors(
      NextResponse.json(
        { error: "No user message found in history" },
        { status: 400 },
      ),
    );
  }

  const topK = Math.min(10, Math.max(1, agent.topK || 4));
  const threshold = agent.similarityThreshold ?? 0;

  const chunks = await retrieveChunks(agent.kbIds, query, topK, threshold);

  if (chunks.length === 0) {
    return textStreamResponse(NO_CONTEXT_ANSWER);
  }

  const context = chunks
    .map(
      (chunk) =>
        `[source ${chunk.sourceId} chunk ${chunk.index}]\n${chunk.content}`,
    )
    .join("\n\n");

  const system = buildAgentSystemPrompt(agent);
  const prompt = `${system}\n\nContext:\n${context}\n\nConversation:\n${messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n")}\n\nAssistant:`;

  const result = await streamText({
    model: chatModel,
    system,
    prompt,
  });

  const response = result.toTextStreamResponse();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}