import { useState } from "react";
import { S, C, CHAPTERS } from "../lib/styles.js";
import { api } from "../lib/api.js";
import { resizeImage } from "../lib/image.js";
import { todayStr, addDays, REVIEW_GAPS } from "../lib/storage.js";
import Notebook from "./Notebook.jsx";

export default function Check({ view, data, setData, prefill }) {
  const [chapter, setChapter] = useState(prefill?.chapter || CHAPTERS[3]);
  const [question, setQuestion] = useState(prefill?.question || "");
  const [typedWork, setTypedWork] = useState("");
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    try { setImage(await resizeImage(f)); } catch { setError("Couldn't read that photo."); }
  };

  const run = async () => {
    if (!image && !typedWork.trim()) { setError("Add a photo of the working, or type the steps."); return; }
    setBusy(true); setError(""); setResult(null); setSaved(false);
    try {
      const r = await api.check({ chapter, question: question.trim(), typedWork: typedWork.trim(), image: image?.base64 || null });
      setResult(r);
      setData({ ...data, checks: [...data.checks, { date: todayStr(), chapter, verdict: r.verdict }] });
    } catch (e) {
      setError("The check didn't go through. Make sure the photo is clear and try again.");
    } finally { setBusy(false); }
  };

  const saveMistake = () => {
    if (!result || result.verdict !== "error_found") return;
    const entry = {
      id: Date.now(), date: todayStr(), chapter,
      errorType: result.error_type || "Concept gap",
      concept: result.concept_to_revise || "", note: result.what_went_wrong || "",
      question: question.trim(), stage: 0, nextReview: addDays(todayStr(), REVIEW_GAPS[0]),
    };
    setData({ ...data, mistakes: [entry, ...data.mistakes] });
    setSaved(true);
  };

  return (
    <main style={S.main}>
      <label style={S.label}>Chapter</label>
      <select value={chapter} onChange={(e) => setChapter(e.target.value)} style={S.select}>
        {CHAPTERS.map((c) => <option key={c}>{c}</option>)}
      </select>

      <label style={S.label}>The question (type it if it's not in the photo)</label>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} style={S.textarea}
        placeholder="e.g. Find the roots of 2x² − 7x + 3 = 0 by factorisation" />

      <label style={S.label}>Photo of the handwritten working</label>
      <input type="file" accept="image/*" capture="environment" onChange={onFile} style={{ width: "100%", fontSize: 13 }} />
      {image && <img src={image.preview} alt="Your working" style={S.preview} />}

      <label style={S.label}>…or type the steps</label>
      <textarea value={typedWork} onChange={(e) => setTypedWork(e.target.value)} rows={4} style={S.textarea}
        placeholder={"Step 1: 2x² − 7x + 3 = 0\nStep 2: 2x² − 6x − x + 3 = 0\n…"} />

      {error && <div style={S.errorBox}>{error}</div>}

      <button onClick={run} disabled={busy} style={{ ...S.primaryBtn, opacity: busy ? 0.6 : 1 }}>
        {busy ? "Reading your steps…" : "Check my steps"}
      </button>

      <Notebook result={result} question={question} view={view} onSaveMistake={saveMistake} saved={saved} />
    </main>
  );
}
