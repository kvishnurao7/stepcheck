import { useState } from "react";
import { S, C } from "../lib/styles.js";
import { api } from "../lib/api.js";

// Inline formatting: **bold** segments.
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
    p.startsWith("**") && p.endsWith("**")
      ? <b key={j} style={{ color: C.ink }}>{p.slice(2, -2)}</b>
      : <span key={j}>{p}</span>
  );
}

// Renders a tiny subset of Markdown (## / ### headings, **bold**, bullet lines,
// blank lines) so the worked solution reads cleanly — WITHOUT leaking the raw
// "##"/"**" markers — and without pulling in a markdown dependency.
function renderMarkdown(md) {
  return (md || "").split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{ height: 6 }} />;
    const h = t.match(/^(#{1,3})\s+(.*)$/); // ## Method, ### ...
    if (h) {
      return <div key={i} style={{ fontWeight: 700, color: C.ink, fontSize: 14, marginTop: i ? 9 : 0, marginBottom: 2 }}>{renderInline(h[2].replace(/\*\*/g, ""))}</div>;
    }
    const bullet = /^[-*•]\s+/.test(t);
    const text = bullet ? t.replace(/^[-*•]\s+/, "") : t;
    return (
      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3, lineHeight: 1.5 }}>
        {bullet && <span style={{ color: C.ink }}>•</span>}
        <span>{renderInline(text)}</span>
      </div>
    );
  });
}

// The one deliberately answer-revealing UI. Only mount this for parent/teacher.
// `scheme` (optional) is that question's official CBSE marking-scheme text; when
// present the worked answer is grounded in the real key, not re-derived.
export default function AnswerKey({ question, chapter, marksTotal, view, scheme }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState(null);
  const [err, setErr] = useState("");

  if (view !== "parent" && view !== "teacher") return null;
  if (!question) return null;

  const reveal = async () => {
    setOpen(true);
    if (solution || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await api.solve({ question, chapter, marksTotal, scheme });
      setSolution(r.solution);
    } catch {
      setErr("Couldn't fetch the worked solution just now — try again.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button onClick={reveal} style={{ ...S.ghostBtn, fontSize: 12.5 }}>
          🔑 Reveal worked answer (parent/teacher){scheme ? " · official scheme" : ""}
        </button>
      ) : (
        <div style={{ background: "#FBF7ED", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, letterSpacing: 0.3, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>ANSWER KEY — not shown to your child</span>
            {scheme && <span style={{ color: C.green }}>✓ OFFICIAL CBSE SCHEME</span>}
          </div>
          {busy && <div style={{ color: C.muted }}>Working out the full solution…</div>}
          {err && <div style={S.errorBox}>{err}</div>}
          {solution && <div>{renderMarkdown(solution)}</div>}
          {solution && (
            <button onClick={() => setOpen(false)} style={{ ...S.ghostBtn, fontSize: 12, marginTop: 8 }}>Hide</button>
          )}
        </div>
      )}
    </div>
  );
}
