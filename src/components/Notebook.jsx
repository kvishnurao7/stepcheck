import { useState } from "react";
import { S, C } from "../lib/styles.js";
import { api } from "../lib/api.js";
import AnswerKey from "./AnswerKey.jsx";

function Row({ label, body, accent }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...S.rowLabel, color: accent || C.muted }}>{label}</div>
      <div style={S.rowBody}>{body}</div>
    </div>
  );
}

// The result panel used by Check and by the Papers per-question feedback.
// `view` controls density:
//   child   — progressive disclosure: hints behind the ladder, self-explain loop.
//   parent  — word-light: verdict + plain-English diagnosis only; raw maths, hints and drills hidden.
//   teacher — dense: everything up front (transcription, error type, all hints, the self-explain prompt).
export default function Notebook({ result, question, view = "child", onSaveMistake, saved }) {
  const [hintLevel, setHintLevel] = useState(view === "teacher" ? 4 : 0);
  const [selfExp, setSelfExp] = useState("");
  const [selfExpRes, setSelfExpRes] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!result) return null;

  const isParent = view === "parent";
  const isTeacher = view === "teacher";

  const pen =
    result.verdict === "all_correct" ? { text: "All steps correct ✓", color: C.green }
    : result.verdict === "error_found" ? { text: "Check this step ✗", color: C.red }
    : { text: "Couldn't read it clearly", color: C.amber };

  const checkExplanation = async () => {
    if (!selfExp.trim()) return;
    setBusy(true);
    try {
      const r = await api.explain({
        question,
        wrong: result.what_went_wrong || result.first_wrong_step || "",
        explanation: selfExp.trim(),
      });
      setSelfExpRes(r);
    } catch {
      setSelfExpRes({ understood: false, feedback: "Couldn't check that just now — try again." });
    } finally {
      setBusy(false);
    }
  };

  const hints = Array.isArray(result.hints) ? result.hints : [];
  const shownHints = view === "teacher" ? hints : hints.slice(0, hintLevel);

  return (
    <section style={S.notebook}>
      <div style={S.margin} />
      <div style={S.page}>
        <div style={{ ...S.pen, color: pen.color }}>{pen.text}</div>

        {result.chapter && <Row label="Chapter" body={result.chapter} />}
        {result.read_back && !isParent && <Row label="What I read from your photo" body={result.read_back} />}
        {result.correct_upto && result.verdict !== "unclear" && !isParent && <Row label="Correct so far" body={result.correct_upto} />}
        {result.first_wrong_step && !isParent && <Row label="First wrong step" body={result.first_wrong_step} accent={C.red} />}
        {isTeacher && result.error_type && <Row label="Error type" body={result.error_type} accent={C.red} />}
        {result.what_went_wrong && result.verdict === "error_found" && <Row label="What went wrong" body={result.what_went_wrong} />}
        {result.concept_to_revise && <Row label="Concept to revise" body={result.concept_to_revise} />}
        {result.marks_at_risk && <Row label="Marks at risk in the board exam" body={result.marks_at_risk} accent={C.amber} />}

        {result.verdict === "error_found" && hints.length > 0 && !isParent && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...S.rowLabel, color: C.ink }}>Hints — try to fix it yourself first</div>
            {shownHints.map((h, i) => (
              <div key={i} style={hintCard}>
                <b>Hint {i + 1}{i === 3 ? " (worked example, different numbers)" : ""}:</b> {h}
              </div>
            ))}
            {!isTeacher && hintLevel < Math.min(4, hints.length) && (
              <button onClick={() => setHintLevel(hintLevel + 1)} style={hintBtn}>
                {hintLevel === 0 ? "I'm stuck — show hint 1" : `Still stuck — show hint ${hintLevel + 1}`}
              </button>
            )}
          </div>
        )}

        {result.exam_marking_tips?.length > 0 && !isParent && (
          <Row label="CBSE marking scheme" body={result.exam_marking_tips.map((t, i) => <div key={i} style={{ marginBottom: 4 }}>• {t}</div>)} />
        )}

        {result.verdict === "error_found" && result.self_explanation_prompt && !isParent && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...S.rowLabel, color: C.green }}>Explain it back (this is where it sticks)</div>
            <div style={{ ...S.rowBody, marginBottom: 6 }}>{result.self_explanation_prompt}</div>
            <textarea value={selfExp} onChange={(e) => setSelfExp(e.target.value)} rows={2} style={S.textarea} placeholder="In your own words…" />
            <button onClick={checkExplanation} disabled={busy || !selfExp.trim()} style={{ ...S.ghostBtn, marginTop: 8 }}>
              {busy ? "Checking…" : "Check my explanation"}
            </button>
            {selfExpRes && (
              <div style={{ ...hintCard, borderColor: selfExpRes.understood ? C.green : "#C9A23A", marginTop: 8 }}>
                <b>{selfExpRes.understood ? "You've got it. " : "Almost. "}</b>{selfExpRes.feedback}
              </div>
            )}
          </div>
        )}

        {result.encouragement && <div style={{ fontFamily: "'Caveat', cursive", fontSize: 20, color: C.green, marginTop: 8 }}>{result.encouragement}</div>}

        {/* Parent/teacher only: the full worked answer, on demand. */}
        <AnswerKey question={question} chapter={result.chapter} view={view} />

        {onSaveMistake && result.verdict === "error_found" && (
          <button onClick={onSaveMistake} disabled={saved} style={{ ...S.ghostBtn, marginTop: 12 }}>
            {saved ? "Saved — will resurface for revision ✓" : "Save mistake to error log"}
          </button>
        )}
      </div>
    </section>
  );
}

const hintCard = { background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13.5, lineHeight: 1.45, marginBottom: 6 };
const hintBtn = { padding: "8px 14px", background: "#fff", border: `1.5px dashed ${C.ink}`, color: C.ink, fontWeight: 700, fontSize: 13, borderRadius: 8, cursor: "pointer" };
