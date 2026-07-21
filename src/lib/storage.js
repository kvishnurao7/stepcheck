// All persistence for v1 is local to the device (localStorage).
// See CLAUDE.md → "Upgrading storage" for moving the error log to Supabase for cross-device sync.

const KEYS = {
  view: "stepcheck.view",
  data: "stepcheck.data.v1", // { checks:[], mistakes:[], papers:[], attempts:[] }
};

export const REVIEW_GAPS = [1, 3, 7, 21]; // days after save, then after each round

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---- view mode ----
// Only "child" and "parent" exist. The old "teacher" mode was removed; anyone
// still holding it in localStorage falls back to the parent (grown-up) view.
export const getView = () => {
  const v = localStorage.getItem(KEYS.view);
  return v === "parent" || v === "child" ? v : (v === "teacher" ? "parent" : "child");
};
export const setView = (v) => localStorage.setItem(KEYS.view, v);

// ---- app data ----
const EMPTY = { checks: [], mistakes: [], papers: [], attempts: [] };

export function loadData() {
  try {
    const raw = localStorage.getItem(KEYS.data);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveData(data) {
  localStorage.setItem(KEYS.data, JSON.stringify(data));
}
