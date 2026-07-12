import { checkPin, anthropic, parseJson, methodGuard } from "./_lib.js";
import { SYSTEM_CHECK, checkUserText, guardUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  if (!checkPin(req, res)) return;

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

    let result = parseJson(await anthropic(content, { system: SYSTEM_CHECK }));

    // Answer-leak guard: second pass. If it fails, keep the first result.
    try {
      result = parseJson(await anthropic([{ type: "text", text: guardUserText(question, result) }], { maxTokens: 1200 }));
    } catch { /* keep first pass */ }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "check_failed", detail: String(e.message || e) });
  }
}
