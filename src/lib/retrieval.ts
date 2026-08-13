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
  kbIds: string[],
  query: string,
  topK = 5,
  minScore?: number,
): Promise<RetrievedChunk[]> {
  if (kbIds.length === 0) return [];
  const embedding = await embedText(query);
  const vectorLiteral = `[${embedding.join(",")}]`;
  const thresholdClause =
    minScore !== undefined
      ? sql`AND (1 - (embedding <=> ${vectorLiteral}::vector)) >= ${minScore}`
      : sql``;
  const kbArray = sql`ARRAY[${sql.join(
    kbIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  )}]`;

  const result = await db.execute(sql`
    SELECT content, source_id, index, 1 - (embedding <=> ${vectorLiteral}::vector) AS score
    FROM chunks
    WHERE kb_id = ANY(${kbArray})
    ${thresholdClause}
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