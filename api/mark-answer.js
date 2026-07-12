import { checkPin, anthropic, parseJson, methodGuard } from "./_lib.js";
import { SYSTEM_MARK, markUserText, guardUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  if (!checkPin(req, res)) return;
  const { question = "", marksTotal = 1, chapter = "", typedWork = "", image = null } = req.body || {};
  try {
    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } });
    content.push({ type: "text", text: markUserText(question, marksTotal, chapter, typedWork, !!image) });

    let result = parseJson(await anthropic(content, { system: SYSTEM_MARK }));
    try {
      result = parseJson(await anthropic([{ type: "text", text: guardUserText(question, result) }], { maxTokens: 1200 }));
    } catch { /* keep first pass */ }
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "mark_failed", detail: String(e.message || e) });
  }
}
