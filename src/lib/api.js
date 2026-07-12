// Thin client for the serverless functions. The PIN is attached to every call.
import { getPin, clearPin } from "./storage.js";

async function post(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, pin: getPin() }),
  });
  if (res.status === 401) {
    clearPin();
    throw new Error("PIN rejected. Please re-enter the family PIN.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || "Request failed.");
  return data;
}

export const api = {
  check: (b) => post("check", b),
  explain: (b) => post("explain", b),
  variant: (b) => post("variant", b),
  parsePaper: (b) => post("parse-paper", b),
  markAnswer: (b) => post("mark-answer", b),
};
