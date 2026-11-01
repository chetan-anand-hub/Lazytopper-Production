// TUTOR-KEYS-1 - analysis entry (bundled by tutor_keys_1.mjs). Reads the SERVED bank through the same builder +
// server normaliser the tutor uses, and classifies every objective row for keyTrust verifiability.
import { createRequire } from "node:module";
import { canonicalQuestionBank } from "../../src/data/canonicalQuestionBank";
import { buildAnchorQuestion } from "../../src/pages/tutor/tutorAnchorQuestion";
import { normaliseOption, optionsDifferOnlyByCase, normaliseOptionKeepCase } from "../../src/lib/objectiveScoring";

const require = createRequire(import.meta.url);
const { detectKeyMismatch } = require("../../server/services/keyTrust.cjs");
const { normalizeAnchorQuestion } = require("../../server/routes/tutor.cjs");

const STEP_CAP = 800;
const STEPS_CAP = 12;
const LETTERS = "ABCDEFGH";

export type Verdict =
  | { id: string; status: "verifiable" } // steps / final answer already name the key option
  | { id: string; status: "disagree"; reason: string } // steps name a DIFFERENT option than the key
  | { id: string; status: "no-option" } // key resolves to no option
  | { id: string; status: "skip"; why: string }
  | { id: string; status: "needs-suffix"; letter: string; lastStep: string; steps: string[] };

function namedOptions(a: unknown): "none" | "some" {
  // keyTrust only exports detectKeyMismatch. Probe it with two different keys: if the row names ANY option, at
  // least one probe differs from it (and names exactly the claimed letters in the reason).
  for (const probe of ["A", "B"]) {
    const r = detectKeyMismatch({ ...(a as object), answerLetter: probe });
    if (r && r.kind === "steps-differ") return "some";
  }
  return "none";
}

export function analyse(): Verdict[] {
  const out: Verdict[] = [];
  for (const row of canonicalQuestionBank) {
    const built = buildAnchorQuestion(row as never);
    if (!built || !built.options || built.options.length < 2) continue; // not an MCQ / AR row
    const id = built.id;
    const a = normalizeAnchorQuestion(built);
    if (!a) continue;
    const real = detectKeyMismatch(a);
    if (real && real.kind === "no-option") {
      out.push({ id, status: "no-option" });
      continue;
    }
    if (real) {
      out.push({ id, status: "disagree", reason: real.reason });
      continue;
    }
    if (!a.answerLetter) {
      out.push({ id, status: "skip", why: "no key letter" });
      continue;
    }
    if (namedOptions(a) === "some") {
      out.push({ id, status: "verifiable" });
      continue;
    }
    // The key letter must be UNAMBIGUOUS: every option distinct, and the bank's own key resolves to exactly one.
    const raw = (Array.isArray((row as any).options) ? (row as any).options : []).map((o: unknown) => String(o ?? "").trim()).filter(Boolean);
    const N = optionsDifferOnlyByCase(raw) ? normaliseOptionKeepCase : normaliseOption;
    const norm = raw.map((o: string) => N(o));
    if (new Set(norm).size !== norm.length) {
      out.push({ id, status: "skip", why: "duplicate option text" });
      continue;
    }
    const idx = LETTERS.indexOf(a.answerLetter);
    const key = String((row as any).correctOption ?? "").trim() || String((row as any).answer ?? "").trim();
    const keyN = N(key);
    const exactLetter = /^[a-h]$/.test(keyN.toLowerCase()) && keyN.toLowerCase().charCodeAt(0) - 97 === idx;
    const exactText = norm.filter((o: string) => o === keyN).length === 1 && norm[idx] === keyN;
    const viaAnswer = N(String((row as any).answer ?? "")) === norm[idx];
    if (!(exactLetter || exactText || viaAnswer)) {
      out.push({ id, status: "skip", why: "key letter only fuzzy-resolved" });
      continue;
    }
    const steps: string[] = Array.isArray((row as any).solutionSteps) ? (row as any).solutionSteps : [];
    const cleaned = steps.map((s) => String(s ?? "").trim()).filter(Boolean);
    if (cleaned.length === 0) {
      out.push({ id, status: "skip", why: "no solution steps" });
      continue;
    }
    if (cleaned.length > STEPS_CAP) {
      out.push({ id, status: "skip", why: "more than 12 steps (tail never reaches the tutor)" });
      continue;
    }
    const last = cleaned[cleaned.length - 1];
    if (last.replace(/\s+/g, " ").length + ` Answer: (${a.answerLetter})`.length > STEP_CAP) {
      out.push({ id, status: "skip", why: "last step too long for the tutor's 800-char cap" });
      continue;
    }
    out.push({ id, status: "needs-suffix", letter: a.answerLetter, lastStep: last, steps: cleaned });
  }
  return out;
}

/** After the suffix, does keyTrust see the key option named (and nothing else)? */
export function verifyAfter(steps: string[], base: unknown, letter: string): boolean {
  const a = normalizeAnchorQuestion({ ...(base as object), solutionSteps: steps });
  return !!a && detectKeyMismatch(a) === null && namedOptions(a) === "some";
}
