type AgentBody = Record<string, unknown>;

type ParseResult = {
  values: Record<string, unknown>;
  error?: string;
};

const CHANNELS = ["text", "voice"] as const;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseAgentConfig(raw: unknown):
  | { config: Record<string, unknown> }
  | { error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: "config must be an object" };
  }
  const obj = raw as Record<string, unknown>;
  const config: Record<string, unknown> = {};

  if (obj.greeting !== undefined) {
    config.greeting = asString(obj.greeting);
  }
  if (obj.tone !== undefined) {
    config.tone = asString(obj.tone);
  }
  if (obj.suggestedPrompts !== undefined) {
    if (!Array.isArray(obj.suggestedPrompts)) {
      return { error: "config.suggestedPrompts must be an array" };
    }
    config.suggestedPrompts = obj.suggestedPrompts.filter(
      (p): p is string => typeof p === "string",
    );
  }
  if (obj.maxTurns !== undefined) {
    const maxTurns = typeof obj.maxTurns === "number" ? Math.round(obj.maxTurns) : NaN;
    if (Number.isNaN(maxTurns) || maxTurns < 1) {
      return { error: "config.maxTurns must be a positive number" };
    }
    config.maxTurns = maxTurns;
  }

  return { config };
}

function parseVoiceConfig(raw: unknown):
  | { voiceConfig: Record<string, unknown> }
  | { error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: "voiceConfig must be an object" };
  }
  const obj = raw as Record<string, unknown>;
  const voiceConfig: Record<string, unknown> = {};

  if (obj.voiceId !== undefined) {
    voiceConfig.voiceId = asString(obj.voiceId);
  }
  if (obj.language !== undefined) {
    voiceConfig.language = asString(obj.language);
  }
  if (obj.interruptionSensitivity !== undefined) {
    const level = obj.interruptionSensitivity;
    if (
      typeof level !== "string" ||
      !["low", "medium", "high"].includes(level)
    ) {
      return {
        error: "interruptionSensitivity must be low, medium or high",
      };
    }
    voiceConfig.interruptionSensitivity = level;
  }
  if (obj.endCallKeyword !== undefined) {
    voiceConfig.endCallKeyword = asString(obj.endCallKeyword);
  }

  return { voiceConfig };
}

export function parseAgentBody(body: AgentBody): ParseResult {
  const values: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = asString(body.name).trim();
    if (!name) return { values, error: "Agent name is required" };
    values.name = name;
  }

  if (body.channel !== undefined) {
    const channel = body.channel;
    if (typeof channel !== "string" || !CHANNELS.includes(channel as never)) {
      return { values, error: "channel must be text or voice" };
    }
    values.channel = channel;
  }

  for (const key of ["systemPrompt", "guardrails", "escalationMessage"] as const) {
    if (body[key] !== undefined) {
      values[key] = asString(body[key]);
    }
  }

  if (body.examplePhrases !== undefined) {
    if (!Array.isArray(body.examplePhrases)) {
      return { values, error: "examplePhrases must be an array" };
    }
    values.examplePhrases = body.examplePhrases.filter(
      (p): p is string => typeof p === "string",
    );
  }

  if (body.kbIds !== undefined) {
    if (!Array.isArray(body.kbIds)) {
      return { values, error: "kbIds must be an array" };
    }
    values.kbIds = body.kbIds.filter((id): id is string => typeof id === "string");
  }

  if (body.topK !== undefined) {
    const topK = typeof body.topK === "number" ? Math.round(body.topK) : NaN;
    if (Number.isNaN(topK) || topK < 1) {
      return { values, error: "topK must be a positive number" };
    }
    values.topK = Math.min(topK, 10);
  }

  if (body.similarityThreshold !== undefined) {
    const threshold =
      typeof body.similarityThreshold === "number"
        ? body.similarityThreshold
        : NaN;
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
      return { values, error: "similarityThreshold must be between 0 and 1" };
    }
    values.similarityThreshold = threshold;
  }

  if (body.config !== undefined) {
    const result = parseAgentConfig(body.config);
    if ("error" in result) return { values, error: result.error };
    values.config = result.config;
  }

  if (body.voiceConfig !== undefined && body.voiceConfig !== null) {
    const result = parseVoiceConfig(body.voiceConfig);
    if ("error" in result) return { values, error: result.error };
    values.voiceConfig = result.voiceConfig;
  } else if (body.voiceConfig === null) {
    values.voiceConfig = null;
  }

  return { values };
}