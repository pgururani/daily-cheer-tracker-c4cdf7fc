
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { readFileSync } from "fs";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        background: path.resolve(__dirname, "src/background.ts"),
        contentScript: path.resolve(__dirname, "src/contentScript.ts")
      },
      output: {
        entryFileNames: (assetInfo) => {
          return assetInfo.name === "background" || assetInfo.name === "contentScript"
            ? "[name].js"
            : "assets/[name]-[hash].js";
        }
      }
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true
  }
}));
