import { S, C, CHAPTERS, ERROR_TYPES } from "../lib/styles.js";
import { todayStr, addDays } from "../lib/storage.js";

export default function Progress({ data, setData, view }) {
  const counts = ERROR_TYPES.map((t) => ({ type: t, n: data.mistakes.filter((e) => e.errorType === t).length }))
    .filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
  const maxCount = Math.max(1, ...counts.map((c) => c.n));

  const chapterStats = CHAPTERS.map((c) => {
    const cs = data.checks.filter((k) => k.chapter === c && k.verdict !== "unclear");
    const ok = cs.filter((k) => k.verdict === "all_correct").length;
    return { chapter: c, total: cs.length, pct: cs.length ? Math.round((ok / cs.length) * 100) : null };
  }).filter((s) => s.total > 0);

  const weekAgo = addDays(todayStr(), -7);
  const weekChecks = data.checks.filter((k) => k.date >= weekAgo).length;
  const atRisk = chapterStats.filter((s) => s.total >= 3 && s.pct < 60);

  if (data.checks.length === 0 && data.mistakes.length === 0) {
    return <main style={S.main}><div style={S.empty}>Check a few sums first — mastery per chapter and error patterns will appear here.</div></main>;
  }

  return (
    <main style={S.main}>
      <div style={{ background: "#EDF2FB", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
        <b>This week:</b> {weekChecks} check{weekChecks === 1 ? "" : "s"}
        {counts.length > 0 && <> · <b>Biggest leak:</b> {counts[0].type}</>}
        {atRisk.length > 0 && <> · <b>Chapters at risk:</b> {atRisk.map((s) => s.chapter).join(", ")}</>}
      </div>

      {chapterStats.length > 0 && (
        <>
          <h2 style={S.h2}>Mastery by chapter (steps-correct rate)</h2>
          {chapterStats.map((s) => (
            <div key={s.chapter} style={S.bar}>
              <div style={S.barLabel}>{s.chapter}</div>
              <div style={S.barTrack}><div style={{ height: "100%", width: `${s.pct}%`, background: s.pct >= 60 ? C.green : "#C9A23A", borderRadius: 7 }} /></div>
              <div style={S.barN}>{s.pct}%</div>
            </div>
          ))}
        </>
      )}

      {/* Error-leak bars: hidden in parent view to keep it word-light? Kept — it's plain-English and useful to a parent. */}
      {counts.length > 0 && (
        <>
          <h2 style={{ ...S.h2, marginTop: 18 }}>Where the marks are leaking</h2>
          {counts.map((c) => (
            <div key={c.type} style={S.bar}>
              <div style={S.barLabel}>{c.type}</div>
              <div style={S.barTrack}><div style={{ height: "100%", width: `${(c.n / maxCount) * 100}%`, background: C.red, borderRadius: 7 }} /></div>
              <div style={S.barN}>{c.n}</div>
            </div>
          ))}
        </>
      )}

      {view !== "parent" && data.mistakes.length > 0 && (
        <>
          <h2 style={{ ...S.h2, marginTop: 18 }}>Recent mistakes</h2>
          {data.mistakes.slice(0, 20).map((e) => (
            <div key={e.id} style={S.card}>
              <div style={S.meta}>{e.date} · {e.chapter} · <b>{e.errorType}</b></div>
              <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{e.note}</div>
            </div>
          ))}
        </>
      )}

      <button
        onClick={() => { if (confirm("Clear ALL data (checks, mistakes, paper attempts)?")) setData({ checks: [], mistakes: [], papers: data.papers, attempts: [] }); }}
        style={{ marginTop: 16, padding: "9px 14px", background: "none", border: `1.5px solid ${C.border}`, borderRadius: 8, color: "#8C2B2B", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
        Clear all data
      </button>
    </main>
  );
}
