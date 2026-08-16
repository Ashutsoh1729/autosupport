import { NextResponse } from "next/server";
import { requireAgentAccess } from "@/lib/tenancy";
import { createVoiceSession } from "@/lib/livekit";

/**
 * POST /api/agents/[id]/test-token
 *
 * Issues a short-lived LiveKit room + access token for a published **voice**
 * agent. The caller (browser test console or any client) uses this session to
 * join the room; the voice agent worker (plan 02) joins the same room to run
 * the call.
 *
 * Guards (mirroring the other agent routes):
 * - 401/403/404 via requireAgentAccess (auth + workspace tenancy).
 * - 400 when the agent is not a voice-channel or not published.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireAgentAccess(request, id);
  if ("response" in access) return access.response;
  const { agent } = access;

  if (agent.channel !== "voice") {
    return NextResponse.json(
      { error: "This agent is not a voice agent" },
      { status: 400 },
    );
  }
  if (agent.status !== "published") {
    return NextResponse.json(
      { error: "This agent is not published" },
      { status: 400 },
    );
  }

  try {
    const session = await createVoiceSession(agent.id);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create voice session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}