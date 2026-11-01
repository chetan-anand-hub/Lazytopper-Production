// TUTOR-KEYS-1 - append " Answer: (X)" (X = the key letter) to the LAST solution step of every served MCQ / assertion-
// reason row whose steps do not yet name any option, so server/services/keyTrust.cjs can cross-check the key.
//   pnpm exec tsx scripts/ops/tutor_keys_1.apply.ts          -> dry run: counts + the list of real key/steps disagreements
//   pnpm exec tsx scripts/ops/tutor_keys_1.apply.ts --write  -> edit the bank files in place
// Idempotent: a row whose steps already name an option is never touched, so a second run changes nothing.
// Never changes a key, an option or any other text. Rows whose steps already name a DIFFERENT option than the key
// are listed, never edited.
import fs from "node:fs";
import path from "node:path";
import { analyse } from "./tutor_keys_1.entry";
import { locateRows } from "./tutor_keys_1.locate";

const write = process.argv.includes("--write");
const root = path.resolve(import.meta.dirname, "..", "..");
const dataDir = path.join(root, "src", "data");

const verdicts = analyse();
const need = new Map<string, { letter: string; lastStep: string; steps: string[] }>();
for (const v of verdicts) if (v.status === "needs-suffix") need.set(v.id, { letter: v.letter, lastStep: v.lastStep, steps: v.steps });

const files: string[] = [];
(function walk(d: string) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) && !/generated/.test(e.name)) files.push(p);
  }
})(dataDir);

const sites = new Map<string, { file: string; insertAt: number; rawLast: string; via: "steps" | "working" }[]>();
const srcByFile = new Map<string, string>();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (!/solutionSteps/.test(src)) continue;
  srcByFile.set(f, src);
  for (const [id, list] of locateRows(src)) {
    if (!need.has(id)) continue;
    for (const s of list) {
      const a = sites.get(id) ?? [];
      a.push({ file: f, insertAt: s.insertAt, rawLast: s.rawLast, via: s.via });
      sites.set(id, a);
    }
  }
}

const norm = (t: string) => t.replace(/\[\[|\]\]/g, "").replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
const edits = new Map<string, { at: number; text: string; id: string }[]>();
const unlocated: string[] = [];
const ambiguous: string[] = [];
const mismatchLast: string[] = [];
let viaWorking = 0;
for (const [id, { letter, lastStep, steps }] of need) {
  const s = sites.get(id);
  if (!s || s.length === 0) { unlocated.push(id); continue; }
  if (s.length > 1) { ambiguous.push(id); continue; }
  // the literal we found must be the very last step the bank serves (guards against a same-id look-alike)
  const decoded = s[0].rawLast.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, " ").replace(/\\t/g, " ");
  if (s[0].via === "steps") {
    if (norm(decoded) !== norm(lastStep)) { mismatchLast.push(id); continue; }
  } else {
    // builder spec: the served steps are working[] + one generated "Final answer: ..." line. Append to the last
    // working[] line (it is a served step); it must be exactly the step just before the generated final line.
    const before = steps.length >= 2 ? steps[steps.length - 2] : "";
    const isLast = norm(decoded) === norm(lastStep);
    const isBeforeGenerated = norm(decoded) === norm(before) && /^(Final answer|Therefore)/i.test(lastStep);
    if (!isLast && !isBeforeGenerated) { mismatchLast.push(id); continue; }
    if (isBeforeGenerated) viaWorking += 1;
  }
  const a = edits.get(s[0].file) ?? [];
  a.push({ at: s[0].insertAt, text: ` Answer: (${letter})`, id });
  edits.set(s[0].file, a);
}

const disagree = verdicts.filter((v) => v.status === "disagree" || v.status === "no-option");
let rows = 0;
for (const [f, list] of edits) {
  let src = srcByFile.get(f)!;
  list.sort((x, y) => y.at - x.at);
  for (const e of list) { src = src.slice(0, e.at) + e.text + src.slice(e.at); rows += 1; }
  if (write) fs.writeFileSync(f, src);
}
const count = (s: string) => verdicts.filter((v) => v.status === s).length;
console.log(JSON.stringify({
  mode: write ? "write" : "dry-run",
  mcqRows: verdicts.length,
  alreadyVerifiable: count("verifiable"),
  realDisagreements: disagree.length,
  skipped: verdicts.filter((v) => v.status === "skip").map((v: any) => `${v.id} (${v.why})`),
  needSuffix: need.size,
  rowsEdited: rows,
  filesEdited: edits.size,
  unlocated: unlocated.length,
  ambiguous: ambiguous.length,
  mismatchLast: mismatchLast.length,
  viaWorkingSpecBeforeGeneratedFinalLine: viaWorking,
}, null, 1));
if (disagree.length) console.log("DISAGREEMENTS (not edited):\n" + disagree.map((v: any) => `${v.id}: ${v.reason ?? v.status}`).join("\n"));
if (unlocated.length) console.log("UNLOCATED (not edited): " + unlocated.join(", "));
if (ambiguous.length) console.log("AMBIGUOUS (not edited): " + ambiguous.join(", "));
if (mismatchLast.length) console.log("LAST-STEP MISMATCH (not edited): " + mismatchLast.join(", "));
