// @vitest-environment node
/**
 * SPEED-CHUNKS-1 (7 Nov 2026) — the vendor manualChunks in vite.config.ts.
 *
 * vendor-react / vendor-firebase are imported STATICALLY by the entry, so every module the function
 * puts in them loads on first paint. That is only safe for packages that were already eager. These
 * cases pin the two failure modes: a lazy-only package (Firestore, App Check, KaTeX, pdf.js …)
 * matching a vendor pattern and being dragged into first load, and a pnpm path layout change making
 * React or Firebase Auth silently fall back into the entry.
 *
 * The build-output half of the same guarantee is scripts/ops/perf3_entry_chunk_acceptance.mjs
 * (Firestore markers absent from the eager set), which runs as the last step of `pnpm run build`.
 */
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config";

type ManualChunks = (id: string) => string | undefined;

const output = viteConfig.build?.rollupOptions?.output;
const manualChunks = (Array.isArray(output) ? undefined : output?.manualChunks) as ManualChunks | undefined;

const pnpm = (pkg: string, file: string): string =>
  `/repo/node_modules/.pnpm/${pkg.replace("/", "+")}@1.0.0/node_modules/${pkg}/${file}`;

describe("vite.config.ts manualChunks (SPEED-CHUNKS-1)", () => {
  it("is a function", () => {
    expect(typeof manualChunks).toBe("function");
  });

  it.each([
    ["react", "index.js"],
    ["react-dom", "cjs/react-dom-client.production.js"],
    ["react-dom", "client.js"],
    ["scheduler", "index.js"],
    ["react-router", "dist/development/chunk-6KYCQHYJ.mjs"],
    ["react-router-dom", "dist/index.mjs"],
  ])("puts the eager React package %s (%s) in vendor-react", (pkg, file) => {
    expect(manualChunks?.(pnpm(pkg, file))).toBe("vendor-react");
  });

  it("puts rollup's CJS interop helper with React (so vendor-react never imports the entry)", () => {
    expect(manualChunks?.("\0commonjsHelpers.js")).toBe("vendor-react");
  });

  it.each([
    ["@firebase/app", "dist/esm/index.esm.js"],
    ["@firebase/auth", "dist/esm/index-4NFEPWkC.js"],
    ["@firebase/util", "dist/index.esm.js"],
    ["@firebase/component", "dist/esm/index.esm.js"],
    ["@firebase/logger", "dist/esm/index.esm.js"],
    ["firebase", "app/dist/esm/index.esm.js"],
    ["firebase", "auth/dist/esm/index.esm.js"],
    ["idb", "build/index.js"],
  ])("puts the eager Firebase package %s (%s) in vendor-firebase", (pkg, file) => {
    expect(manualChunks?.(pnpm(pkg, file))).toBe("vendor-firebase");
  });

  it.each([
    // PERF-3: Firestore must stay lazy.
    ["@firebase/firestore", "dist/index.esm.js"],
    ["firebase", "firestore/dist/esm/index.esm.js"],
    ["@firebase/webchannel-wrapper", "dist/bloom-blob/esm/bloom_blob_es2018.js"],
    ["@firebase/app-check", "dist/esm/index.esm.js"],
    ["firebase", "app-check/dist/esm/index.esm.js"],
    // Lazy-only libraries.
    ["katex", "dist/katex.mjs"],
    ["pdfjs-dist", "build/pdf.mjs"],
    ["jspdf", "dist/jspdf.es.min.js"],
    ["html2canvas", "dist/html2canvas.esm.js"],
    // Look-alike names must not match.
    ["react-markdown", "index.js"],
    ["react-is", "index.js"],
    ["idb-keyval", "dist/index.js"],
  ])("leaves the lazy / unrelated package %s (%s) to Rollup's default chunking", (pkg, file) => {
    expect(manualChunks?.(pnpm(pkg, file))).toBeUndefined();
  });

  it("leaves app source (including the question bank) to Rollup's default chunking", () => {
    expect(manualChunks?.("/repo/lazytopper/src/App.tsx")).toBeUndefined();
    expect(manualChunks?.("/repo/lazytopper/src/data/questionBank/real-numbers.ts")).toBeUndefined();
    expect(manualChunks?.("/repo/lazytopper/src/react/useThing.ts")).toBeUndefined();
  });
});
