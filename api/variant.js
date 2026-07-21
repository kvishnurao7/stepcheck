import { anthropicJson, methodGuard } from "./_lib.js";
import { variantUserText } from "./_prompts.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;
  const { entry } = req.body || {};
  if (!entry) return res.status(400).json({ error: "Missing mistake entry." });
  try {
    const result = await anthropicJson(
      [{ type: "text", text: variantUserText(entry) }],
      { maxTokens: 800, thinking: false }
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: "variant_failed", detail: String(e.message || e) });
  }
}
