import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { embed, embedMany } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
});

export const embeddingModel = google.textEmbeddingModel(
  process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001",
);

/**
 * Chat model for grounded answers. Provider-agnostic: when OpenRouter
 * credentials are configured the model routes via OpenRouter's
 * OpenAI-compatible endpoint, otherwise it uses Gemini. Swap either by
 * changing env vars only (no code changes).
 */
export const chatModel =
  process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL
    ? createOpenAICompatible({
        name: "openrouter",
        baseURL:
          process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      }).chatModel(process.env.OPENROUTER_MODEL)
    : google.languageModel(process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash");

const EMBEDDING_DIMENSIONS = 768;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS } },
  });
  return embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS } },
  });
  return embedding;
}
