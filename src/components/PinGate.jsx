import { useState } from "react";
import { S, C } from "../lib/styles.js";
import { setPin } from "../lib/storage.js";
import { api } from "../lib/api.js";

// One-time gate. On success the PIN is stored on the device and this never shows again
// (unless the server later rejects it, in which case App clears it and shows this again).
export default function PinGate({ onUnlocked, message }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(message || "");

  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true); setErr("");
    // Validate by making the cheapest real call the server has (a tiny variant request).
    setPin(value.trim());
    try {
      await api.variant({ entry: { chapter: "Real Numbers", concept: "test", note: "test", question: "" } });
      onUnlocked();
    } catch (e) {
      setErr(String(e.message).includes("PIN") ? "That PIN didn't work. Try again." : "Couldn't verify — check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div style={{ ...S.logo, fontSize: 30, textAlign: "center" }}>
          Step<span style={{ color: C.red }}>Check</span>
        </div>
        <div style={{ ...S.tagline, textAlign: "center", marginBottom: 24 }}>Checks your steps. Never gives the answer.</div>
        <label style={S.label}>Enter family PIN</label>
        <input
          type="password" inputMode="numeric" value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ ...S.textarea, textAlign: "center", fontSize: 22, letterSpacing: 4 }}
          placeholder="••••" autoFocus
        />
        {err && <div style={S.errorBox}>{err}</div>}
        <button onClick={submit} disabled={busy} style={{ ...S.primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Checking…" : "Unlock"}
        </button>
        <div style={{ ...S.footer, marginTop: 18 }}>You'll only enter this once on this device.</div>
      </div>
    </div>
  );
}
