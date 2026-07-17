import { anthropicJson, methodGuard } from "./_lib.js";
import { parseSchemeUserText } from "./_prompts.js";

// Reads an uploaded official CBSE marking scheme (PDF or pasted text) and
// matches each of the paper's questions to its official answer + mark
// allocation, keyed by the paper's question number. Parent/teacher only —
// this is the answer key, so it is NOT routed through the leak guard.
export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  const { rawText = "", pdf = null, questions = [] } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "No questions to match against the scheme." });
  }
  if (!pdf && rawText.trim().length < 40) {
    return res.status(400).json({ error: "Provide the marking scheme as a PDF or pasted text." });
  }
  try {
    const content = [];
    if (pdf) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
    if (rawText.trim()) content.push({ type: "text", text: `Marking scheme text:\n${rawText}` });
    content.push({ type: "text", text: parseSchemeUserText(questions) });

    const result = await anthropicJson(content, { maxTokens: 16000, effort: "medium" });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "scheme_failed", detail: String(e.message || e) });
  }
}
