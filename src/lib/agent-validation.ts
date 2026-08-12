export function parseAgentBody(body: Record<string, unknown>): {
  values: Record<string, unknown>;
  error?: string;
} {
  const values: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return { values, error: "Agent name is required" };
    values.name = name;
  }
  if (body.systemPrompt !== undefined) {
    values.systemPrompt =
      typeof body.systemPrompt === "string" ? body.systemPrompt : "";
  }
  if (body.guardrails !== undefined) {
    values.guardrails = typeof body.guardrails === "string" ? body.guardrails : "";
  }
  if (body.examplePhrases !== undefined) {
    if (!Array.isArray(body.examplePhrases)) {
      return { values, error: "examplePhrases must be an array" };
    }
    values.examplePhrases = body.examplePhrases.filter(
      (p): p is string => typeof p === "string",
    );
  }
  if (body.voiceId !== undefined) {
    values.voiceId = typeof body.voiceId === "string" ? body.voiceId : "";
  }
  if (body.language !== undefined) {
    values.language = typeof body.language === "string" ? body.language : "";
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
  if (body.interruptionSensitivity !== undefined) {
    const level = body.interruptionSensitivity;
    if (typeof level !== "string" || !["low", "medium", "high"].includes(level)) {
      return { values, error: "interruptionSensitivity must be low, medium or high" };
    }
    values.interruptionSensitivity = level;
  }
  if (body.endCallKeyword !== undefined) {
    values.endCallKeyword =
      typeof body.endCallKeyword === "string" ? body.endCallKeyword : "";
  }
  if (body.escalationMessage !== undefined) {
    values.escalationMessage =
      typeof body.escalationMessage === "string" ? body.escalationMessage : "";
  }

  return { values };
}