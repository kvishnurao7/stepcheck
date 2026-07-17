import { useState } from "react";
import { S, C } from "../lib/styles.js";
import { api } from "../lib/api.js";
import { resizeImage } from "../lib/image.js";
import { todayStr, addDays, REVIEW_GAPS } from "../lib/storage.js";
import AnswerKey from "./AnswerKey.jsx";

// Papers feature. Three screens: library → attempt → report.
// View modes: child (attempt + progressive marking), parent (report only, word-light),
// teacher (full breakdown, printable).
export default function Papers({ data, setData, view }) {
  const [screen, setScreen] = useState("library"); // library | add | attempt | report
  const [activePaper, setActivePaper] = useState(null);
  const [attempt, setAttempt] = useState(null); // { paperId, idx, answers:{qnum: {marks, breakdown, mine?}}, selfMark }

  // ---------- Add paper ----------
  const [raw, setRaw] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState("");

  const addPaper = async () => {
    setAddBusy(true); setAddErr("");
    try {
      const parsed = await api.parsePaper({ rawText: raw });
      const paper = { id: Date.now(), ...parsed };
      setData({ ...data, papers: [paper, ...data.papers] });
      setRaw(""); setScreen("library");
    } catch (e) {
      setAddErr("Couldn't parse that. Make sure it's the full paper text.");
    } finally { setAddBusy(false); }
  };

  // ---------- Attempt ----------
  const startAttempt = (paper) => {
    setActivePaper(paper);
    setAttempt({ paperId: paper.id, idx: 0, answers: {}, selfMark: false });
    setScreen("attempt");
  };

  const finishAttempt = () => {
    const earned = Object.values(attempt.answers).reduce((s, a) => s + (a.marks || 0), 0);
    const record = { id: Date.now(), paperId: activePaper.id, title: activePaper.title,
      date: todayStr(), earned, total: activePaper.total_marks, answers: attempt.answers };
    setData({ ...data, attempts: [record, ...data.attempts] });
    setScreen("report");
  };

  // ===================== LIBRARY =====================
  if (screen === "library") {
    return (
      <main style={S.main}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={S.h2}>Papers</h2>
          {view !== "parent" && <button onClick={() => setScreen("add")} style={S.ghostBtn}>+ Add paper</button>}
        </div>

        {data.papers.length === 0 ? (
          <div style={S.empty}>No papers yet. {view !== "parent" ? 'Tap "Add paper", paste a full CBSE sample paper, and StepCheck will turn it into a timed attempt.' : "Ask a parent to add a sample paper."}</div>
        ) : data.papers.map((p) => {
          const lastAttempt = data.attempts.find((a) => a.paperId === p.id);
          return (
            <div key={p.id} style={S.card}>
              <div style={{ fontWeight: 700, color: C.ink }}>{p.title}</div>
              <div style={S.meta}>{p.questions?.length || 0} questions · {p.total_marks} marks</div>
              {lastAttempt && <div style={{ fontSize: 12.5, color: C.green, marginBottom: 6 }}>Last score: {lastAttempt.earned}/{lastAttempt.total}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {view !== "parent" && <button onClick={() => startAttempt(p)} style={{ ...S.ghostBtn, fontSize: 12.5 }}>Attempt</button>}
                {lastAttempt && <button onClick={() => { setActivePaper(p); setAttempt({ paperId: p.id, answers: lastAttempt.answers }); setScreen("report"); }} style={{ ...S.ghostBtn, fontSize: 12.5 }}>View report</button>}
              </div>
            </div>
          );
        })}
      </main>
    );
  }

  // ===================== ADD =====================
  if (screen === "add") {
    return (
      <main style={S.main}>
        <h2 style={S.h2}>Add a paper</h2>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
          Paste the full text of a CBSE Class 10 maths paper. StepCheck sorts every question by section, marks and chapter.
        </div>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={10} style={S.textarea} placeholder="Paste the whole question paper here…" />
        {addErr && <div style={S.errorBox}>{addErr}</div>}
        <button onClick={addPaper} disabled={addBusy || raw.trim().length < 40} style={{ ...S.primaryBtn, opacity: addBusy ? 0.6 : 1 }}>
          {addBusy ? "Reading the paper…" : "Add this paper"}
        </button>
        <button onClick={() => setScreen("library")} style={{ ...S.ghostBtn, marginTop: 10, width: "100%" }}>Cancel</button>
      </main>
    );
  }

  // ===================== ATTEMPT =====================
  if (screen === "attempt" && activePaper) {
    return <Attempt paper={activePaper} attempt={attempt} setAttempt={setAttempt} onFinish={finishAttempt} onQuit={() => setScreen("library")} />;
  }

  // ===================== REPORT =====================
  if (screen === "report" && activePaper) {
    return <Report paper={activePaper} answers={attempt.answers} view={view} data={data} setData={setData} onBack={() => setScreen("library")} />;
  }

  return null;
}

// ---------- Attempt component ----------
function Attempt({ paper, attempt, setAttempt, onFinish, onQuit }) {
  const questions = paper.questions || [];
  const q = questions[attempt.idx];
  const [typedWork, setTypedWork] = useState("");
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [mcqChoice, setMcqChoice] = useState(null);
  const [err, setErr] = useState("");

  if (!q) return null;

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { setImage(await resizeImage(f)); } catch { setErr("Couldn't read that photo."); }
  };

  const advance = (answer) => {
    const answers = { ...attempt.answers, [q.number]: answer };
    setTypedWork(""); setImage(null); setFeedback(null); setMcqChoice(null); setErr("");
    if (attempt.idx + 1 >= questions.length) {
      setAttempt({ ...attempt, answers });
      setTimeout(onFinish, 0);
    } else {
      setAttempt({ ...attempt, idx: attempt.idx + 1, answers });
    }
  };

  const submitMcq = () => {
    // We do not reveal correctness of MCQs here to avoid leaking; parent/teacher can see the key.
    advance({ type: "mcq", chosen: mcqChoice, marks: 0, marks_total: q.marks, breakdown: [] });
  };

  const submitWritten = async () => {
    if (!image && !typedWork.trim()) { advance({ type: "written", skipped: true, marks: 0, marks_total: q.marks }); return; }
    setBusy(true); setErr("");
    try {
      const r = await api.markAnswer({ question: q.text, marksTotal: q.marks, chapter: q.chapter, typedWork: typedWork.trim(), image: image?.base64 || null });
      setFeedback({ ...r, chapter: q.chapter, question: q.text });
    } catch {
      setErr("Marking didn't go through. Try again, or Skip.");
    } finally { setBusy(false); }
  };

  return (
    <main style={S.main}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Q{q.number} of {questions.length} · Section {q.section} · {q.marks} mark{q.marks > 1 ? "s" : ""}</div>
        <button onClick={onQuit} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>Quit</button>
      </div>
      <div style={{ height: 6, background: "#E4E0D4", borderRadius: 4, marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${((attempt.idx) / questions.length) * 100}%`, background: C.ink, borderRadius: 4 }} />
      </div>

      <div style={{ ...S.card, background: C.cream }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>{q.chapter}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{q.text}</div>
      </div>

      {q.type === "mcq" ? (
        <>
          {(q.mcq_options || []).map((opt, i) => (
            <button key={i} onClick={() => setMcqChoice(i)}
              style={{ display: "block", width: "100%", textAlign: "left", margin: "6px 0", padding: "11px 12px",
                borderRadius: 8, border: `1.5px solid ${mcqChoice === i ? C.ink : C.border}`,
                background: mcqChoice === i ? "#EDF2FB" : "#fff", fontSize: 14, cursor: "pointer" }}>
              {String.fromCharCode(97 + i)}) {opt}
            </button>
          ))}
          {err && <div style={S.errorBox}>{err}</div>}
          <button onClick={submitMcq} disabled={mcqChoice === null} style={{ ...S.primaryBtn, opacity: mcqChoice === null ? 0.5 : 1 }}>
            {attempt.idx + 1 >= questions.length ? "Finish paper" : "Next question"}
          </button>
        </>
      ) : (
        <>
          {!feedback && (
            <>
              <label style={S.label}>Photograph your working</label>
              <input type="file" accept="image/*" capture="environment" onChange={onFile} style={{ width: "100%", fontSize: 13 }} />
              {image && <img src={image.preview} alt="working" style={S.preview} />}
              <label style={S.label}>…or type your steps</label>
              <textarea value={typedWork} onChange={(e) => setTypedWork(e.target.value)} rows={4} style={S.textarea} />
              {err && <div style={S.errorBox}>{err}</div>}
              <button onClick={submitWritten} disabled={busy} style={{ ...S.primaryBtn, opacity: busy ? 0.6 : 1 }}>
                {busy ? "Marking your answer…" : "Mark my answer"}
              </button>
              <button onClick={() => advance({ type: "written", skipped: true, marks: 0, marks_total: q.marks })}
                style={{ ...S.ghostBtn, marginTop: 10, width: "100%" }}>Skip this question</button>
            </>
          )}
          {feedback && (
            <>
              <div style={{ ...S.card, background: C.cream, marginTop: 12 }}>
                <div style={{ fontFamily: "'Caveat', cursive", fontSize: 24, color: feedback.marks_awarded >= feedback.marks_total ? C.green : C.amber }}>
                  {feedback.marks_awarded} / {feedback.marks_total} marks
                </div>
                {(feedback.step_breakdown || []).map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 13 }}>
                    <span style={S.chip(s.awarded >= s.possible ? C.green : C.red)}>{s.awarded}/{s.possible}</span>
                    <span>{s.step}{s.comment ? ` — ${s.comment}` : ""}</span>
                  </div>
                ))}
                {feedback.first_wrong_step && <div style={{ marginTop: 8, fontSize: 13, color: C.red }}><b>First wrong step:</b> {feedback.first_wrong_step}</div>}
                {feedback.tip && <div style={{ marginTop: 6, fontSize: 12.5, color: C.amber, fontStyle: "italic" }}>TIP — {feedback.tip}</div>}
              </div>
              <button onClick={() => advance({ type: "written", marks: feedback.marks_awarded, marks_total: feedback.marks_total,
                breakdown: feedback.step_breakdown, error_type: feedback.error_type, concept: feedback.concept_to_revise,
                first_wrong_step: feedback.first_wrong_step, chapter: q.chapter, question: q.text })}
                style={S.primaryBtn}>
                {attempt.idx + 1 >= questions.length ? "Finish paper" : "Next question"}
              </button>
            </>
          )}
        </>
      )}
    </main>
  );
}

// ---------- Report component ----------
function Report({ paper, answers, view, data, setData, onBack }) {
  const questions = paper.questions || [];
  const earned = Object.values(answers).reduce((s, a) => s + (a.marks || 0), 0);
  const total = paper.total_marks;

  const sections = ["A", "B", "C", "D", "E"];
  const bySection = sections.map((sec) => {
    const qs = questions.filter((q) => q.section === sec);
    const av = qs.reduce((s, q) => s + q.marks, 0);
    const got = qs.reduce((s, q) => s + (answers[q.number]?.marks || 0), 0);
    return { sec, av, got, count: qs.length };
  }).filter((s) => s.count > 0);

  // Plain-English diagnostics from written-answer error types.
  const lost = {};
  questions.forEach((q) => {
    const a = answers[q.number];
    if (a && a.marks < a.marks_total && a.error_type) {
      lost[a.error_type] = (lost[a.error_type] || 0) + (a.marks_total - a.marks);
    }
  });
  const diagnostics = Object.entries(lost).sort((x, y) => y[1] - x[1]);

  const saveAllMistakes = () => {
    const newMistakes = questions.filter((q) => {
      const a = answers[q.number];
      return a && a.type === "written" && !a.skipped && a.marks < a.marks_total;
    }).map((q, i) => {
      const a = answers[q.number];
      return { id: Date.now() + i, date: todayStr(), chapter: q.chapter,
        errorType: a.error_type || "Concept gap", concept: a.concept || "",
        note: a.first_wrong_step || `Lost ${a.marks_total - a.marks} mark(s) in Q${q.number}`,
        question: q.text, stage: 0, nextReview: addDays(todayStr(), REVIEW_GAPS[0]) };
    });
    setData({ ...data, mistakes: [...newMistakes, ...data.mistakes] });
    alert(`${newMistakes.length} mistake(s) added to the error log for spaced revision.`);
  };

  return (
    <main style={S.main}>
      <h2 style={S.h2}>Report card — {paper.title}</h2>
      <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 46, color: C.ink, lineHeight: 1 }}>{earned}<span style={{ fontSize: 26, color: C.muted }}> / {total}</span></div>
      </div>

      {bySection.map((s) => (
        <div key={s.sec} style={S.bar}>
          <div style={S.barLabel}>Section {s.sec}</div>
          <div style={S.barTrack}><div style={{ height: "100%", width: `${s.av ? (s.got / s.av) * 100 : 0}%`, background: C.green, borderRadius: 7 }} /></div>
          <div style={S.barN}>{s.got}/{s.av}</div>
        </div>
      ))}

      {diagnostics.length > 0 && (
        <div style={{ background: "#EDF2FB", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
          <b>Where the marks went:</b>
          {diagnostics.map(([type, n]) => <div key={type}>• Lost {n} mark{n > 1 ? "s" : ""} to {type.toLowerCase()}.</div>)}
        </div>
      )}

      {/* Per-question list. All three views now get it; parents/teachers also
          get the deliberately-revealing worked answer key per question. */}
      <h2 style={{ ...S.h2, marginTop: 18 }}>Question by question</h2>
      {questions.map((q) => {
        const a = answers[q.number] || {};
        const got = a.marks ?? 0;
        return (
          <div key={q.number} style={{ ...S.card }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: C.ink }}>Q{q.number} · {q.chapter}</span>
              <span style={S.chip(got >= q.marks ? C.green : got > 0 ? C.amber : C.red)}>{got}/{q.marks}</span>
            </div>
            {view === "teacher" && (a.breakdown || []).map((b, i) => (
              <div key={i} style={{ fontSize: 12.5, marginTop: 4 }}>{b.awarded}/{b.possible} — {b.step}{b.comment ? ` (${b.comment})` : ""}</div>
            ))}
            {a.first_wrong_step && view !== "parent" && <div style={{ fontSize: 12.5, color: C.red, marginTop: 4 }}>First wrong step: {a.first_wrong_step}</div>}
            <AnswerKey question={q.text} chapter={q.chapter} marksTotal={q.marks} view={view} />
          </div>
        );
      })}

      {view !== "parent" && (
        <button onClick={saveAllMistakes} style={{ ...S.primaryBtn }}>Save all mistakes to error log</button>
      )}
      <button onClick={onBack} style={{ ...S.ghostBtn, marginTop: 10, width: "100%" }}>Back to papers</button>
    </main>
  );
}
