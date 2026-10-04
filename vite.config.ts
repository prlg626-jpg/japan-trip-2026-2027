import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const version = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

export default defineConfig({
  plugins: [react(), {
    name: "versioned-offline-shell",
    writeBundle(options) {
      const out = options.dir || "dist";
      const swPath = path.join(out, "sw.js");
      fs.writeFileSync(swPath, fs.readFileSync(swPath, "utf8").replaceAll("__BUILD_VERSION__", version));
      fs.writeFileSync(path.join(out, "version.json"), JSON.stringify({ commit: version, recovery: { activities: 124, included: 121, zonePlaces: 93, selected: 80 } }));
    },
  }],
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          maps: ["leaflet"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
});
