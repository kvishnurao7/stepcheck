// Style tokens. Colours are CSS variables from src/index.css, so every surface
// follows the system light/dark theme automatically.
export const C = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  sunken: "var(--surface-sunken)",

  ink: "var(--accent)",        // brand / primary action
  inkSoft: "var(--accent-soft)",
  red: "var(--danger)",
  redSoft: "var(--danger-soft)",
  green: "var(--success)",
  greenSoft: "var(--success-soft)",
  amber: "var(--warn)",
  amberSoft: "var(--warn-soft)",

  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",

  // Legacy aliases kept so older call sites keep working.
  paper: "var(--bg)",
  cream: "var(--surface-2)",
  line: "var(--border)",
};

const FONT_DISPLAY = "var(--font-display)";

export const S = {
  app: {
    maxWidth: 620, margin: "0 auto", minHeight: "100dvh", background: C.bg,
    fontFamily: "var(--font-body)", color: C.text, paddingBottom: 96,
  },

  header: {
    padding: "20px 20px 12px", display: "flex",
    justifyContent: "space-between", alignItems: "center", gap: 12,
  },
  logo: {
    fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 700,
    letterSpacing: "-0.6px", color: C.ink, lineHeight: 1.1,
  },
  tagline: { fontSize: 12.5, color: C.muted, marginTop: 3, lineHeight: 1.4 },

  // Segmented control (Child / Parent)
  viewSwitch: {
    display: "flex", gap: 2, background: C.sunken,
    border: `1px solid ${C.border}`, borderRadius: "var(--r-pill)", padding: 3,
  },
  viewBtn: (on) => ({
    padding: "6px 14px", fontSize: 12.5, fontWeight: 650, border: "none",
    borderRadius: "var(--r-pill)", cursor: "pointer",
    background: on ? C.surface : "transparent",
    color: on ? C.ink : C.muted,
    boxShadow: on ? "var(--shadow-sm)" : "none",
  }),

  main: { padding: "6px 20px 0" },

  label: {
    display: "block", fontSize: 12, fontWeight: 650, color: C.muted,
    margin: "18px 0 7px", letterSpacing: "0.2px",
  },

  select: {
    width: "100%", padding: "12px 13px", borderRadius: "var(--r-sm)",
    border: `1px solid ${C.borderStrong}`, fontSize: 15, background: C.surface,
    color: C.text, appearance: "none",
  },
  textarea: {
    width: "100%", padding: "12px 13px", borderRadius: "var(--r-sm)",
    border: `1px solid ${C.borderStrong}`, fontSize: 15, background: C.surface,
    color: C.text, boxSizing: "border-box", resize: "vertical", lineHeight: 1.55,
  },
  preview: {
    width: "100%", borderRadius: "var(--r-md)", marginTop: 10,
    border: `1px solid ${C.border}`, display: "block",
  },

  errorBox: {
    marginTop: 12, padding: "11px 13px", background: C.redSoft,
    border: `1px solid ${C.red}`, borderRadius: "var(--r-sm)",
    fontSize: 13.5, color: C.red, lineHeight: 1.5,
  },

  primaryBtn: {
    width: "100%", marginTop: 18, padding: "14px 0", background: C.ink,
    color: "var(--accent-on)", fontSize: 15.5, fontWeight: 650, border: "none",
    borderRadius: "var(--r-md)", boxShadow: "var(--shadow-sm)",
  },
  ghostBtn: {
    padding: "10px 16px", background: C.surface,
    border: `1px solid ${C.borderStrong}`, color: C.ink,
    fontWeight: 650, fontSize: 13.5, borderRadius: "var(--r-sm)",
  },
  // Tinted rather than solid: a solid chip with white text fails contrast in
  // dark mode, where the semantic colours are light. Tint + coloured text
  // reads correctly in both themes.
  chip: (bg) => ({
    display: "inline-block", minWidth: 24, textAlign: "center",
    padding: "3px 10px", background: `color-mix(in srgb, ${bg} 15%, transparent)`,
    border: `1px solid color-mix(in srgb, ${bg} 32%, transparent)`,
    color: bg, fontWeight: 700, fontSize: 11.5,
    borderRadius: "var(--r-pill)", letterSpacing: "0.2px",
  }),

  // Result panel. The old ruled-paper texture is gone; the verdict now reads
  // through a coloured accent rail + the handwriting font.
  notebook: {
    display: "flex", marginTop: 18, background: C.surface,
    border: `1px solid ${C.border}`, borderRadius: "var(--r-lg)",
    overflow: "hidden", boxShadow: "var(--shadow-md)",
  },
  margin: { width: 4, background: C.ink, flexShrink: 0 },
  page: { padding: "16px 18px", flex: 1, minWidth: 0 },
  pen: {
    fontFamily: "var(--font-hand)", fontSize: 30, fontWeight: 700,
    lineHeight: 1.05, marginBottom: 14,
  },
  rowLabel: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.6px", marginBottom: 3, color: C.muted,
  },
  rowBody: { fontSize: 14.5, lineHeight: 1.55 },

  h2: {
    fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 650, color: C.text,
    margin: "14px 0 12px", letterSpacing: "-0.3px",
  },
  card: {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: "var(--r-md)", padding: "14px 16px", marginBottom: 10,
    boxShadow: "var(--shadow-sm)",
  },
  meta: { fontSize: 12.5, color: C.muted, marginBottom: 4 },
  empty: {
    padding: "32px 20px", textAlign: "center", fontSize: 14.5, color: C.muted,
    lineHeight: 1.6, background: C.surface, border: `1px dashed ${C.borderStrong}`,
    borderRadius: "var(--r-md)",
  },

  tabbar: {
    position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 620,
    margin: "0 auto", display: "flex", background: C.surface,
    borderTop: `1px solid ${C.border}`, boxShadow: "0 -2px 12px rgba(16,24,40,.05)",
  },
  tabBtn: (on) => ({
    flex: 1, padding: "12px 0 14px", border: "none", background: "none",
    fontSize: 12, fontWeight: 650, color: on ? C.ink : C.muted,
    borderTop: `2px solid ${on ? C.ink : "transparent"}`,
  }),

  footer: {
    padding: "24px 20px 10px", fontSize: 11.5, color: C.faint,
    lineHeight: 1.6, textAlign: "center",
  },

  bar: { display: "flex", alignItems: "center", gap: 10, marginBottom: 9 },
  barLabel: { width: 132, fontSize: 12.5, fontWeight: 550, color: C.text },
  barTrack: {
    flex: 1, height: 8, background: C.sunken,
    borderRadius: "var(--r-pill)", overflow: "hidden",
  },
  barN: { width: 44, fontSize: 12.5, fontWeight: 650, textAlign: "right", color: C.muted },
};

export const CHAPTERS = [
  "Real Numbers", "Polynomials", "Pair of Linear Equations", "Quadratic Equations",
  "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry",
  "Heights & Distances", "Circles", "Areas Related to Circles", "Surface Areas & Volumes",
  "Statistics", "Probability",
];

export const ERROR_TYPES = [
  "Sign error", "Transposition", "Calculation slip", "Formula wrong/omitted",
  "Concept gap", "Units / presentation", "Method mismatch",
];
