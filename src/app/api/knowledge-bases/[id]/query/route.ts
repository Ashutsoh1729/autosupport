import { NextResponse } from "next/server";
import { generateText } from "ai";
import { requireKnowledgeBaseAccess } from "@/lib/tenancy";
import { clampTopK, isValidUuid, retrieveChunks } from "@/lib/retrieval";
import { chatModel } from "@/lib/ai";

const NO_CONTEXT_ANSWER = "No relevant information found in the knowledge base.";

const SYSTEM_PROMPT = `You are AutoSupport, a support assistant. Answer the user's question using ONLY the provided context. State facts exactly as the context does. If the context does not contain the answer, say you don't know — do not guess or invent information outside the context.`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: kbId } = await params;

  if (!isValidUuid(kbId)) {
    return NextResponse.json(
      { error: "Invalid knowledge base id" },
      { status: 400 },
    );
  }

  const access = await requireKnowledgeBaseAccess(request, kbId);
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const topK = clampTopK(body?.topK);

  const chunks = await retrieveChunks(kbId, question, topK);

  if (chunks.length === 0) {
    return NextResponse.json({ answer: NO_CONTEXT_ANSWER, chunks });
  }

  const context = chunks
    .map((chunk) => `[source ${chunk.sourceId} chunk ${chunk.index}]\n${chunk.content}`)
    .join("\n\n");

  const { text } = await generateText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    prompt: `Context:\n${context}\n\nQuestion: ${question}`,
  });

  return NextResponse.json({ answer: text, chunks });
}