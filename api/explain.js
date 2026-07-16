import { anthropic, parseJson, methodGuard } from "./_lib.js";
import { explainUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  const { question = "", wrong = "", explanation = "" } = req.body || {};
  if (!explanation.trim()) return res.status(400).json({ error: "Empty explanation." });
  try {
    const result = parseJson(await anthropic(
      [{ type: "text", text: explainUserText(question, wrong, explanation) }],
      { maxTokens: 400 }
    ));
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "explain_failed", detail: String(e.message || e) });
  }
}
