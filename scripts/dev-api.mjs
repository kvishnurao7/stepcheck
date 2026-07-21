// Minimal local stand-in for Vercel's serverless runtime.
// Serves api/*.js handlers at http://localhost:3000/api/* so `vite dev`
// (whose proxy already points /api → :3000) works without the Vercel CLI.
// Usage: node scripts/dev-api.mjs   (reads .env from the project root)

import http from "node:http";
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// On some Windows networks IPv6 to api.anthropic.com blackholes while IPv4
// works — Node's fetch then hangs and fails where curl succeeds.
dns.setDefaultResultOrder("ipv4first");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load .env (no dependency on dotenv).
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
    }
  }
} else {
  console.warn("⚠ No .env file found — copy .env.example to .env and fill it in.");
}

// Vercel-style res helpers on top of the Node response.
function wrapRes(res) {
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (obj) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  wrapRes(res);
  const name = (req.url || "").split("?")[0].replace(/^\/api\//, "");
  const file = path.join(root, "api", `${name}.js`);
  if (name.startsWith("_") || !/^[\w-]+$/.test(name) || !fs.existsSync(file)) {
    return res.status(404).json({ error: "not_found" });
  }

  // Collect and parse the JSON body (photos arrive base64-encoded, allow up to 25 MB).
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 25 * 1024 * 1024) return res.status(413).json({ error: "payload_too_large" });
    chunks.push(chunk);
  }
  try {
    const raw = Buffer.concat(chunks).toString("utf8");
    req.body = raw ? JSON.parse(raw) : {};
  } catch {
    return res.status(400).json({ error: "invalid_json" });
  }

  try {
    const mod = await import(pathToFileURL(file).href);
    await mod.default(req, res);
  } catch (e) {
    console.error(`[api/${name}]`, e);
    if (!res.writableEnded) res.status(500).json({ error: String(e.message || e) });
  }
});

server.listen(3000, () => {
  console.log("StepCheck local API running at http://localhost:3000/api/*");
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? "set" : "MISSING"}`);
});
