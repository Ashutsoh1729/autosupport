import { AccessToken, type VideoGrant } from "livekit-server-sdk";

const TTL = "15m";

/**
 * Throws a descriptive error when a required LiveKit environment variable is
 * missing, so callers fail fast instead of surfacing an SDK stack trace.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to your .env file ` +
        "(see .env.example) to use the voice runtime.",
    );
  }
  return value;
}

export function roomUrl(): string {
  return requireEnv("LIVEKIT_URL");
}

export function livekitApiKey(): string {
  return requireEnv("LIVEKIT_API_KEY");
}

export function livekitApiSecret(): string {
  return requireEnv("LIVEKIT_API_SECRET");
}

export type VoiceSession = {
  url: string;
  room: string;
  token: string;
};

/**
 * Creates a unique, agent-scoped LiveKit room and mints a short-lived access
 * token that lets the caller join that room as a participant. The room name is
 * deterministic per agent (plus an epoch timestamp) so the voice agent worker
 * can derive the same room when a call is dispatched.
 *
 * Grants are limited to joining/publishing/subscribing — no admin or create
 * permissions, keeping the token scoped to a single room for a short window.
 */
export async function createVoiceSession(agentId: string): Promise<VoiceSession> {
  const url = roomUrl();
  const apiKey = livekitApiKey();
  const apiSecret = livekitApiSecret();

  const room = `agent-${agentId}-${Date.now()}`;
  const identity = `caller-${agentId}-${Math.random().toString(36).slice(2, 10)}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: TTL,
  });
  const grant: VideoGrant = {
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };
  token.addGrant(grant);

  return { url, room, token: await token.toJwt() };
}
