import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev`, proxy /api to `vercel dev` (port 3000) if you run it,
// otherwise the app talks to deployed functions in production automatically.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
