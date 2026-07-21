import { useState } from "react";
import { S, C, CHAPTERS } from "../lib/styles.js";
import { api } from "../lib/api.js";
import { resizeImage } from "../lib/image.js";
import { todayStr, addDays, REVIEW_GAPS } from "../lib/storage.js";
import Notebook from "./Notebook.jsx";

const AUTO = ""; // empty chapter = let the AI identify it (papers are often mixed)

export default function Check({ view, data, setData, prefill }) {
  const [chapter, setChapter] = useState(prefill?.chapter || AUTO);
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
    try {
      setImage(await resizeImage(f));
    } catch {
      // Most common cause: iPhone HEIC photos, which browsers can't decode.
      const isHeic = /\.hei[cf]$/i.test(f.name) || /hei[cf]/i.test(f.type);
      setError(isHeic
        ? "That photo is in HEIC format, which the browser can't read. Retake it with the camera button here, or set the phone camera to 'Most compatible' (JPEG)."
        : `Couldn't read that photo (${f.type || "unknown type"}). Try retaking it, or use a JPEG/PNG.`);
      e.target.value = "";
    }
  };

  const run = async () => {
    if (!image && !typedWork.trim()) { setError("Add a photo of the working, or type the steps."); return; }
    setBusy(true); setError(""); setResult(null); setSaved(false);
    try {
      const r = await api.check({ chapter, question: question.trim(), typedWork: typedWork.trim(), image: image?.base64 || null });
      setResult(r);
      // Trust the AI's chapter identification (papers are mixed); fall back to the manual pick.
      const usedChapter = (r.chapter && CHAPTERS.includes(r.chapter)) ? r.chapter : (chapter || "Unclassified");
      setData({ ...data, checks: [...data.checks, { date: todayStr(), chapter: usedChapter, verdict: r.verdict }] });
    } catch (e) {
      // Show the actual reason - "try again" advice without it was undebuggable.
      const detail = e?.message && e.message !== "Failed to fetch" ? ` (${e.message})` : " - couldn't reach the server. Refresh the page and try again.";
      setError(`The check didn't go through${detail}`);
    } finally { setBusy(false); }
  };

  const saveMistake = () => {
    if (!result || result.verdict !== "error_found") return;
    const entry = {
      id: Date.now(), date: todayStr(),
      chapter: (result.chapter && CHAPTERS.includes(result.chapter)) ? result.chapter : (chapter || "Unclassified"),
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
        <option value={AUTO}>Auto-detect (mixed paper - any chapter)</option>
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
