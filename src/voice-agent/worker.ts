// LiveKit agent framework: AgentSession drives the realtime voice pipeline,
// defineAgent registers this worker's entry, and cli/ServerOptions let this
// script run as a standalone worker process that LiveKit dispatches jobs to.
import {
  Agent,
  AgentSession,
  AgentSessionEventTypes,
  cli,
  defineAgent,
  ServerOptions,
  type ChatContext,
  type JobContext,
} from "@livekit/agents";
import { STT as DeepgramSTT } from "@livekit/agents-plugin-deepgram";
import { TTS as DeepgramTTS } from "@livekit/agents-plugin-deepgram";
import {
  buildAgentSystemPrompt,
  loadPublishedVoiceAgent,
  type ChatMessage,
} from "@/lib/agent-runtime";
import type { Agent as AgentRow } from "@/lib/db/schema";
import { isValidUuid } from "@/lib/retrieval";
import { answerTurn } from "@/lib/voice-answer";

// Fallbacks used when an agent row omits voice config.
const DEFAULT_STT_MODEL = "nova-3";
const DEFAULT_TTS_MODEL = "aura-2-andromeda-en";
const DEFAULT_LANGUAGE = "en";
const DEFAULT_END_CALL_KEYWORD = "end call";

type VoiceSettings = {
  sttModel: string;
  ttsModel: string;
  language: string;
  endCallKeyword: string;
  greeting: string;
  interruptionSensitivity: "low" | "medium" | "high";
};

/**
 * Maps the agent's `voiceConfig`/`config` onto concrete voice settings with
 * safe defaults, since both may be sparse or absent for older agents.
 */
function resolveVoiceSettings(agent: AgentRow): VoiceSettings {
  const voiceConfig = (agent.voiceConfig ?? {}) as Partial<{
    voiceId: string;
    language: string;
    interruptionSensitivity: "low" | "medium" | "high";
    endCallKeyword: string;
  }>;
  const config = (agent.config ?? {}) as Partial<{ greeting: string }>;

  const language = voiceConfig.language?.trim() || DEFAULT_LANGUAGE;
  // nova-3 is English-only; switch to the multilingual model for other languages.
  const sttModel = language === "en" ? DEFAULT_STT_MODEL : "nova-3-multilingual";

  const voiceId = voiceConfig.voiceId?.trim();
  let ttsModel = DEFAULT_TTS_MODEL;
  if (voiceId?.startsWith("aura-2-")) {
    ttsModel = voiceId;
  } else if (voiceId?.startsWith("aura-")) {
    // Legacy aura-* ids map onto the aura-2 family.
    ttsModel = voiceId.replace(/^aura-/, "aura-2-");
  }

  return {
    sttModel,
    ttsModel,
    language,
    interruptionSensitivity: voiceConfig.interruptionSensitivity ?? "medium",
    endCallKeyword:
      voiceConfig.endCallKeyword?.trim().toLowerCase() || DEFAULT_END_CALL_KEYWORD,
    greeting:
      config.greeting?.trim() ||
      `Hi! This is ${agent.name}. How can I help you today?`,
  };
}

/** Interruption tuning per the agent's configured sensitivity. */
function interruptionForSensitivity(
  level: "low" | "medium" | "high" | undefined,
) {
  switch (level) {
    case "low":
      // Hard to interrupt: the user must speak substantially longer.
      return { enabled: true, minDuration: 1200, minWords: 6 };
    case "high":
      // Easy to interrupt: any short utterance barges in.
      return { enabled: true, minDuration: 250, minWords: 1 };
    case "medium":
    default:
      return {}; // framework defaults
  }
}

/**
 * Extracts the agent id from the deterministic room name minted by
 * `createVoiceSession` (`agent-<agentId>-<epochMs>`), or null when the room
 * was not created by this app.
 */
function parseAgentIdFromRoom(roomName: string | undefined): string | null {
  if (!roomName) return null;
  const PREFIX = "agent-";
  if (!roomName.startsWith(PREFIX)) return null;
  const candidate = roomName.slice(PREFIX.length, PREFIX.length + 36);
  return isValidUuid(candidate) ? candidate : null;
}

function isEndCallKeyword(query: string, keyword: string): boolean {
  return query.toLowerCase().includes(keyword);
}

/** Flattens the LiveKit chat context into the app's ChatMessage[] shape. */
function historyFromChatCtx(chatCtx: ChatContext): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const item of chatCtx.items) {
    if (item.type !== "message") continue;
    const role = item.role;
    if (role !== "user" && role !== "assistant") continue;
    const content = (item.textContent ?? "").trim();
    if (!content) continue;
    messages.push({ role, content });
  }
  return messages;
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const agentId = parseAgentIdFromRoom(ctx.room.name);
    if (!agentId) {
      ctx.shutdown(
        `Room "${ctx.room.name}" has no agent id; refusing to run voice agent`,
      );
      return;
    }

    const agentRow = await loadPublishedVoiceAgent(agentId);
    if (!agentRow) {
      ctx.shutdown(
        `Agent ${agentId} is missing, unpublished, or not a voice agent`,
      );
      return;
    }

    if (!process.env.DEEPGRAM_API_KEY) {
      ctx.shutdown(
        "Missing environment variable DEEPGRAM_API_KEY. Add it to your .env " +
          "file (see .env.example) to use the voice runtime.",
      );
      return;
    }

    const settings = resolveVoiceSettings(agentRow);
    // STT transcribes the caller in the resolved language; TTS speaks replies.
    // Note: the TTS voice (ttsModel) selects the output language via the
    // configured voiceId, not directly from `settings.language`.
    const stt = new DeepgramSTT({
      model: settings.sttModel,
      language: settings.language,
    });
    const tts = new DeepgramTTS({ model: settings.ttsModel });

    // Build the agent: it holds the system prompt and, on each completed user
    // turn, commits history, checks for the end-call keyword, gets a reply via
    // answerTurn(), and speaks it back.
    const agent = Agent.create({
      id: agentRow.id,
      instructions: buildAgentSystemPrompt(agentRow),
      onUserTurnCompleted: async (ctx, chatCtx, newMessage) => {
        const query = (newMessage.rawTextContent ?? "").trim();
        console.log(`[worker:${agentId}] user turn: "${query}"`);
        if (!query) return;

        // The framework only commits the user turn when a reply pipeline runs;
        // commit it ourselves so the next turn carries history.
        ctx.agent._chatCtx.insert(newMessage);
        ctx.session.history.insert(newMessage);

        if (isEndCallKeyword(query, settings.endCallKeyword)) {
          ctx.session.shutdown({ drain: false, reason: "end_call_keyword" });
          return;
        }

        const history: ChatMessage[] = [
          ...historyFromChatCtx(chatCtx),
          { role: "user" as const, content: query },
        ];
        const reply = await answerTurn(query, agentRow, history);
        ctx.session.say(reply);
      },
    });

    // The session wires STT + TTS together and drives the realtime call loop.
    const session = new AgentSession({
      stt,
      tts,
      turnHandling: {
        interruption: interruptionForSensitivity(
          settings.interruptionSensitivity,
        ),
      },
    });

    // Signal that lets entry() await the session's lifetime without blocking the
    // rest of the job's cleanup wiring.
    const closed = new Promise<void>((resolve) => {
      session.on(AgentSessionEventTypes.Close, () => resolve());
    });

    // Join the room and start the realtime turn loop; the room is deleted from
    // LiveKit once the session closes.
    try {
      await session.start({
        agent,
        room: ctx.room,
        inputOptions: { deleteRoomOnClose: true },
      });
    } catch (error) {
      console.error("voice agent failed to start", error);
      ctx.shutdown("voice agent failed to start");
      return;
    }

    // When this job shuts down, tear the session down gracefully rather than
    // letting the process die with it still open.
    ctx.addShutdownCallback(async () => {
      await session.close();
    });

    // Wait for the caller to join before speaking the greeting. If the session
    // closes first (caller already gone), skip the greeting.
    const callerJoined = await Promise.race([
      ctx.waitForParticipant().then(
        () => true,
        () => false,
      ),
      closed.then(() => false),
    ]);
    if (callerJoined) {
      await session.say(settings.greeting);
    }

    // Keep the job alive until the session closes (caller disconnect, end-call
    // keyword, or worker shutdown). RoomIO deletes the room on close with
    // deleteRoomOnClose set above.
    await closed;
  },
});

cli.runApp(new ServerOptions({ agent: import.meta.filename }));