import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev`, proxy /api to `vercel dev` (port 3000) if you run it,
// otherwise the app talks to deployed functions in production automatically.
export default defineConfig({
  plugins: [react()],
  server: {
    // Honour an assigned PORT (e.g. from the preview harness); fall back to Vite's default.
    port: Number(process.env.PORT) || 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
