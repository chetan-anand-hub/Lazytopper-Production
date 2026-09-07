/**
 * symbol_font_decode.mjs — RECOVER-1 PHASE A.
 *
 * ★ WHY THIS FILE EXISTS.
 * 1,147 characters across 39 question-bank files sit in the Unicode private-use
 * area. They were never damage. They are ADOBE SYMBOL FONT GLYPH CODES that the
 * PDF extractor emitted as `0xF000 + <Symbol character code>` and nobody decoded.
 * `R = 35 Ω` was stored with the ohm sign written as U+F057. The information was
 * never lost; it was written in a font whose glyph codes nobody read.
 *
 * ⚠ THIS SURVIVED EVERY GATE FOR MONTHS, and the reason is worth keeping in the
 * file it fixes: `scripts/ops/mojibake_acceptance.mjs` matches U+FFFD and a set of
 * UTF-8 lead bytes. It has NO PRIVATE-USE RANGE AT ALL. A green `check:mojibake`
 * is not evidence about this defect in either direction.
 *
 * ★ WHAT THIS SCRIPT WILL NOT DO, AND WHY EACH LINE IS A REFUSAL.
 *
 *   1. IT DOES NOT RE-EXTRACT FROM A PDF. The mandated extractor produced this
 *      output; running it again reproduces it. Decode the font, not the page.
 *
 *   2. IT DOES NOT INVENT A CHARACTER. Every entry in SYMBOL below is cited to the
 *      published Adobe Symbol Set Encoding. A codepoint that cannot be cited gets
 *      NO mapping and its ROW IS LEFT ENTIRELY ALONE — see UNCITED. A wrong symbol
 *      in a chemical equation reads as authoritative, which is worse than leaving
 *      the row broken.
 *
 *   3. IT DOES NOT RECONSTRUCT. Decoding exposes second defects the glyph codes
 *      were hiding — flattened superscripts (`2 x 10 4 m` for `2 x 10^-4 m`),
 *      fractions collapsed to adjacent numbers (`1 1 + alpha beta` for
 *      `1/alpha + 1/beta`). Those are Phase B. This phase decodes.
 *
 *   4. IT DOES NOT TOUCH `WITHHELD_QUESTION_IDS`. Withheld rows ARE repaired here
 *      — they are filtered at assembly, so repairing one moves no pinned count,
 *      which is exactly what makes this safe to run beside another lane. Removing
 *      an id from that set is a separate PR after the owner has seen the repairs.
 *
 * ★ THE BRACKET PIECES — the trap this script exists to not fall into.
 * Symbol codes 0xE6-0xEB and 0xF6-0xFB (stored U+F0E6-U+F0FB), and the whole of
 * Symbol's own private block U+F8E5-U+F8FE, are NOT CHARACTERS. They are the top,
 * extender and bottom PIECES of one large bracket, stacked vertically on the page.
 * Three of them spell a single `(`.
 *
 * ⚠ AND THEY CANNOT BE COLLAPSED BACK INTO ONE. Measured over this bank, EVERY
 * bracket run interleaves left and right pieces, and the run sits AFTER the
 * expression it enclosed: `polynomials.pyq.ts` stores `1 1 + a b` then
 * `F8EB F8F6 F8EC F8F7 F8ED F8F8`. Emitting `(` and `)` there yields
 * `1 1 + a b ( )`. Recovering `(1/a + 1/b)` is INFERENCE, NOT DECODING.
 * ⇒ The pieces are REMOVED and the row is FLAGGED FOR OWNER REVIEW.
 *
 * ⚠ A LANE THAT TOOK THE FIRST RANGE AS "PLAIN LATIN-1" WOULD HAVE WRITTEN
 * `ae ce eg` INTO THE BANK. 0xE6/0xE7/0xE8 are parenlefttp/ex/bt in Symbol and
 * ae/ccedilla/egrave in Latin-1. Same bytes, different font, silent corruption.
 *
 * USAGE
 *   node scripts/ops/symbol_font_decode.mjs            # census + review table, no writes
 *   node scripts/ops/symbol_font_decode.mjs --apply    # rewrite the files
 *   node scripts/ops/symbol_font_decode.mjs --check    # exit 1 if a CITABLE code remains
 */

import fs from "fs";
import path from "path";

const BS = String.fromCharCode(92);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

const ROOT = "src/data/questionBanks";
const PUA_LO = 0xe000;
const PUA_HI = 0xf8ff;

/**
 * THE DECODE TABLE. Key = Symbol character code (stored codepoint minus 0xF000).
 * Value = [Adobe glyph name, Unicode codepoint].
 *
 * CITATION: Adobe Symbol Set Encoding Vector — PostScript Language Reference
 * Manual, 3rd edition, Appendix E ("Symbol Set Encoding Vector"); identical to
 * Adobe's published `symbol.txt` Unicode mapping distributed with the Adobe Glyph
 * List. The glyph NAME is what is published; the Unicode value is that glyph's
 * standard equivalent.
 *
 * ⚠ Every entry here was also read back in a real bank line before being trusted.
 * `similar` (0x7E) and `congruent` (0x40) are two DIFFERENT Symbol codes and stay
 * two different characters: a similarity claim written as a congruence claim is a
 * mathematical error, not a typo, and a one-symbol guess would have merged them.
 */
const SYMBOL = new Map([
  [0x20, ["space", 0x0020]],
  [0x2b, ["plus", 0x002b]],
  [0x2d, ["minus", 0x2212]],
  [0x2e, ["period", 0x002e]],
  [0x30, ["zero", 0x0030]],
  [0x31, ["one", 0x0031]],
  [0x32, ["two", 0x0032]],
  [0x33, ["three", 0x0033]],
  [0x35, ["five", 0x0035]],
  [0x36, ["six", 0x0036]],
  [0x3f, ["question", 0x003f]],
  [0x40, ["congruent", 0x2245]],
  [0x44, ["Delta", 0x0394]],
  [0x57, ["Omega", 0x03a9]],
  [0x5c, ["therefore", 0x2234]],
  [0x61, ["alpha", 0x03b1]],
  [0x6e, ["nu", 0x03bd]],
  [0x6f, ["omicron", 0x03bf]],
  [0x70, ["pi", 0x03c0]],
  [0x71, ["theta", 0x03b8]],
  [0x72, ["rho", 0x03c1]],
  [0x7e, ["similar", 0x223c]],
  [0xa2, ["minute", 0x2032]],
  [0xac, ["arrowleft", 0x2190]],
  [0xae, ["arrowright", 0x2192]],
  [0xaf, ["arrowdown", 0x2193]],
  [0xb0, ["degree", 0x00b0]],
  [0xb4, ["multiply", 0x00d7]],
  [0xb7, ["bullet", 0x2022]],
  [0xb9, ["notequal", 0x2260]],
  [0xbe, ["arrowhorizex", 0x23af]],
  [0xd0, ["angle", 0x2220]],
  [0xd7, ["dotmath", 0x22c5]],
  [0xde, ["arrowdblright", 0x21d2]],
]);

/** Multi-part bracket / integral extension pieces. REMOVED, never decoded. */
const isBracketPiece = (cp) =>
  (cp >= 0xf0e6 && cp <= 0xf0fe) || (cp >= 0xf8e5 && cp <= 0xf8fe);

/**
 * UNCITED. Symbol code 0x9F is UNASSIGNED in the Adobe Symbol Set Encoding — the
 * 0x80-0xA0 span is undefined. It reads unmistakably as a list bullet in context
 * ("(iii) <?> Alkanes ; <?> CnH2n+2"), and that is precisely why it is dangerous:
 * a plausible reading is still a guess. A ROW CONTAINING IT IS NOT TOUCHED AT ALL,
 * because a partially repaired row hides the fact that a decision is outstanding.
 */
const isUncited = (cp) => cp === 0xf09f;

const isPua = (cp) => cp >= PUA_LO && cp <= PUA_HI;

function norm(p) {
  return p.split(BS).join("/");
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = norm(path.join(dir, entry.name));
    if (entry.isDirectory()) walk(p, acc);
    else if (p.endsWith(".ts")) acc.push(p);
  }
  return acc;
}

/** Render a string with private-use codepoints escaped, so a report is readable. */
function show(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    out += isPua(cp) ? "<U+" + cp.toString(16).toUpperCase().padStart(4, "0") + ">" : ch;
  }
  return out;
}

/**
 * Extract the question id declared on a line, or null.
 * ⚠ Deliberately NOT a regex. This file is authored through tooling that has been
 * observed to decode escape sequences in transit; an index scan cannot be mangled
 * that way, and it is what the census and the rewrite must agree on exactly.
 */
function idOnLine(line) {
  const k = line.indexOf("id:");
  if (k < 0) return null;
  let i = k + 3;
  while (i < line.length && line[i] === " ") i++;
  if (line[i] !== '"') return null;
  const end = line.indexOf('"', i + 1);
  if (end < 0) return null;
  return line.slice(i + 1, end);
}

/**
 * Decode one line. Returns { text, decoded, removed, blocked }.
 *  - `decoded` counts citable codepoints replaced
 *  - `removed` counts bracket pieces deleted
 *  - `blocked` lists codepoints with no treatment (uncited, or unknown)
 */
function decodeLine(line) {
  const chars = [...line];
  const out = [];
  let decoded = 0;
  let removed = 0;
  const blocked = new Set();
  let i = 0;

  while (i < chars.length) {
    const cp = chars[i].codePointAt(0);

    if (isBracketPiece(cp)) {
      // Consume the maximal run of pieces, allowing single spaces BETWEEN pieces.
      let j = i;
      let n = 0;
      while (j < chars.length) {
        const c = chars[j].codePointAt(0);
        if (isBracketPiece(c)) {
          n++;
          j++;
        } else if (
          chars[j] === " " &&
          j + 1 < chars.length &&
          isBracketPiece(chars[j + 1].codePointAt(0))
        ) {
          j++;
        } else break;
      }
      removed += n;
      // Leave exactly one separator where the run had text on both sides, and none
      // where a space already sits on either side. Never collapse leading indent.
      const prev = out.length ? out[out.length - 1] : "";
      const next = j < chars.length ? chars[j] : "";
      if (prev !== "" && prev !== " " && next !== "" && next !== " ") out.push(" ");
      i = j;
      continue;
    }

    if (!isPua(cp)) {
      out.push(chars[i]);
      i++;
      continue;
    }

    if (isUncited(cp)) {
      blocked.add(cp);
      out.push(chars[i]);
      i++;
      continue;
    }

    const entry = cp >= 0xf020 && cp <= 0xf0ff ? SYMBOL.get(cp - 0xf000) : undefined;
    if (entry) {
      out.push(String.fromCodePoint(entry[1]));
      decoded++;
    } else {
      blocked.add(cp);
      out.push(chars[i]);
    }
    i++;
  }

  return { text: out.join(""), decoded, removed, blocked };
}

// ---------------------------------------------------------------------------

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");

const here = norm(process.cwd());
const root = here.endsWith("/lazytopper") ? ROOT : "lazytopper/" + ROOT;
if (!fs.existsSync(root)) {
  console.error("symbol-decode: cannot find " + root + " from " + here);
  process.exit(2);
}

const files = walk(root).sort();
const review = [];        // rows carrying bracket pieces  -> owner review
const untouched = [];     // rows blocked by an uncited codepoint -> owner ruling
const changedRows = [];
let filesChanged = 0;
let totalDecoded = 0;
let totalRemoved = 0;
let citableRemaining = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const lines = original.split(LF);

  // PASS 1 — which rows carry a codepoint with no treatment? Those rows are
  // reported and left byte-for-byte alone. A row is the unit, not a line: a
  // partially repaired row hides that a decision is still outstanding.
  const blockedRows = new Set();
  let cur = null;
  for (const raw of lines) {
    const id = idOnLine(raw);
    if (id) cur = id;
    for (const ch of raw) {
      const cp = ch.codePointAt(0);
      if (isPua(cp) && !isBracketPiece(cp)) {
        const known = cp >= 0xf020 && cp <= 0xf0ff && SYMBOL.has(cp - 0xf000);
        if (!known && cur) blockedRows.add(cur);
      }
    }
  }

  // PASS 2 — rewrite.
  cur = null;
  let fileDirty = false;
  const outLines = lines.map((raw) => {
    const id = idOnLine(raw);
    if (id) cur = id;
    if (cur && blockedRows.has(cur)) return raw;

    const eol = raw.endsWith(CR) ? CR : "";
    const body = eol ? raw.slice(0, -1) : raw;
    const r = decodeLine(body);
    if (r.decoded === 0 && r.removed === 0) return raw;

    fileDirty = true;
    totalDecoded += r.decoded;
    totalRemoved += r.removed;
    changedRows.push({ file, id: cur, before: show(body).trim(), after: show(r.text).trim() });
    if (r.removed > 0 && cur && !review.includes(cur)) review.push(cur);
    return r.text + eol;
  });

  for (const id of blockedRows) if (!untouched.includes(id)) untouched.push(id);

  if (fileDirty) {
    filesChanged++;
    if (APPLY) fs.writeFileSync(file, outLines.join(LF), "utf8");
  }

  // ★ THE POST-CONDITION, MEASURED ON DISK — NOT ON THIS RUN'S OUTPUT.
  //
  // ⚠ The obvious version of this loop reads `outLines`, and it is a SILENT NO-OP:
  // `outLines` is the decoded text, so it reports zero in a dry run whether or not
  // anything was ever written. A check that cannot fail is not a check. This reads
  // the bytes currently on disk, restricted to the rows this script is willing to
  // rewrite — so it is NON-ZERO before `--apply` and ZERO after, which is the only
  // shape that can be mutation-proven.
  const onDisk = fs.readFileSync(file, "utf8").split(LF);
  let row = null;
  for (const raw of onDisk) {
    const id = idOnLine(raw);
    if (id) row = id;
    if (row && blockedRows.has(row)) continue;
    for (const ch of raw) {
      const cp = ch.codePointAt(0);
      if (isPua(cp) && cp >= 0xf020 && cp <= 0xf0ff && SYMBOL.has(cp - 0xf000)) citableRemaining++;
    }
  }
}

console.log("symbol-decode: " + (APPLY ? "APPLIED" : CHECK ? "CHECK" : "DRY RUN"));
console.log("  files scanned      : " + files.length);
console.log("  files changed      : " + filesChanged);
console.log("  rows changed       : " + new Set(changedRows.map((r) => r.id)).size);
console.log("  codepoints decoded : " + totalDecoded);
console.log("  bracket pieces cut : " + totalRemoved);
console.log("  rows -> OWNER REVIEW (bracket pieces removed): " + review.length);
if (review.length) console.log("    " + review.join(" "));
console.log("  rows LEFT UNTOUCHED (uncited codepoint)     : " + untouched.length);
if (untouched.length) console.log("    " + untouched.join(" "));
console.log("  citable codepoints still present after run  : " + citableRemaining);

/**
 * ★ THE REVIEW TABLE IS PART OF THE TOOL, NOT A SIDE ARTEFACT.
 * The owner is the content authority and every repaired row needs his eye. Emitting
 * it from the SAME pass that rewrites the files is the point: a table generated by a
 * second, parallel implementation would be evidence about that implementation.
 */
if (process.argv.includes("--table")) {
  const byChapter = new Map();
  for (const r of changedRows) {
    const chapter = r.file.split("/").slice(-2).join("/");
    if (!byChapter.has(chapter)) byChapter.set(chapter, []);
    byChapter.get(chapter).push(r);
  }
  for (const chapter of [...byChapter.keys()].sort()) {
    console.log("");
    console.log("## " + chapter);
    let last = null;
    for (const r of byChapter.get(chapter)) {
      if (r.id !== last) {
        console.log("");
        console.log("### " + r.id + (review.includes(r.id) ? "   [BRACKET PIECES REMOVED — OWNER REVIEW]" : ""));
        last = r.id;
      }
      console.log("- BEFORE: " + r.before);
      console.log("- AFTER : " + r.after);
    }
  }
}

if (CHECK && citableRemaining > 0) {
  console.error("symbol-decode: FAIL — " + citableRemaining + " citable Symbol codepoints remain.");
  process.exit(1);
}
process.exit(0);
