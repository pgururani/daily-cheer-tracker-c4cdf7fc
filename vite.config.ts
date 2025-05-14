
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Connect, ViteDevServer } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: true,
    // Configure middlewares to handle CSP in development
    middlewares: [
      function(req: Connect.IncomingMessage, res: any, next: Connect.NextFunction) {
        res.setHeader("Content-Security-Policy", 
          "script-src 'self' https://cdn.gpteng.co 'unsafe-inline' 'unsafe-eval'");
        next();
      }
    ]
  },
  preview: {
    port: 5173,
    open: true,
    // Add CSP header for preview mode too
    middlewares: [
      function(req: Connect.IncomingMessage, res: any, next: Connect.NextFunction) {
        res.setHeader("Content-Security-Policy", 
          "script-src 'self' https://cdn.gpteng.co 'unsafe-inline' 'unsafe-eval'");
        next();
      }
    ]
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
