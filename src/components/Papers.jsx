import { useState, useEffect } from "react";
import { S, C } from "../lib/styles.js";
import { api } from "../lib/api.js";
import { resizeImage } from "../lib/image.js";
import { todayStr, addDays, REVIEW_GAPS } from "../lib/storage.js";
import AnswerKey from "./AnswerKey.jsx";

// Papers feature. Screens: library → attempt → report, plus a parent-only answer sheet.
// View modes: child (attempts papers, never sees answers), parent (adds papers,
// full answer key, marking detail).
export default function Papers({ data, setData, view }) {
  const [screen, setScreen] = useState("library"); // library | add | attempt | report
  const [activePaper, setActivePaper] = useState(null);
  const [attempt, setAttempt] = useState(null); // { paperId, idx, answers:{qnum: {marks, breakdown, mine?}}, selfMark }

  // The add/answers screens are parent-only. If the view switches to
  // child while on one of them, bounce back to the library so the child never
  // lands on a blank (answer-revealing) screen.
  useEffect(() => {
    if (view === "child" && (screen === "answers" || screen === "add")) setScreen("library");
  }, [view, screen]);

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

  // Upload a question paper as a PDF - the server reads it directly (works for
  // scanned papers too), builds the questions + the CBSE answer key.
  const addPaperFromPdf = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { setAddErr("Please choose a PDF file (or paste the text instead)."); e.target.value = ""; return; }
    if (f.size > 4.3 * 1024 * 1024) { setAddErr("That PDF is over ~4 MB - try a smaller/compressed file, or paste the text instead."); e.target.value = ""; return; }
    setAddBusy(true); setAddErr("");
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1]);
        r.onerror = () => rej(new Error("read failed"));
        r.readAsDataURL(f);
      });
      const parsed = await api.parsePaper({ pdf: b64 });
      const paper = { id: Date.now(), ...parsed };
      setData({ ...data, papers: [paper, ...data.papers] });
      setScreen("library");
    } catch (err) {
      setAddErr("Couldn't read that PDF. Make sure it's a clear question-paper PDF under ~4 MB, or paste the text instead.");
    } finally { setAddBusy(false); e.target.value = ""; }
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

  const deletePaper = (p) => {
    if (!confirm(`Delete "${p.title}" and its attempts? This can't be undone.`)) return;
    setData({ ...data, papers: data.papers.filter((x) => x.id !== p.id),
      attempts: data.attempts.filter((a) => a.paperId !== p.id) });
  };

  // ===================== LIBRARY =====================
  if (screen === "library") {
    const isChild = view === "child"; // grown-ups (parent) add papers and see answers; the child attempts.
    return (
      <main style={S.main}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={S.h2}>Papers</h2>
          {!isChild && <button onClick={() => setScreen("add")} style={S.ghostBtn}>+ Add paper</button>}
        </div>

        {data.papers.length === 0 ? (
          <div style={S.empty}>No papers yet. {!isChild ? 'Tap "Add paper", paste a full CBSE sample paper, and StepCheck reads it, sorts every question, and works out the answer key.' : "Ask a parent to add a sample paper."}</div>
        ) : data.papers.map((p) => {
          const lastAttempt = data.attempts.find((a) => a.paperId === p.id);
          return (
            <div key={p.id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontWeight: 700, color: C.ink }}>{p.title}</div>
                {!isChild && <button onClick={() => deletePaper(p)} title="Delete paper"
                  style={{ background: "none", border: "none", color: C.muted, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>×</button>}
              </div>
              <div style={S.meta}>{p.questions?.length || 0} questions · {p.total_marks} marks</div>
              {lastAttempt && <div style={{ fontSize: 12.5, color: C.green, marginBottom: 6 }}>Last score: {lastAttempt.earned}/{lastAttempt.total}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                {view !== "parent" && <button onClick={() => startAttempt(p)} style={{ ...S.ghostBtn, fontSize: 12.5 }}>Attempt</button>}
                {!isChild && <button onClick={() => { setActivePaper(p); setScreen("answers"); }} style={{ ...S.primaryBtn, fontSize: 12.5, width: "auto", padding: "8px 14px" }}>🔑 See answers</button>}
                {lastAttempt && <button onClick={() => { setActivePaper(p); setAttempt({ paperId: p.id, answers: lastAttempt.answers }); setScreen("report"); }} style={{ ...S.ghostBtn, fontSize: 12.5 }}>View report</button>}
              </div>
            </div>
          );
        })}
      </main>
    );
  }

  // ===================== ANSWERS (parent: the whole answer key, no attempt needed) =====================
  if (screen === "answers" && activePaper && view !== "child") {
    return <AnswerSheet paper={activePaper} view={view} data={data} setData={setData} onBack={() => setScreen("library")} />;
  }

  // ===================== ADD =====================
  if (screen === "add") {
    return (
      <main style={S.main}>
        <h2 style={S.h2}>Add a paper</h2>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          StepCheck reads the paper, sorts every question by section, marks and chapter, and works out the CBSE answer key.
        </div>

        {/* Option 1 - upload a PDF */}
        <label style={S.label}>Upload the question paper (PDF)</label>
        <input type="file" accept="application/pdf" onChange={addPaperFromPdf} disabled={addBusy} style={{ width: "100%", fontSize: 13 }} />
        <div style={{ fontSize: 12, color: C.muted, margin: "4px 0 2px" }}>A clear PDF, under ~4 MB. Scanned papers work too.</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.muted }}>or paste the text</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Option 2 - paste text */}
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} style={S.textarea} placeholder="Paste the whole question paper here…" disabled={addBusy} />
        {addErr && <div style={S.errorBox}>{addErr}</div>}
        <button onClick={addPaper} disabled={addBusy || raw.trim().length < 40} style={{ ...S.primaryBtn, opacity: (addBusy || raw.trim().length < 40) ? 0.6 : 1 }}>
          {addBusy ? "Reading the paper…" : "Add this paper"}
        </button>
        {addBusy && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Reading the paper and building the answer key - this can take a minute for a full paper.</div>}
        <button onClick={() => setScreen("library")} disabled={addBusy} style={{ ...S.ghostBtn, marginTop: 10, width: "100%" }}>Cancel</button>
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
    // Score against the key stored on the question, but DON'T show correctness
    // here - the child moves straight on. The mark is revealed only in the
    // report; the correct option only in the parent answer key.
    const marks = (q.answer_index != null && mcqChoice === q.answer_index) ? q.marks : 0;
    advance({ type: "mcq", chosen: mcqChoice, marks, marks_total: q.marks, breakdown: [] });
  };

  const submitWritten = async () => {
    if (!image && !typedWork.trim()) { advance({ type: "written", skipped: true, marks: 0, marks_total: q.marks }); return; }
    setBusy(true); setErr("");
    try {
      const r = await api.markAnswer({ question: q.text, marksTotal: q.marks, chapter: q.chapter, typedWork: typedWork.trim(), image: image?.base64 || null, scheme: (paper.scheme || {})[q.number] });
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
      <div style={{ height: 6, background: C.sunken, borderRadius: 4, marginBottom: 12 }}>
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
                background: mcqChoice === i ? C.inkSoft : C.surface, fontSize: 14, cursor: "pointer" }}>
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
                    <span>{s.step}{s.comment ? ` - ${s.comment}` : ""}</span>
                  </div>
                ))}
                {feedback.first_wrong_step && <div style={{ marginTop: 8, fontSize: 13, color: C.red }}><b>First wrong step:</b> {feedback.first_wrong_step}</div>}
                {feedback.tip && <div style={{ marginTop: 6, fontSize: 12.5, color: C.amber, fontStyle: "italic" }}>TIP - {feedback.tip}</div>}
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
      <h2 style={S.h2}>Report card - {paper.title}</h2>
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
        <div style={{ background: C.inkSoft, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
          <b>Where the marks went:</b>
          {diagnostics.map(([type, n]) => <div key={type}>• Lost {n} mark{n > 1 ? "s" : ""} to {type.toLowerCase()}.</div>)}
        </div>
      )}

      {/* Per-question list. All three views now get it; parents also
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
            {view === "parent" && (a.breakdown || []).map((b, i) => (
              <div key={i} style={{ fontSize: 12.5, marginTop: 4 }}>{b.awarded}/{b.possible} - {b.step}{b.comment ? ` (${b.comment})` : ""}</div>
            ))}
            {a.first_wrong_step && <div style={{ fontSize: 12.5, color: C.red, marginTop: 4 }}>First wrong step: {a.first_wrong_step}</div>}
            {/* MCQ key - parent only. The correct option is an "answer", so the child never sees it. */}
            {q.type === "mcq" && view === "parent" && q.answer_index != null && (
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                <span style={{ color: C.green }}><b>Correct:</b> ({String.fromCharCode(97 + q.answer_index)}) {q.mcq_options?.[q.answer_index]}</span>
                {a.chosen != null && a.chosen !== q.answer_index &&
                  <span style={{ color: C.red, marginLeft: 8 }}>· he chose ({String.fromCharCode(97 + a.chosen)})</span>}
              </div>
            )}
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

// Minimal Markdown → HTML for the printable PDF (## heading, **bold**, bullets).
function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const out = [];
  let inList = false;
  for (const line of (md || "").split("\n")) {
    const t = line.trim();
    if (!t) { if (inList) { out.push("</ul>"); inList = false; } continue; }
    const h = t.match(/^#{1,3}\s+(.*)$/);
    if (h) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h4>${esc(h[1].replace(/\*\*/g, ""))}</h4>`);
    } else if (/^[-*•]\s+/.test(t)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${esc(t.replace(/^[-*•]\s+/, "")).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<p>${esc(t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

// ---------- Answer sheet (parent): the full answer key for a paper,
// without anyone attempting it. MCQs show the correct option inline; every
// question has a "Reveal worked answer" for the full CBSE solution, and the
// whole key can be downloaded as a print-to-PDF sheet. ----------
function AnswerSheet({ paper, view, data, setData, onBack }) {
  const questions = paper.questions || [];
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");
  const [scheme, setScheme] = useState(paper.scheme || null); // { [qnum]: official answer + marks }
  const [showScheme, setShowScheme] = useState(false);
  const [schemeBusy, setSchemeBusy] = useState(false);
  const [schemeText, setSchemeText] = useState("");
  const [schemeErr, setSchemeErr] = useState("");
  if (view === "child") return null; // belt-and-suspenders: never reachable from child view

  const matched = scheme ? Object.keys(scheme).length : 0;

  const persistScheme = (schemeMap) => {
    setScheme(schemeMap);
    if (data && setData) setData({ ...data, papers: data.papers.map((p) => p.id === paper.id ? { ...p, scheme: schemeMap } : p) });
  };

  const attachScheme = async ({ pdf, rawText }) => {
    setSchemeBusy(true); setSchemeErr("");
    try {
      const r = await api.parseScheme({ pdf, rawText, questions });
      if (!r.scheme || !Object.keys(r.scheme).length) { setSchemeErr("Couldn't match any questions to that scheme. Check it's the marking scheme for THIS paper."); return; }
      persistScheme(r.scheme);
      setShowScheme(false); setSchemeText("");
    } catch {
      setSchemeErr("Couldn't read that marking scheme. Try a clearer PDF (under ~4 MB) or paste the text.");
    } finally { setSchemeBusy(false); }
  };

  const onSchemePdf = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.type !== "application/pdf") { setSchemeErr("Please choose a PDF (or paste the text)."); e.target.value = ""; return; }
    if (f.size > 4.3 * 1024 * 1024) { setSchemeErr("That PDF is over ~4 MB - compress it or paste the text."); e.target.value = ""; return; }
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = () => rej(new Error("read")); r.readAsDataURL(f); });
      await attachScheme({ pdf: b64 });
    } catch { setSchemeErr("Couldn't read that file."); }
    finally { e.target.value = ""; }
  };

  // Build a printable answer key: solve every question (batched), assemble a
  // clean HTML sheet, and print it via a hidden iframe ("Save as PDF" in the
  // dialog). The iframe avoids pop-up blockers that break window.open.
  const downloadPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true); setPdfMsg("Starting…");

    const solutions = new Array(questions.length);
    let done = 0;
    const worker = async (i) => {
      const q = questions[i];
      try {
        const r = await api.solve({ question: q.text, chapter: q.chapter, marksTotal: q.marks, scheme: (scheme || {})[q.number] });
        solutions[i] = r.solution || "";
      } catch { solutions[i] = "_(couldn't generate this one - try again)_"; }
      done++;
      setPdfMsg(`Preparing ${done}/${questions.length}…`);
    };
    // Concurrency pool of 4 to be gentle on rate limits.
    const idx = questions.map((_, i) => i);
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (idx.length) { const i = idx.shift(); if (i !== undefined) await worker(i); }
    }));

    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const body = questions.map((q, i) => {
      const opts = (q.type === "mcq" && (q.mcq_options || []).length)
        ? `<div class="opts">${q.mcq_options.map((o, k) =>
            `<span class="opt ${k === q.answer_index ? "correct" : ""}">(${String.fromCharCode(97 + k)}) ${esc(o)}${k === q.answer_index ? " ✓" : ""}</span>`).join("")}</div>`
        : "";
      return `<section>
        <div class="qh">Q${q.number} &nbsp;·&nbsp; Section ${q.section} &nbsp;·&nbsp; ${esc(q.chapter)} &nbsp;·&nbsp; ${q.marks} mark${q.marks > 1 ? "s" : ""}</div>
        <div class="qt">${esc(q.text)}</div>${opts}
        <div class="ans">${mdToHtml(solutions[i])}</div>
      </section>`;
    }).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(paper.title)} - Answer key</title>
      <style>
        @page { margin: 14mm; }
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; color: #232830;
               background: #F2EFE7; margin: 0; padding: 0; font-size: 16px; line-height: 1.65; }
        .wrap { max-width: 780px; margin: 0 auto; padding: 26px 22px 44px; }
        .head { background: #3B5BDB; color: #fff; border-radius: 14px; padding: 22px 26px; margin-bottom: 24px; }
        .brand { font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; opacity: .92; margin-bottom: 8px; }
        .brand .r { color: #F0A99A; }
        .head h1 { margin: 0; font-size: 25px; line-height: 1.25; }
        .head .sub { opacity: .85; font-size: 13.5px; margin-top: 8px; }
        section { background: #fff; border: 1px solid #E7E1CF; border-radius: 14px; padding: 20px 22px;
                  margin-bottom: 18px; box-shadow: 0 1px 3px rgba(20,30,60,.05); break-inside: avoid; page-break-inside: avoid; }
        .qh { font-size: 12.5px; font-weight: 700; color: #3B5BDB; text-transform: uppercase; letter-spacing: .5px; }
        .qt { font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 8px 0 12px; }
        .opts { margin: 0 0 12px; }
        .opt { display: inline-block; font-size: 15.5px; margin: 0 14px 6px 0; color: #55606f; }
        .opt.correct { color: #067647; font-weight: 700; }
        .ans { font-size: 16px; }
        .ans h4 { color: #D92D20; font-size: 15.5px; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #F1E4E0; }
        .ans p { margin: 6px 0; }
        .ans ul { margin: 6px 0 6px 22px; } .ans li { margin: 4px 0; }
        .ans strong { color: #3B5BDB; }
        .foot { text-align: center; color: #8a8574; font-size: 11.5px; margin-top: 26px; }
      </style></head>
      <body><div class="wrap">
        <div class="head">
          <div class="brand">Step<span class="r">Check</span> &nbsp;·&nbsp; Answer key</div>
          <h1>${esc(paper.title)}</h1>
          <div class="sub">CBSE Class 10 Mathematics · full step-by-step worked solutions · for parent correction</div>
        </div>
        ${body}
        <div class="foot">Worked to the NCERT / CBSE step-wise method. A study aid - please use your own judgement as the final check.</div>
      </div></body></html>`;

    // Print via a hidden same-origin iframe - no pop-up window, so nothing to block.
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    iframe.onload = () => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch { /* if printing is unavailable the on-screen answers still work */ }
      setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 60000);
    };
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();

    setPdfBusy(false); setPdfMsg("");
  };

  return (
    <main style={S.main}>
      <h2 style={S.h2}>Answer key - {paper.title}</h2>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
        Full worked answers for you to check against - this screen is only in Parent view; your child never sees it.
      </div>
      {/* Ground the answers in the OFFICIAL CBSE marking scheme (optional). */}
      <div style={{ background: matched ? "#EAF5EE" : C.inkSoft, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
        {matched ? (
          <div style={{ fontSize: 12.5, color: C.green, lineHeight: 1.5 }}>
            <b>✓ Official CBSE marking scheme attached</b> - matched {matched} of {questions.length} question{questions.length > 1 ? "s" : ""}. Those answers follow the real key and mark split; the rest fall back to the AI method.
            <button onClick={() => setShowScheme((v) => !v)} style={{ ...S.ghostBtn, fontSize: 11.5, marginLeft: 8, padding: "3px 8px" }}>Replace</button>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
            <b>Optional:</b> attach the <b>official CBSE marking scheme</b> for this paper and the answers/marks will follow the real key exactly, not the AI's own derivation.
            <button onClick={() => setShowScheme((v) => !v)} style={{ ...S.ghostBtn, fontSize: 11.5, marginLeft: 8, padding: "3px 8px" }}>{showScheme ? "Close" : "Attach scheme"}</button>
          </div>
        )}
        {showScheme && (
          <div style={{ marginTop: 10 }}>
            <label style={{ ...S.label, marginTop: 0 }}>Marking scheme (PDF)</label>
            <input type="file" accept="application/pdf" onChange={onSchemePdf} disabled={schemeBusy} style={{ width: "100%", fontSize: 12.5 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.border }} /><span style={{ fontSize: 11, color: C.muted }}>or paste text</span><div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <textarea value={schemeText} onChange={(e) => setSchemeText(e.target.value)} rows={4} style={{ ...S.textarea, fontSize: 12.5 }} placeholder="Paste the marking scheme text…" disabled={schemeBusy} />
            <button onClick={() => attachScheme({ rawText: schemeText })} disabled={schemeBusy || schemeText.trim().length < 40} style={{ ...S.ghostBtn, fontSize: 12, marginTop: 6, opacity: (schemeBusy || schemeText.trim().length < 40) ? 0.6 : 1 }}>Use pasted text</button>
          </div>
        )}
        {schemeBusy && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Reading the scheme and matching it to this paper's questions…</div>}
        {schemeErr && <div style={{ ...S.errorBox, marginTop: 8 }}>{schemeErr}</div>}
      </div>

      <button onClick={downloadPdf} disabled={pdfBusy} style={{ ...S.primaryBtn, opacity: pdfBusy ? 0.6 : 1, marginBottom: 6 }}>
        {pdfBusy ? (pdfMsg || "Preparing…") : "⬇ Download answer key (PDF)"}
      </button>
      {pdfBusy && <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Generating every worked solution - this takes a minute for a full paper. Keep this tab open.</div>}
      {!pdfBusy && pdfMsg && <div style={S.errorBox}>{pdfMsg}</div>}
      {questions.map((q) => (
        <div key={q.number} style={S.card}>
          <div style={{ fontWeight: 700, color: C.ink }}>Q{q.number} · Section {q.section} · {q.chapter} · {q.marks} mark{q.marks > 1 ? "s" : ""}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>{q.text}</div>
          {q.type === "mcq" && (q.mcq_options || []).length > 0 && (
            <div style={{ fontSize: 12.5, marginTop: 6 }}>
              {q.mcq_options.map((opt, i) => (
                <div key={i} style={{ color: i === q.answer_index ? C.green : C.muted, fontWeight: i === q.answer_index ? 700 : 400 }}>
                  ({String.fromCharCode(97 + i)}) {opt}{i === q.answer_index ? "  ✓ correct" : ""}
                </div>
              ))}
              {q.answer_index == null && <div style={{ color: C.amber }}>Key not determined - use the worked answer below.</div>}
            </div>
          )}
          <AnswerKey question={q.text} chapter={q.chapter} marksTotal={q.marks} view={view} scheme={scheme?.[q.number]} />
        </div>
      ))}
      <button onClick={onBack} style={{ ...S.ghostBtn, marginTop: 10, width: "100%" }}>Back to papers</button>
    </main>
  );
}
