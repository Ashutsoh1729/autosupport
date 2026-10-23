/**
 * CORS for public endpoints. The embeddable widget is served from this app but
 * runs inside arbitrary customer pages, so the browser issues cross-origin
 * requests to these endpoints. Any origin is allowed because the endpoints
 * only serve published text agents and hold no tenant data.
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}