/**
 * TS-DIFF-1 (owner, 23 Nov 2026) - an honest "Easier / Standard / Harder" label on each Test Series paper.
 *
 * PURE and import-light: the kill switch, the labelling RULES and the copy live here; the VALUES live in paperDifficulty.json (a
 * separate lazy chunk, never the entry chunk), generated from the pinned papers by paperDifficulty.guard.test.ts. The papers
 * themselves are pinned and never change; this only describes them.
 *
 * Method. Every bank row carries a difficulty tag (Easy / Medium / Hard). A paper's score is its Hard share of MARKS (not the
 * marks-weighted mean, which barely moves because every paper has the same A-E blueprint). The label is RELATIVE, never absolute:
 *   - Full-length (25 per subject): tertiles of Hard% within the subject (Science runs a little harder than Maths, so never compare
 *     across subjects). Lowest third Easier, middle Standard, top third Harder; ties broken by paper number.
 *   - Chapter tests (5 per chapter, ~32 marks): one 5-mark Hard question swings Hard% by ~15 points, so only the EXTREMES of a chapter
 *     are named: the lowest-Hard% paper is Easier and the highest Harder, and only when the gap between them is at least
 *     CHAPTER_MIN_GAP points and the extreme is unique. Everything else is Standard.
 * The tags are author/generator-assigned, not measured on students; the copy says "based on how many marks come from harder questions".
 *
 * Kill switch: VITE_TS_DIFFICULTY_DISABLED (any value but "", "0", "false") -> no chip, no filter, no caption; today's pickers.
 */

export type PaperDifficultyLabel = "Easier" | "Standard" | "Harder";
export interface PaperDifficultyEntry {
  label: PaperDifficultyLabel;
  /** Hard share of the paper's marks, percent, one decimal. Stored for audit; the UI never shows a number. */
  hardPct: number;
}
export type PaperDifficultyMap = Record<string, PaperDifficultyEntry>;

export const DIFFICULTY_LABELS: readonly PaperDifficultyLabel[] = ["Easier", "Standard", "Harder"];

/** Chapter tests: the extremes are named only when the chapter's lowest and highest Hard% differ by at least this many points. */
export const CHAPTER_MIN_GAP = 15;

export const DIFFICULTY_EXPLAINER = "Based on how many marks come from harder questions. Every paper follows the CBSE pattern.";

/** Kill switch: VITE_TS_DIFFICULTY_DISABLED (any value but "", "0", "false"). */
export function tsDifficultyDisabled(): boolean {
  const v = import.meta.env?.VITE_TS_DIFFICULTY_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

/** One question of a paper: its marks and its bank difficulty tag. */
export interface DifficultyQuestion {
  marks: number;
  difficulty: "Easy" | "Medium" | "Hard";
}
export interface DifficultyPaperInput {
  /** "TS-CT-M01-3" / "TS-FM-S7". */
  key: string;
  kind: "chapter" | "mock";
  subject: "Maths" | "Science";
  /** Chapter: the board chapter key. Mock: ignored. */
  topicKey: string | null;
  /** The paper's number within its chapter (1..5) or within its subject (1..25): the deterministic tie-breaker. */
  number: number;
  questions: readonly DifficultyQuestion[];
}

/** Hard share of marks, in percent (exact float; rounded only when stored). */
export function hardPctOf(questions: readonly DifficultyQuestion[]): number {
  let hard = 0;
  let total = 0;
  for (const q of questions) {
    const m = Number(q.marks) || 0;
    total += m;
    if (q.difficulty === "Hard") hard += m;
  }
  return total > 0 ? (hard / total) * 100 : 0;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Compute every paper's label from the papers' own questions. Deterministic: same input, same output. */
export function computePaperDifficulty(papers: readonly DifficultyPaperInput[]): PaperDifficultyMap {
  const scored = papers.map((p) => ({ p, hard: hardPctOf(p.questions) }));
  const out: PaperDifficultyMap = {};
  const put = (key: string, label: PaperDifficultyLabel, hard: number) => {
    out[key] = { label, hardPct: round1(hard) };
  };

  // Full-length: tertiles within the subject.
  for (const subject of ["Maths", "Science"] as const) {
    const group = scored.filter((s) => s.p.kind === "mock" && s.p.subject === subject).sort((a, b) => a.hard - b.hard || a.p.number - b.p.number);
    const n = group.length;
    const low = Math.floor(n / 3);
    const high = Math.floor(n / 3);
    group.forEach((s, i) => put(s.p.key, i < low ? "Easier" : i >= n - high ? "Harder" : "Standard", s.hard));
  }

  // Chapter tests: only the unique extremes of a chapter, and only when the gap is wide enough.
  const byChapter = new Map<string, typeof scored>();
  for (const s of scored) {
    if (s.p.kind !== "chapter") continue;
    const k = `${s.p.subject}:${s.p.topicKey}`;
    byChapter.set(k, [...(byChapter.get(k) ?? []), s]);
  }
  for (const group of byChapter.values()) {
    const lo = Math.min(...group.map((s) => s.hard));
    const hi = Math.max(...group.map((s) => s.hard));
    const wide = hi - lo >= CHAPTER_MIN_GAP;
    const lows = group.filter((s) => s.hard === lo);
    const highs = group.filter((s) => s.hard === hi);
    for (const s of group) {
      const label: PaperDifficultyLabel = wide && lows.length === 1 && s.hard === lo ? "Easier" : wide && highs.length === 1 && s.hard === hi ? "Harder" : "Standard";
      put(s.p.key, label, s.hard);
    }
  }
  return out;
}

/**
 * Should the picker SHOW a chip for this entry? Full-length: all three labels (the filter offers all three). Chapter tests: only the
 * two extremes - a "Standard" chip on most cards would be noise.
 */
export function showsChip(kind: "chapter" | "mock", label: PaperDifficultyLabel | undefined): label is PaperDifficultyLabel {
  if (!label) return false;
  return kind === "mock" ? true : label !== "Standard";
}

let cached: Promise<PaperDifficultyMap | null> | null = null;
/** LAZY: the JSON is its own chunk, fetched only by a Test Series page. Null under the kill switch or on any load failure (no chip, never a blank page). */
export function loadPaperDifficulty(): Promise<PaperDifficultyMap | null> {
  if (tsDifficultyDisabled()) return Promise.resolve(null);
  cached ??= import("./paperDifficulty.json").then((m) => m.default as unknown as PaperDifficultyMap).catch(() => {
      cached = null;
      return null;
    });
  return cached;
}
