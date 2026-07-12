import { checkPin, anthropic, parseJson, methodGuard } from "./_lib.js";
import { parsePaperUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  if (!checkPin(req, res)) return;
  const { rawText = "" } = req.body || {};
  if (rawText.trim().length < 40) return res.status(400).json({ error: "Paste the full paper text." });
  try {
    const result = parseJson(await anthropic(
      [{ type: "text", text: parsePaperUserText(rawText) }],
      { maxTokens: 4000 }
    ));
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "parse_failed", detail: String(e.message || e) });
  }
}
