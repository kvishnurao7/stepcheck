// Shared helpers for all serverless functions.
// SECURITY: ANTHROPIC_API_KEY lives only here on the server. It is never sent to the browser.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Calls the Anthropic Messages API. `content` is the user-message content array
// (text and/or image blocks). Returns the concatenated assistant text.
export async function anthropic(content, { system, maxTokens = 1500 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on the server.");

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  };
  if (system) body.system = system;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Anthropic API ${r.status}: ${detail.slice(0, 300)}`);
  }
  const data = await r.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// Extracts the first JSON object/array from a model reply, tolerating ```json fences.
export function parseJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[{[]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

// Standard method wrapper so we only accept POST.
export function methodGuard(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return false;
  }
  return true;
}
