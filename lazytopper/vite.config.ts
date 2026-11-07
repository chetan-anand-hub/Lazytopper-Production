import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = parseInt(process.env.PORT || "25246", 10);
const apiServerPort = parseInt(process.env.API_SERVER_PORT || "8080", 10);
const isProduction = process.env.NODE_ENV === "production";

// SPEED-CHUNKS-1: the eager vendor packages (see build.rollupOptions.output.manualChunks).
// Anchored on the LAST `node_modules/<pkg>/` segment so pnpm's `.pnpm/<pkg>@x/node_modules/<pkg>/` matches.
const VENDOR_REACT = /[\\/]node_modules[\\/](?:react|react-dom|scheduler|react-router|react-router-dom)[\\/]/;
// Firebase App + Auth only. firebase/firestore, @firebase/firestore, @firebase/app-check and
// @firebase/webchannel-wrapper are LAZY and must never match (PERF-3).
const VENDOR_FIREBASE =
  /[\\/]node_modules[\\/](?:@firebase[\\/](?:app|auth|util|component|logger)|firebase[\\/](?:app|auth)|idb)[\\/]/;

export default defineConfig({
  // ROOT-URL-1 (M1): the app is served at the domain root. Old `/app/...` URLs are
  // permanent redirects in vercel.json. The production outDir IS the Vercel project's
  // Output Directory (`artifacts/lazytopper-app/dist/public`), so `index.html` and
  // `assets/` land at the served root.
  base: "/",
  plugins: [react()],
  build: {
    outDir: isProduction
      ? path.resolve(__dirname, "../artifacts/lazytopper-app/dist/public")
      : "dist",
    emptyOutDir: true,
    // SPEED-ISLANDS-1 (owner ruling 7 Nov 2026, speed only): a SECOND entry, the no-React island that
    // scripts/seo/applyPrerendered.ts serves on content pages instead of the app entry. It imports
    // nothing from the app, so the app's own entry chunk is unchanged. `index` is the app, under the
    // name it always had (index-<hash>.js / .css: the build steps and guards key on that name).
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        contentIsland: path.resolve(__dirname, "src/islands/contentIsland.ts"),
      },
      output: {
        // SPEED-CHUNKS-1 (owner ruling 7 Nov 2026, speed only): split the two stable vendor groups
        // out of the entry into their own long-cached files. Every module named here is ALREADY in
        // the entry's static closure (it was inside index-*.js), so first load fetches the same
        // code, just as three parallel files; a deploy that changes only app code no longer
        // invalidates ~119 KB gz of React + Firebase Auth in returning visitors' caches.
        // ⚠ Never add a package that is lazy-only today (firestore, app-check, katex, pdf, …): a
        // manual chunk the entry imports drags EVERY module in it into first load. Firestore must
        // stay out of the eager set (PERF-3, perf3_entry_chunk_acceptance.mjs).
        manualChunks(id: string): string | undefined {
          if (id === "\0commonjsHelpers.js") return "vendor-react"; // react's CJS interop helper; keeps vendor-react free of an import back into the entry
          if (VENDOR_REACT.test(id)) return "vendor-react";
          if (VENDOR_FIREBASE.test(id)) return "vendor-firebase";
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${apiServerPort}`,
        changeOrigin: true,
      },
      "/shared-api": {
        target: `http://localhost:${apiServerPort}`,
        changeOrigin: true,
      },
    },
  },
});
