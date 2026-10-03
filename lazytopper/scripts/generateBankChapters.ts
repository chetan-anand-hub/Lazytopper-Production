/**
 * generateBankChapters — emits the per-chapter bank modules (BANK-SPLIT-1 PR-2, L2 + L3).
 *
 * Reads src/data/canonicalQuestionBank.ts (the aggregator stays the one source of truth),
 * loads every pack array it spreads, and writes src/data/bankChapters/<slug>.ts (26),
 * chapterRegistry.generated.ts and bankIdIndex.generated.ts. The text of every file comes
 * from scripts/bankChapters/renderBankChapters.ts, which the guard test also calls.
 *
 * REGENERATE WITH (from `lazytopper/`), after any pack or aggregator change:
 *
 *     pnpm run gen:bank-chapters            (writes)
 *     pnpm run gen:bank-chapters -- --check (exit 1 if any file would change)
 *
 * Before writing it proves the spread arrays concatenate to RAW_CANONICAL_QUESTION_BANK
 * row-for-row (same objects, same order), so a chapter can never hold a row the
 * aggregator does not. Tooling only: not imported by the app, never ships.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { CanonicalQuestion } from "../src/data/predictionTypes";
import {
  RAW_CANONICAL_QUESTION_BANK,
  WITHHELD_QUESTION_IDS,
  canonicalQuestionBank,
} from "../src/data/canonicalQuestionBank";
import { resolveCanonicalSlug } from "../src/data/syllabus/canonicalTopicSlug";
import { allDesktopTopics } from "../src/lib/desktop/topics";
import { parseAggregator, planChapters, renderAll } from "./bankChapters/renderBankChapters";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../src/data");
const OUT_DIR = join(DATA, "bankChapters");
/** Hand-written files in OUT_DIR the generator must never touch. */
const HAND_WRITTEN = new Set(["defineChapter.ts", "loader.ts", "bankIdIndex.ts", "useBankChapters.ts"]);

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const shape = parseAggregator(readFileSync(join(DATA, "canonicalQuestionBank.ts"), "utf8"));

  const modules = new Map<string, Record<string, unknown>>();
  const arrays = new Map<string, readonly CanonicalQuestion[]>();
  for (const name of shape.spreads) {
    const spec = shape.imports.get(name)!;
    let mod = modules.get(spec);
    if (!mod) {
      mod = (await import(pathToFileURL(join(DATA, `${spec}.ts`)).href)) as Record<string, unknown>;
      modules.set(spec, mod);
    }
    const arr = mod[name];
    if (!Array.isArray(arr)) throw new Error(`${spec} does not export an array named ${name}`);
    arrays.set(name, arr as CanonicalQuestion[]);
  }

  // The spread arrays must BE the aggregator, row for row.
  const concat = shape.spreads.flatMap((n) => arrays.get(n)!);
  if (concat.length !== RAW_CANONICAL_QUESTION_BANK.length) {
    throw new Error(`spreads give ${concat.length} rows, RAW has ${RAW_CANONICAL_QUESTION_BANK.length}`);
  }
  concat.forEach((q, i) => {
    if (q !== RAW_CANONICAL_QUESTION_BANK[i]) throw new Error(`row ${i} (${q.id}) differs from RAW[${i}]`);
  });

  const chapters = allDesktopTopics().map((t) => ({ slug: t.slug, subject: t.subject as "Maths" | "Science" }));
  const plans = planChapters(shape, arrays, WITHHELD_QUESTION_IDS, chapters, resolveCanonicalSlug);
  const files = renderAll(plans, canonicalQuestionBank);

  const stale: string[] = [];
  for (const [rel, text] of files) {
    const path = join(OUT_DIR, rel);
    const current = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (current === text) continue;
    stale.push(rel);
    if (!check) writeFileSync(path, text);
  }
  const extra = existsSync(OUT_DIR)
    ? readdirSync(OUT_DIR).filter(
        (f) => f.endsWith(".ts") && !f.includes(".test.") && !files.has(f) && !HAND_WRITTEN.has(f),
      )
    : [];
  const served = plans.reduce((n, p) => n + p.servedRows, 0);
  console.log(
    `bank chapters: ${plans.length} chapters, ${served} served rows (aggregator ${canonicalQuestionBank.length}), ` +
      `${files.size} files, ${stale.length} ${check ? "stale" : "written"}${extra.length ? `, UNEXPECTED: ${extra.join(", ")}` : ""}`,
  );
  if (served !== canonicalQuestionBank.length) throw new Error("chapter rows do not add up to the served bank");
  if (check && (stale.length || extra.length)) {
    console.error(`stale: ${stale.join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
