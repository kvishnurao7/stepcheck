import { anthropicJson, methodGuard } from "./_lib.js";
import { parsePaperUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  const { rawText = "" } = req.body || {};
  if (rawText.trim().length < 40) return res.status(400).json({ error: "Paste the full paper text." });
  try {
    // Thinking ON at medium effort: the parser now SOLVES every MCQ to build the
    // marking key, so it needs room to reason — and the key must match CBSE.
    // maxTokens generous because thinking + a full paper's JSON share the budget.
    const result = await anthropicJson(
      [{ type: "text", text: parsePaperUserText(rawText) }],
      { maxTokens: 16000, effort: "medium" }
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "parse_failed", detail: String(e.message || e) });
  }
}
