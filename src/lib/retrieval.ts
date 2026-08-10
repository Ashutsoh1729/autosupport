import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedText } from "@/lib/ai";

export type RetrievedChunk = {
  content: string;
  sourceId: string;
  index: number;
  score: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function clampTopK(topK: unknown): number {
  if (typeof topK !== "number" || !Number.isFinite(topK)) return 5;
  return Math.min(10, Math.max(1, Math.floor(topK)));
}

export async function retrieveChunks(
  kbId: string,
  query: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const result = await db.execute(sql`
    SELECT content, source_id, index, 1 - (embedding <=> ${vectorLiteral}::vector) AS score
    FROM chunks
    WHERE kb_id = ${kbId}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `);

  return (result.rows as Array<Record<string, unknown>>).map((row) => ({
    content: String(row.content),
    sourceId: String(row.source_id),
    index: Number(row.index),
    score: Number(row.score),
  }));
}