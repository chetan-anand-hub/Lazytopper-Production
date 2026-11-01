// TUTOR-KEYS-1 one-off: remove " Answer: (X)" again from rows whose content is hash-pinned by a SOLUTIONS ledger.
//   pnpm exec tsx scripts/ops/tutor_keys_1.revert_pinned.ts <ids.json> [--write]
import fs from "node:fs";
import path from "node:path";
import { locateRows } from "./tutor_keys_1.locate";

const ids = new Set<string>(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
const write = process.argv.includes("--write");
const SUFFIX = /\s?Answer: \([A-H]\)$/;
let n = 0;
(function walk(d: string) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.ts$/.test(e.name) || /\.test\.ts$/.test(e.name) || /generated/.test(e.name)) continue;
    let src = fs.readFileSync(p, "utf8");
    if (!/Answer: \(/.test(src)) continue;
    const edits: { start: number; end: number }[] = [];
    for (const [id, list] of locateRows(src)) {
      if (!ids.has(id)) continue;
      for (const s of list) {
        const m = SUFFIX.exec(s.rawLast);
        if (m) edits.push({ start: s.insertAt - (s.rawLast.length - m.index), end: s.insertAt });
      }
    }
    edits.sort((a, b) => b.start - a.start);
    for (const e of edits) { src = src.slice(0, e.start) + src.slice(e.end); n += 1; }
    if (edits.length && write) fs.writeFileSync(p, src);
  }
})(path.resolve(import.meta.dirname, "..", "..", "src", "data"));
console.log(write ? "reverted" : "would revert", n);
