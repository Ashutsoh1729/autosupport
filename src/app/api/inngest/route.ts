import { serve } from "inngest/next";
import { inngest, chunkSource } from "@/lib/infra/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [chunkSource],
});