import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // GitHub Pages serves the app under /<repo>/, so the build sets VITE_BASE to
  // "/Avaition/"; Netlify/local keep "/". BASE_URL flows to the router basename.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173 },
});
