import { anthropicJson, methodGuard } from "./_lib.js";
import { parsePaperUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  const { rawText = "", pdf = null } = req.body || {};
  if (!pdf && rawText.trim().length < 40) return res.status(400).json({ error: "Paste the full paper text or upload a PDF." });
  try {
    // A PDF is read directly by the model (handles scanned papers too); pasted
    // text goes in the prompt. Thinking ON at medium effort: the parser SOLVES
    // every MCQ to build the marking key, so it needs room to reason — and the
    // key must match CBSE. maxTokens generous because thinking + a full paper's
    // JSON share the budget.
    const content = [];
    if (pdf) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
    content.push({ type: "text", text: parsePaperUserText(pdf ? "(The full question paper is the attached PDF above — read every page.)" : rawText) });
    const result = await anthropicJson(content, { maxTokens: 16000, effort: "medium" });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "parse_failed", detail: String(e.message || e) });
  }
}
