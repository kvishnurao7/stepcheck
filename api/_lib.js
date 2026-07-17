// Shared helpers for all serverless functions.
// SECURITY: ANTHROPIC_API_KEY lives only here on the server. It is never sent to the browser.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Calls the Anthropic Messages API. `content` is the user-message content array
// (text and/or image blocks). Returns the concatenated assistant text.
//
// Thinking: claude-sonnet-5 runs adaptive thinking BY DEFAULT, and max_tokens
// caps thinking + answer combined — on hard inputs (dense homework photos) the
// model can spend the whole budget thinking and return zero text
// (stop_reason: max_tokens). So: `thinking: false` disables it for small
// mechanical calls, and thinking-on calls get effort "medium" to bound the
// spend, plus generous max_tokens headroom at the call sites.
export async function anthropic(content, { system, maxTokens = 1500, thinking = true, effort = "low" } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on the server.");

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  };
  if (system) body.system = system;
  if (thinking) {
    // "low" is the sweet spot here: the task is bounded (find the first wrong
    // step + transcribe), and sonnet-5 at low scopes work tightly and returns
    // much faster than medium. Bump to "medium" only if accuracy regresses.
    body.output_config = { effort };
  } else {
    body.thinking = { type: "disabled" };
  }

  // Transient failures (429/5xx/overloaded) get one retry with a short pause.
  let r;
  for (let attempt = 0; ; attempt++) {
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        // Hard per-attempt deadline: a hung connection should fail fast into
        // the retry, not stall the student's request for minutes.
        signal: AbortSignal.timeout(150_000),
      });
    } catch (e) {
      if (attempt >= 1) throw new Error(`Could not reach the AI service (${e.name === "TimeoutError" ? "timed out" : e.message}).`);
      await new Promise((res) => setTimeout(res, 2000));
      continue;
    }
    if (r.ok) break;
    const retryable = r.status === 429 || r.status >= 500;
    if (!retryable || attempt >= 1) {
      const detail = await r.text().catch(() => "");
      throw new Error(`Anthropic API ${r.status}: ${detail.slice(0, 300)}`);
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  const data = await r.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  if (!text) {
    // Diagnosable server-side: refusals/odd stop reasons come back as empty text.
    console.error("anthropic returned no text. stop_reason:", data.stop_reason, "content:", JSON.stringify(data.content)?.slice(0, 300));
  }
  return text;
}

// Escapes raw control characters that appear INSIDE string literals (models
// sometimes emit real newlines in multi-line fields like read_back, which is
// invalid JSON). Whitespace between tokens is left untouched.
function repairJsonStrings(s) {
  let out = "", inStr = false, esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inStr = true;
      out += ch;
    }
  }
  return out;
}

// Extracts the first JSON object/array from a model reply, tolerating ```json
// fences and raw newlines inside strings.
export function parseJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const candidates = [cleaned];
  const start = cleaned.search(/[{[]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start !== -1 && end > start) candidates.push(cleaned.slice(start, end + 1));
  for (const c of candidates) {
    try { return JSON.parse(c); } catch {}
    try { return JSON.parse(repairJsonStrings(c)); } catch {}
  }
  // Log the raw reply server-side so failures are diagnosable (never sent to the client).
  console.error("parseJson failed. Reply head:", JSON.stringify(text.slice(0, 400)), "tail:", JSON.stringify(text.slice(-200)));
  throw new Error("Model did not return valid JSON.");
}

// Call the model and parse its JSON reply, retrying the WHOLE call when the
// reply is empty or unparseable. The model occasionally returns a blank or
// malformed reply for a perfectly good request (seen with photo checks) —
// without a retry that surfaces to the student as a hard failure.
export async function anthropicJson(content, opts, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return parseJson(await anthropic(content, opts));
    } catch (e) {
      lastErr = e;
      console.error(`anthropicJson attempt ${i + 1}/${attempts} failed:`, String(e.message || e));
    }
  }
  throw lastErr;
}

// Standard method wrapper so we only accept POST.
export function methodGuard(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return false;
  }
  return true;
}
