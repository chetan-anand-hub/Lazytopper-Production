/**
 * rendererVersion - a hash of everything that decides how a template LOOKS, other than the questions themselves: the exporter and the
 * print documents, the figures, the brand images, the pinned fonts, this folder's harness, and the PDF libraries' versions. Any change
 * moves it, which changes every file hash, which regenerates every template (the questions' own changes only move their own files).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const DIRS = ["src/components/worksheet", "src/components/question", "src/diagrams", "public/brand", "public/fonts", "public/visuals", "scripts/packTemplates/fonts"];
const FILES = [
  "src/styles.css",
  "src/config/brandMark.ts",
  "src/lib/mistakeDisplay.ts",
  "src/lib/figureSafe.ts",
  "src/lib/packs/packTemplateFonts.ts",
  "src/lib/packs/packTemplateCore.ts",
  "src/lib/packs/buildPackFiles.ts",
  "src/lib/packs/packBridge.ts",
  "src/lib/packs/packLabels.ts",
  "src/lib/packs/packTemplatePlan.ts",
  "scripts/packTemplates/genEntry.ts",
  "scripts/packTemplates/gen.html",
];
/** Bump to force a full regeneration without touching a renderer file. */
export const RENDERER_EPOCH = 1;

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (!/\.test\.(ts|tsx)$/.test(name) && !name.endsWith(".golden.json")) out.push(p);
  }
}

export function rendererVersion(root: string): string {
  const h = createHash("sha256");
  h.update(`epoch:${RENDERER_EPOCH}\n`);
  // the RESOLVED versions (a lockfile bump moves them), not the package.json specifiers
  for (const d of ["html2canvas", "jspdf", "katex", "react", "react-dom"]) {
    const installed = path.join(root, "node_modules", d, "package.json");
    const version = fs.existsSync(installed) ? (JSON.parse(fs.readFileSync(installed, "utf8")) as { version?: string }).version : undefined;
    h.update(`${d}@${version ?? "?"}\n`);
  }
  const files: string[] = [];
  for (const d of DIRS) walk(path.join(root, d), files);
  for (const f of FILES) files.push(path.join(root, f));
  for (const f of files.sort()) {
    h.update(`${path.relative(root, f).split(path.sep).join("/")}\n`);
    h.update(fs.readFileSync(f));
  }
  return h.digest("hex");
}
