// scripts/solutions/writeLlmsSolutions.ts
//
// SOLUTIONS-2 (owner 18 Oct 2026) — keep public/llms.txt's solutions lines DERIVED from the
// published set: one line per page in `solutionsPaths()` order, built by `solutionsLlmsLine`
// (src/config/solutionsPublishSafe.ts). The lines sit together where the Triangles pilot put them.
// `solutionsPilot.guard.test.tsx` fails when llms.txt and the derived lines disagree;
// `tsx scripts/solutions/writeLlmsSolutions.ts` rewrites them.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SITE_ORIGIN } from "../../src/config/canonicalUrl";
import { solutionsLlmsLines } from "../../src/config/solutionsPublishSafe";

const here = dirname(fileURLToPath(import.meta.url));
export const LLMS_FILE = resolve(here, "..", "..", "public", "llms.txt");

const SOLUTIONS_LINE = /^- \[[^\]]*\]\(https:\/\/www\.lazytopper\.com\/ncert-(?:solutions|exemplar)\//;

/** The solutions lines currently in an llms.txt text. */
export function llmsSolutionsLines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => SOLUTIONS_LINE.test(l));
}

/**
 * Replace the (contiguous) block of solutions lines with `lines`. THROWS when the existing lines
 * are not one contiguous block, or there are none (the anchor is where the pilot put them).
 */
export function rewriteLlms(text: string, lines: readonly string[]): string {
  const all = text.split(/\r?\n/);
  const idx = all.map((l, i) => (SOLUTIONS_LINE.test(l) ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) throw new Error("writeLlmsSolutions: no solutions line in llms.txt to anchor on");
  if (idx[idx.length - 1] - idx[0] + 1 !== idx.length) throw new Error("writeLlmsSolutions: solutions lines are not contiguous");
  const eol = text.includes("\r\n") ? "\r\n" : "\n"; // keep the file's own line endings
  return [...all.slice(0, idx[0]), ...lines, ...all.slice(idx[idx.length - 1] + 1)].join(eol);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = readFileSync(LLMS_FILE, "utf8");
  writeFileSync(LLMS_FILE, rewriteLlms(text, solutionsLlmsLines(SITE_ORIGIN)));
  console.log(`llms.txt: ${solutionsLlmsLines(SITE_ORIGIN).length} solutions lines written`);
}
