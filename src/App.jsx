import { useEffect, useState } from "react";
import { S, C } from "./lib/styles.js";
import { getView, setView as persistView, loadData, saveData } from "./lib/storage.js";
import Check from "./components/Check.jsx";
import Revise from "./components/Revise.jsx";
import Progress from "./components/Progress.jsx";
import Papers from "./components/Papers.jsx";

const TABS = [
  ["check", "Check"],
  ["revise", "Revise"],
  ["papers", "Papers"],
  ["progress", "Progress"],
];

const VIEWS = [
  ["child", "Child"],
  ["parent", "Parent"],
  ["teacher", "Teacher"],
];

export default function App() {
  const [tab, setTab] = useState("check");
  const [view, setView] = useState(getView());
  const [data, setData] = useState(loadData());
  const [prefill, setPrefill] = useState(null);

  // Persist data on every change.
  useEffect(() => { saveData(data); }, [data]);

  const changeView = (v) => { setView(v); persistView(v); };

  // From Revise → "Practice a similar sum": prefill Check and jump to it.
  const practicePrefill = (p) => { setPrefill(p); setTab("check"); };

  const due = data.mistakes.filter((e) => e.nextReview && e.nextReview <= new Date().toISOString().slice(0, 10)).length;

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div>
          <div style={S.logo}>Step<span style={{ color: C.red }}>Check</span></div>
          <div style={S.tagline}>Checks your steps. Never gives the answer.</div>
        </div>
        <div style={S.viewSwitch}>
          {VIEWS.map(([id, label]) => (
            <button key={id} onClick={() => changeView(id)} style={S.viewBtn(view === id)}>{label}</button>
          ))}
        </div>
      </header>

      {tab === "check" && <Check view={view} data={data} setData={setData} prefill={prefill} key={prefill ? prefill.question : "check"} />}
      {tab === "revise" && <Revise data={data} setData={setData} onPractice={practicePrefill} />}
      {tab === "papers" && <Papers data={data} setData={setData} view={view} />}
      {tab === "progress" && <Progress data={data} setData={setData} view={view} />}

      <footer style={S.footer}>
        Calibrated to the NCERT method and CBSE step-wise marking (method marks + error-carried-forward).
        When the teacher's method differs from an app's — the teacher's method wins in the board exam.
      </footer>

      <nav style={S.tabbar}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); if (id !== "check") setPrefill(null); }} style={S.tabBtn(tab === id)}>
            {label}{id === "revise" && due > 0 ? ` (${due})` : ""}
          </button>
        ))}
      </nav>
    </div>
  );
}
