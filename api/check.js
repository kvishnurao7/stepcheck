import { anthropic, parseJson, methodGuard } from "./_lib.js";
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

    // Long multi-step solutions produce long feedback JSON — keep headroom so it never truncates mid-JSON.
    let result = parseJson(await anthropic(content, { system: SYSTEM_CHECK, maxTokens: 4000 }));

    // Answer-leak guard: second pass (re-emits the FULL JSON, so it needs the same headroom).
    try {
      result = parseJson(await anthropic([{ type: "text", text: guardUserText(question, result) }], { maxTokens: 4000 }));
    } catch { /* keep first pass */ }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "check_failed", detail: String(e.message || e) });
  }
}
