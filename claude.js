// Vercel serverless function: a small, locked-down proxy to the Anthropic Messages API.
// Your API key stays on the server (set ANTHROPIC_API_KEY in Vercel). Never put it in the browser code.

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const MAX_TOKENS_CAP = 8000;
const MAX_INPUT_CHARS = 60000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Lets the website check whether AI features are switched on.
export async function GET() {
  return json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY), needsCode: Boolean(process.env.ACCESS_CODE) });
}

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  const code = process.env.ACCESS_CODE;
  if (code && request.headers.get("x-access-code") !== code) return json({ error: "bad_code" }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_request" }, 400); }

  const messages = Array.isArray(body?.messages) ? body.messages.slice(-24) : [];
  const valid =
    messages.length > 0 &&
    messages.every((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string") &&
    messages[0].role === "user" &&
    messages[messages.length - 1].role === "user";
  if (!valid) return json({ error: "bad_request" }, 400);
  const size = messages.reduce((n, m) => n + m.content.length, 0);
  if (size > MAX_INPUT_CHARS) return json({ error: "too_large" }, 413);

  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 4000, 256), MAX_TOKENS_CAP);

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens, stream: true, messages }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("Anthropic API error", upstream.status, detail.slice(0, 500));
    return json({ error: "upstream", status: upstream.status }, upstream.status === 429 ? 429 : 502);
  }

  // Stream the server-sent events straight through to the browser.
  return new Response(upstream.body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform" },
  });
}
