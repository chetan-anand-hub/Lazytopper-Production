// src/components/worksheet/worksheetNaming.ts
//
// BANK-LEAN-1 (C1) — the worksheet NAMING helpers, moved verbatim out of
// worksheetModel.ts so a module that only NAMES a worksheet does not pull in the
// question bank. worksheetModel imports the bank-backed generator
// (predictionDataService → predictionCore → canonicalQuestionBank); sessionRecords
// only ever needed these two pure functions from it, and that one import put the
// ~8.6 MB bank chunk on every page that reads a session record (signed-in Home,
// Check & Improve, Topic Hub).
//
// ★ KEEP THIS MODULE BANK-FREE. It imports nothing. `bankReach.guard.test.ts`
// (src/config) walks the static import graph of the non-question pages and goes red,
// naming the chain, if any of them reaches canonicalQuestionBank.ts again.
// worksheetModel re-exports everything here, so existing importers are unchanged.

// ── PR-A: worksheet nomenclature (code + friendly name) ──────────────────────
// Display-only naming for the grade redesign — shown on the scorecard, the
// on-screen graded sheet, and the PDF. Code: `WS-{S}-{TOPIC}-{NN}` (e.g.
// `WS-M-RN-03` = Worksheet · Maths · Real Numbers · #3); friendly:
// `Real Numbers · Worksheet 3`. Topic abbreviations reuse the extraction-ID set;
// MIX = multi-topic, FULL = full-subject. PR-A uses the DEVICE-LOCAL count (the
// store list is passed in, so this stays a pure, testable function); PR-B makes
// the sequence durable + cross-device.

const TOPIC_ABBR: Record<string, string> = {
  "real-numbers": "RN",
  polynomials: "PO",
  "pair-of-linear-equations": "LE",
  "quadratic-equations": "QE",
  "arithmetic-progression": "AP",
  triangles: "TRI",
  "coordinate-geometry": "CG",
  circles: "CI",
  "areas-related-to-circles": "AC",
  "surface-areas-and-volumes": "SV",
  trigonometry: "TR",
  statistics: "ST",
  probability: "PR",
  "chemical-reactions-equations": "CRE",
  "acids-bases-salts": "ABS",
  "metals-non-metals": "MNM",
  "carbon-and-its-compounds": "CC",
  "life-processes": "LP",
  "control-and-coordination": "CAC",
  reproduction: "REP",
  light: "LRR",
  electricity: "ELE",
  "our-environment": "OE",
};

/** Topic → short code (extraction-ID set). Falls back to derived initials so a
 *  new/unmapped topic never breaks the code. */
export function topicAbbr(key: string): string {
  const k = String(key || "").trim().toLowerCase();
  if (TOPIC_ABBR[k]) return TOPIC_ABBR[k];
  const derived = k
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return derived || "WS";
}

/** Lightweight stored-worksheet row used to compute the device-local sequence. */
export interface StoredWorksheetLite {
  worksheetId: string;
  subject: string;
  createdAt: string;
  title: string;
  topicKeys: string[];
}

export interface WorksheetNomenclature {
  /** `WS-{S}-{TOPIC}-{NN}` — e.g. `WS-M-RN-03`. */
  code: string;
  /** Friendly name — e.g. `Real Numbers · Worksheet 3`. */
  name: string;
  kind: "single" | "multi" | "full";
  sequence: number;
}

/** A worksheet shaped just enough to name it (a structural subset of
 *  PersistedWorksheet — no store import needed). */
interface NameableWorksheet {
  worksheetId: string;
  subject: string;
  createdAt: string;
  title: string;
  questions: Array<{ topicKey: string; topicLabel: string }>;
}

function subjectLetterOf(subject: string): "M" | "S" {
  return /sci/i.test(String(subject || "")) ? "S" : "M";
}

/** Group key a worksheet's sequence counts within (single → per-topic; multi →
 *  MIX; full → FULL), scoped to the subject. */
function groupKeyOf(subject: string, title: string, topicKeys: string[]): string {
  const sl = subjectLetterOf(subject);
  const distinct = Array.from(new Set(topicKeys.filter(Boolean)));
  if (distinct.length <= 1) return `${sl}:${distinct[0] ?? ""}`;
  return /^full\b/i.test(String(title || "").trim()) ? `${sl}:FULL` : `${sl}:MIX`;
}

/**
 * Build a worksheet's display name + code. The sequence `#NN` is this
 * worksheet's 1-based rank (by createdAt) among the stored worksheets sharing its
 * (subject, topic-group) — so it is stable for a given worksheet and matches the
 * order they were generated. Pure: the store list is supplied by the caller.
 */
export function worksheetNomenclature(
  ws: NameableWorksheet,
  allStored: StoredWorksheetLite[],
): WorksheetNomenclature {
  const subject = String(ws.subject || "Maths");
  const sl = subjectLetterOf(subject);
  const distinct = Array.from(new Set(ws.questions.map((q) => q.topicKey).filter(Boolean)));
  const isFull = /^full\b/i.test(String(ws.title || "").trim());
  const kind: "single" | "multi" | "full" =
    distinct.length <= 1 ? "single" : isFull ? "full" : "multi";

  let token: string;
  let topicLabel: string;
  if (kind === "single") {
    const key = distinct[0] ?? "";
    token = topicAbbr(key);
    topicLabel = ws.questions.find((q) => q.topicKey === key)?.topicLabel || key || subject;
  } else if (kind === "full") {
    token = "FULL";
    topicLabel = `${subject} Full`;
  } else {
    token = "MIX";
    topicLabel = `${subject} Mixed`;
  }

  const groupKey = groupKeyOf(subject, ws.title, distinct);
  const sameGroup = allStored
    .filter((w) => groupKeyOf(w.subject, w.title, w.topicKeys) === groupKey)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const idx = sameGroup.findIndex((w) => w.worksheetId === ws.worksheetId);
  const sequence = (idx >= 0 ? idx : sameGroup.length) + 1;

  const code = `WS-${sl}-${token}-${String(sequence).padStart(2, "0")}`;
  const name = `${topicLabel} · Worksheet ${sequence}`;
  return { code, name, kind, sequence };
}
