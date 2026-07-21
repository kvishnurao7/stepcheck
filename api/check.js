import { anthropicJson, methodGuard } from "./_lib.js";
import { SYSTEM_CHECK, checkUserText, guardUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;

  const { chapter, question = "", typedWork = "", image = null } = req.body || {};
  if (!image && !typedWork.trim()) {
    return res.status(400).json({ error: "Provide a photo of the working or type the steps." });
  }

  try {
    const content = [];
    if (image) {
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } });
    }
    content.push({ type: "text", text: checkUserText(chapter, question, typedWork, !!image) });

    // max_tokens covers thinking + answer on sonnet-5: 16000 (the safe
    // non-streaming ceiling) leaves room for both on dense homework pages.
    let result = await anthropicJson(content, { system: SYSTEM_CHECK, maxTokens: 16000 });

    // Answer-leak guard: second pass. Mechanical rewrite — thinking off so the
    // whole budget goes to re-emitting the JSON.
    try {
      result = await anthropicJson([{ type: "text", text: guardUserText(question, result) }], { maxTokens: 8000, thinking: false }, 2);
    } catch { /* keep first pass */ }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "check_failed", detail: String(e.message || e) });
  }
}
