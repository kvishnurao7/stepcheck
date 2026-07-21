import { anthropic, methodGuard } from "./_lib.js";
import { SYSTEM_SOLVE, solveUserText } from "./_prompts.js";

// Parent/teacher answer key. UNLIKE every other student-facing endpoint, this
// deliberately reveals the full worked solution and final answer — it is only
// ever called from Parent/Teacher view (see src/lib/api.js + the callers), and
// is intentionally NOT routed through the answer-leak guard.
export default async function handler(req, res) {
  if (!methodGuard(req, res)) return;

  const { question = "", chapter = "", marksTotal = null, scheme = null } = req.body || {};
  if (!question.trim()) return res.status(400).json({ error: "No question to solve." });

  try {
    const solution = await anthropic(
      [{ type: "text", text: solveUserText(question, chapter, marksTotal, scheme) }],
      { system: SYSTEM_SOLVE, maxTokens: 8000, effort: "low" }
    );
    return res.status(200).json({ solution });
  } catch (e) {
    return res.status(500).json({ error: "solve_failed", detail: String(e.message || e) });
  }
}
