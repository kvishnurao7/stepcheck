import { useState } from "react";
import { S, C } from "../lib/styles.js";
import { api } from "../lib/api.js";
import { todayStr, addDays, REVIEW_GAPS } from "../lib/storage.js";

export default function Revise({ data, setData, onPractice }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const due = data.mistakes.filter((e) => e.nextReview && e.nextReview <= todayStr());
  const upcoming = data.mistakes.filter((e) => e.nextReview && e.nextReview > todayStr())
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  const retired = data.mistakes.filter((e) => !e.nextReview);

  const markRevised = (id) => {
    const mistakes = data.mistakes.map((e) => {
      if (e.id !== id) return e;
      const stage = e.stage + 1;
      return stage >= REVIEW_GAPS.length
        ? { ...e, stage, nextReview: null }
        : { ...e, stage, nextReview: addDays(todayStr(), REVIEW_GAPS[stage]) };
    });
    setData({ ...data, mistakes });
  };

  const practice = async (entry) => {
    setBusyId(entry.id); setError("");
    try {
      const r = await api.variant({ entry });
      onPractice({ chapter: entry.chapter, question: r.question || "" });
    } catch {
      setError("Couldn't generate a practice sum. Try again.");
    } finally { setBusyId(null); }
  };

  return (
    <main style={S.main}>
      {error && <div style={S.errorBox}>{error}</div>}
      <h2 style={S.h2}>Due today ({due.length})</h2>
      {due.length === 0 ? (
        <div style={S.empty}>Nothing due. Mistakes you save come back on day 1, 3, 7 and 21 - spacing is what makes them stick.</div>
      ) : due.map((e) => (
        <div key={e.id} style={S.card}>
          <div style={S.meta}>{e.chapter} · <b>{e.errorType}</b> · saved {e.date}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{e.note}</div>
          {e.concept && <div style={{ fontSize: 12.5, color: C.green, marginTop: 4, fontWeight: 600 }}>Concept: {e.concept}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => practice(e)} disabled={busyId === e.id}
              style={{ padding: "9px 12px", background: C.ink, border: "none", color: "var(--accent-on)", fontWeight: 700, fontSize: 12.5, borderRadius: 8, cursor: "pointer" }}>
              {busyId === e.id ? "Making a sum…" : "Practice a similar sum"}
            </button>
            <button onClick={() => markRevised(e.id)}
              style={{ padding: "9px 12px", background: C.surface, border: `1.5px solid ${C.green}`, color: C.green, fontWeight: 700, fontSize: 12.5, borderRadius: 8, cursor: "pointer" }}>
              Revised ✓
            </button>
          </div>
        </div>
      ))}

      {upcoming.length > 0 && (
        <>
          <h2 style={{ ...S.h2, marginTop: 18 }}>Coming up</h2>
          {upcoming.slice(0, 8).map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 2px", borderBottom: `1px solid ${C.border}` }}>
              <span>{e.chapter} · {e.errorType}</span>
              <span style={{ color: C.muted }}>{e.nextReview}</span>
            </div>
          ))}
        </>
      )}
      {retired.length > 0 && (
        <div style={{ ...S.empty, paddingTop: 14 }}>🏆 {retired.length} mistake{retired.length > 1 ? "s" : ""} fully revised (all 4 rounds done).</div>
      )}
    </main>
  );
}
