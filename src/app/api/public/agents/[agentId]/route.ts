import { NextResponse } from "next/server";
import { loadPublishedTextAgent } from "@/lib/agent-runtime";
import { optionsResponse, withCors } from "@/lib/public-cors";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const agent = await loadPublishedTextAgent(agentId);
  if (!agent) {
    return withCors(
      NextResponse.json({ error: "Agent not available" }, { status: 404 }),
    );
  }

  const config = (agent.config ?? {}) as {
    greeting?: string;
    tone?: string;
    suggestedPrompts?: string[];
    maxTurns?: number;
  };

  return withCors(
    NextResponse.json({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      channel: agent.channel,
      config: {
        greeting: config.greeting ?? "",
        tone: config.tone ?? "",
        suggestedPrompts: config.suggestedPrompts ?? [],
        maxTurns: config.maxTurns ?? 0,
      },
    }),
  );
}