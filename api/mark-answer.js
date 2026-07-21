import { anthropicJson, methodGuard } from "./_lib.js";
import { SYSTEM_MARK, markUserText, guardUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  const { question = "", marksTotal = 1, chapter = "", typedWork = "", image = null, scheme = null } = req.body || {};
  try {
    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } });
    content.push({ type: "text", text: markUserText(question, marksTotal, chapter, typedWork, !!image, scheme) });

    let result = await anthropicJson(content, { system: SYSTEM_MARK, maxTokens: 8000 });
    try {
      result = await anthropicJson([{ type: "text", text: guardUserText(question, result) }], { maxTokens: 4000, thinking: false }, 2);
    } catch { /* keep first pass */ }
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "mark_failed", detail: String(e.message || e) });
  }
}
