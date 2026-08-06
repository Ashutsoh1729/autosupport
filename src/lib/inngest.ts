import { Inngest, eventType, staticSchema } from "inngest";
import { db } from "@/lib/db";
import { knowledgeSources, chunks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { embedTexts } from "@/lib/ai";
import { getFromR2 } from "@/lib/r2";
import { PDFParse } from "pdf-parse";

export const knowledgeSourceCreated = eventType(
  "knowledge-source.created",
  {
    schema: staticSchema<{ sourceId: string }>(),
  },
);

export const inngest = new Inngest({
  id: "autosupport",
});

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];

  const chunksOut: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);

    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf("\n", end);
      if (boundary > start + CHUNK_SIZE / 2) {
        end = boundary;
      } else {
        const space = normalized.lastIndexOf(" ", end);
        if (space > start + CHUNK_SIZE / 2) {
          end = space;
        }
      }
    }

    const piece = normalized.slice(start, end).trim();
    if (piece.length > 0) {
      chunksOut.push(piece);
    }

    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }

  return chunksOut;
}

async function extractSourceText(type: string, contentRef: string): Promise<string> {
  if (type === "text") {
    return contentRef;
  }

  if (type === "url") {
    const res = await fetch(contentRef, {
      headers: { "User-Agent": "autosupport-bot/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    return stripHtml(html);
  }

  if (type === "file") {
    const buffer = await getFromR2(contentRef);
    const keyLower = contentRef.toLowerCase();
    if (keyLower.endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text;
      } finally {
        await parser.destroy();
      }
    }
    return buffer.toString("utf8");
  }

  throw new Error(`Unknown source type: ${type}`);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export const chunkSource = inngest.createFunction(
  {
    id: "process/knowledge-source",
    triggers: [knowledgeSourceCreated],
  },
  async ({ event, step }) => {
    const sourceId = event.data.sourceId;

    const source = await step.run("load-source", async () => {
      const [row] = await db
        .select()
        .from(knowledgeSources)
        .where(eq(knowledgeSources.id, sourceId))
        .limit(1);
      if (!row) throw new Error(`Source not found: ${sourceId}`);
      return row;
    });

    await step.run("mark-processing", () =>
      db
        .update(knowledgeSources)
        .set({ status: "processing", error: null })
        .where(eq(knowledgeSources.id, sourceId)),
    );

    try {
      const text = await step.run("extract-text", () =>
        extractSourceText(source.type, source.contentRef),
      );

      const sourceChunks = await step.run("chunk-text", () => chunkText(text));

      if (sourceChunks.length > 0) {
        const embeddings = await step.run("embed-chunks", () =>
          embedTexts(sourceChunks),
        );

        await step.run("store-chunks", () =>
          db.insert(chunks).values(
            sourceChunks.map((content, i) => ({
              kbId: source.kbId,
              sourceId: source.id,
              index: i,
              content,
              embedding: embeddings[i],
            })),
          ),
        );
      }

      await step.run("mark-ready", () =>
        db
          .update(knowledgeSources)
          .set({ status: "ready", error: null })
          .where(eq(knowledgeSources.id, sourceId)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run("mark-failed", () =>
        db
          .update(knowledgeSources)
          .set({ status: "failed", error: message })
          .where(eq(knowledgeSources.id, sourceId)),
      );
      throw err;
    }
  },
);

export const sendKnowledgeSourceCreated = (sourceId: string) =>
  inngest.send(knowledgeSourceCreated.create({ sourceId }));
