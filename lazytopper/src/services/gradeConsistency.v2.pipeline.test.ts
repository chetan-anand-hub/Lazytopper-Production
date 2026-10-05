/**
 * G3 · v2 — SCORECARD-MI-1 PR-2: the grade-consistency REPLAY over GRADER-CORE-1's v2 bodies.
 * THE PR-2 GATE: every check below must pass on 100% of the bodies it reads.
 *
 * GOLDEN SOURCE. A directory holding `manifest.json` and `v2/<caseId>.<single|set>[.<job>].json`
 * — each file a FULL response body (single = /api/check-solution, set = /api/grade-worksheet,
 * both requested with `acceptsV2: true`). The directory is `process.env.LT_G3_GOLDEN_DIR`, else
 * `<repo>/lazytopper/server/eval/golden/responses` (resolved from this file). The manifest
 * drives the read; every file it names must exist and every v2 file on disk must be named.
 * A MISSING directory is a FAILURE, never a skip: the golden describe collapses to ONE failing
 * test that names the missing path.
 *   ⚠ TODAY the bodies are INTERIM (GRADER-CORE-1 PR-1's stored raw model outputs, recorded
 *   under the OLD prompts, replayed through the NEW PR-2 post-processing — zero model calls),
 *   run locally by pointing LT_G3_GOLDEN_DIR at them. The FINAL outputs land IN-REPO, at the
 *   default path above, when GRADER-CORE-1 PR-2 merges; this suite then reads them with no
 *   environment variable.
 *
 * THE TWO MARKS CHECKS (PR-1 measured them as a baseline; here they are GATED):
 *   - `fourType.inMarks` (every GRADED question): the parts a student is shown — the owner's
 *     three groups (`marksGroupRows`) + "Not attempted" + "Marks lost, reason not recorded",
 *     all from `questionMarksLost` — sum to total − awarded (±1e-9), and keep the grader's
 *     `marksLostByType` ledger (re-derived below, not imported) as INVARIANTS: every typed
 *     bucket exactly the grader's; "Not attempted" + "reason not recorded" the grader's sum; "Not
 *     attempted" never below the grader's and at least what the grader's OWN STEP STATES say was
 *     not attempted (a "missing" step's untyped deduction; the whole untyped remainder when every
 *     other marked step is correct — OR-LIVE L3). The same invariants gate the paper, the
 *     scorecard and every MI entry; an MI entry exists only for a loss NOT made of such parts.
 *   - `everyLostMarkHasAType` (every graded question that LOST marks): every lost mark is
 *     ACCOUNTED FOR in EXACTLY ONE displayed bucket — a mistake type (and through it exactly one
 *     owner group), "Not attempted" (never a mistake), or "Marks lost, reason not recorded".
 *     Concretely: the grade is shown in marks (never a count fallback), every bucket is ≥ 0,
 *     the six buckets sum to the loss (no mark dropped, none counted twice), and each stored
 *     type sits in exactly one group — the owner's (knowledge = conceptual, technique =
 *     presentation, careless = calculation + silly). "Has a type" therefore means "has a
 *     DISPLAYED REASON": a loss the grader gave no reason for is shown as exactly that, never
 *     given an invented type.
 *
 * PER PAPER: `paperMarksLost(results).byType` sums to `.lost`; `paperGradedTotals` equals the
 * body's gradedMarksAwarded / gradedMarksTotal / gradedCount; a question that was NOT graded
 * (couldNotRead · unread option · answerMismatch) adds 0 marks lost and is excluded; withdrawn
 * steps never carry a type and never add marks.
 *
 * REAL CODE (every distinct SET body, every SINGLE, every curated fixture): through the real
 * `gradeWorksheetAndRecord` (a single is first adapted exactly as Check & Improve adapts it —
 * `singleCheckToWorksheetResponse` → `withObjectiveEcho` → `withV2Echo`), with only the network
 * (`gradeWorksheet`), Firestore (an in-memory map) and the session hooks replaced:
 *   scorecard = `worksheetScorecardVariant` + rendered `<ResultsScorecard>`; PDF = rendered
 *   `WorksheetGradedPrintDoc`; MI = the stored entries; Me = `splitPaperMarks`; Tutor =
 *   `getMistakeInsights` (only its log READ is pointed at the stored entries).
 *
 * CURATED (`__fixtures__/gradeConsistency/v2/`, each labelled SYNTHETIC in its own `source`):
 * the owner-paper shape set, a couldNotRead single, an answerMismatch single, a withdrawn +
 * rubric single, and one deliberately OFF-contract single (buckets sum short) that pins the
 * client's documented tolerance.
 *
 * "NOTHING RECORDED ANYWHERE": answerMismatch / couldNotRead / an unread option record no MI
 * entry and no attempt — through the worksheet, Chapter Test and Full Mock grade services AND
 * the MI front door itself — while their siblings ARE recorded; the copy each surface prints
 * is the module constant, verbatim (em dash included).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, cleanup, waitFor } from "@testing-library/react";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

/* ── the in-memory Firestore + the network, hoisted so the module mocks can see them ── */
const H = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  return {
    store,
    auto: { n: 0 },
    auth: { user: null as null | Record<string, unknown>, loading: false },
    sub: {
      isPremium: true,
      isTrialExpired: false,
      hydrated: true,
      tier: "premium",
      isTrialActive: false,
      daysLeftInTrial: 0,
      startTrial: () => {},
      upgradeToPremium: () => {},
      status: { tier: "premium", plan: "monthly", trialStartDate: null, trialEndDate: null, premiumSince: null },
    },
    gradeWorksheet: vi.fn(),
    getMistakeLogs: vi.fn(),
  };
});

vi.mock("firebase/firestore", () => {
  type Ref = { __kind: "col" | "doc"; path: string; id?: string };
  type Q = { __kind: "query"; col: Ref; clauses: Array<{ t: string; a?: unknown; b?: unknown; c?: unknown }> };
  const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const join = (segs: unknown[]) => segs.map(String).join("/");
  const collection = (base: unknown, ...segs: unknown[]): Ref => {
    const prefix = (base as Ref)?.__kind === "doc" ? (base as Ref).path + "/" : "";
    return { __kind: "col", path: prefix + join(segs) };
  };
  const doc = (base: unknown, ...segs: unknown[]): Ref => {
    if ((base as Ref)?.__kind === "col") {
      const id = segs.length ? String(segs[0]) : `auto${++H.auto.n}`;
      return { __kind: "doc", path: (base as Ref).path + "/" + id, id };
    }
    return { __kind: "doc", path: join(segs), id: String(segs[segs.length - 1]) };
  };
  const snap = (p: string, data: Record<string, unknown> | undefined) => ({
    id: p.split("/").pop() as string,
    ref: { path: p },
    exists: () => data !== undefined,
    data: () => clone(data),
  });
  const query = (col: Ref | Q, ...clauses: Q["clauses"]): Q =>
    (col as Q).__kind === "query" ? { ...(col as Q), clauses: [...(col as Q).clauses, ...clauses] } : { __kind: "query", col: col as Ref, clauses };
  return {
    initializeFirestore: () => ({ __fake: true }),
    getFirestore: () => ({ __fake: true }),
    collection,
    doc,
    query,
    where: (a: unknown, b: unknown, c: unknown) => ({ t: "where", a, b, c }),
    orderBy: (a: unknown, b: unknown = "asc") => ({ t: "orderBy", a, b }),
    limit: (a: unknown) => ({ t: "limit", a }),
    serverTimestamp: () => new Date().toISOString(),
    arrayUnion: (...v: unknown[]) => v,
    setDoc: async (ref: Ref, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      const prev = H.store.get(ref.path);
      H.store.set(ref.path, opts?.merge && prev ? { ...prev, ...clone(data) } : clone(data));
    },
    updateDoc: async (ref: Ref, data: Record<string, unknown>) => {
      H.store.set(ref.path, { ...(H.store.get(ref.path) ?? {}), ...clone(data) });
    },
    deleteDoc: async (ref: Ref) => {
      H.store.delete(ref.path);
    },
    addDoc: async (col: Ref, data: Record<string, unknown>) => {
      const ref = doc(col);
      H.store.set(ref.path, clone(data));
      return ref;
    },
    getDoc: async (ref: Ref) => snap(ref.path, H.store.get(ref.path)),
    getDocs: async (qOrCol: Ref | Q) => {
      const q: Q = (qOrCol as Q).__kind === "query" ? (qOrCol as Q) : { __kind: "query", col: qOrCol as Ref, clauses: [] };
      const prefix = q.col.path + "/";
      let rows = [...H.store.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
      for (const c of q.clauses) {
        if (c.t === "where") {
          const f = String(c.a);
          rows = rows.filter(([, d]) => {
            const x = d[f] as never;
            const v = c.c as never;
            return c.b === ">=" ? x >= v : c.b === "<=" ? x <= v : c.b === "==" ? x === v : c.b === "in" ? (v as unknown as unknown[]).includes(x) : true;
          });
        } else if (c.t === "orderBy") {
          const f = String(c.a);
          const dir = c.b === "desc" ? -1 : 1;
          rows.sort(([, a], [, b]) => ((a[f] as never) > (b[f] as never) ? 1 : (a[f] as never) < (b[f] as never) ? -1 : 0) * dir);
        } else if (c.t === "limit") rows = rows.slice(0, Number(c.a));
      }
      const docs = rows.map(([p, d]) => snap(p, d));
      return { empty: docs.length === 0, size: docs.length, docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn) };
    },
  };
});
vi.mock("./firebaseClient", () => ({
  firebaseConfigured: false,
  firebaseProjectId: "g3v2-in-memory",
  firestoreDb: { __fake: true },
  authClient: null,
  app: null,
  getPopupRedirectResolver: () => undefined,
  prewarmPopupRedirectResolver: () => {},
}));
vi.mock("./usageClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./usageClient")>();
  return { ...actual, fetchUsageMe: async () => null };
});
vi.mock("../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
// splitPaperMarks lives in MeProgressPage: stub the gate the standard way (nothing here renders the page).
vi.mock("../components/auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: ReactNode }) => children,
  RequireAuth: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a) };
});
// The attempt twin is SPIED, never replaced: the real recordAttempt still runs.
vi.mock("./practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./practiceInsights")>();
  return { ...actual, recordAttempt: vi.fn(actual.recordAttempt) };
});
// Only the MI log READ is redirected (the tutor's insight reads the entries this replay stored);
// the write path (logMistakes / removeStableMistakeLog) is the real module.
vi.mock("./mistakeLogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeLogService")>();
  return { ...actual, getMistakeLogs: (...a: unknown[]) => H.getMistakeLogs(...a) };
});

import ResultsScorecard from "../components/results/ResultsScorecard";
import { worksheetScorecardVariant } from "../components/results/scorecardVariants";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";
import { gradeWorksheetAndRecord } from "./worksheetGradeService";
import { gradeChapterTestUpload, scoreObjectiveSection } from "./chapterTestGradeService";
import { gradeFullMockUpload } from "./fullMockGradeService";
import { recordMistake } from "./mistakeIntelligence";
import { recordAttempt } from "./practiceInsights";
import { getMistakeInsights } from "./mistakeInsightsService";
import { setActiveProgressUser } from "./studentProgressStore";
import { singleCheckToWorksheetResponse } from "./checkImproveGradeService";
import { withObjectiveEcho, withV2Echo } from "../utils/checkImproveDetection";
import { splitPaperMarks } from "../pages/MeProgressPage";
import {
  ANSWER_MISMATCH_COPY,
  COULD_NOT_READ_COPY,
  MARKS_HEADING,
  MISTAKES_BY_KIND_HEADING,
  MISTAKE_GROUPS,
  NOT_ATTEMPTED,
  STORED_MISTAKE_TYPES,
  UNREAD_OPTION_COPY,
  UNTYPED_MARKS_LABEL,
  effectiveTypeCounts,
  gradeStateCopy,
  groupMarks,
  isGradedQuestion,
  marksGroupRows,
  marksLostOn,
  marksLostToWork,
  paperGradedTotals,
  paperMarksLost,
  questionMarksLost,
  stepDisplay,
  stepShowsType,
  stepTypeCounts,
} from "../lib/mistakeDisplay";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import type { WorksheetGradeResponse } from "../ai/aiClient";

/* ── sources ────────────────────────────────────────────────────────────────── */
type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_GOLDEN_DIR = path.resolve(HERE, "..", "..", "server", "eval", "golden", "responses");
const GOLDEN_DIR = path.resolve(process.env.LT_G3_GOLDEN_DIR || DEFAULT_GOLDEN_DIR);
const GOLDEN_V2 = path.join(GOLDEN_DIR, "v2");
const GOLDEN_MANIFEST = path.join(GOLDEN_DIR, "manifest.json");
const GOLDEN_PRESENT = existsSync(GOLDEN_MANIFEST) && existsSync(GOLDEN_V2);
const CURATED_DIR = path.join(HERE, "__fixtures__", "gradeConsistency", "v2");
const CURATED = (name: string): Any => JSON.parse(readFileSync(path.join(CURATED_DIR, name), "utf8"));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const sha = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 10);

interface ManifestFile {
  caseId: string;
  kind: "single" | "set";
  file: string;
  surface?: string;
  jobKey?: string;
  qNumber?: number;
}
/** One body to check. `subjectOf(qNumber)` gives the paper each question belongs to. */
interface Body {
  tag: string;
  kind: "single" | "set";
  body: Any;
  files: string[];
  subjectOf: (qNumber: number) => "Maths" | "Science";
  /** curated fixtures carry their own request (question text, marks, chapter). */
  request?: Any;
  trueChapters?: Record<string, string>;
}
const subjectOfCase = (caseId: string): "Maths" | "Science" => (/^GS-S/.test(caseId) ? "Science" : "Maths");

function loadGolden(): { files: ManifestFile[]; onDisk: string[]; sets: Body[]; singles: Body[] } {
  const manifest = JSON.parse(readFileSync(GOLDEN_MANIFEST, "utf8"));
  const files: ManifestFile[] = Array.isArray(manifest.files) ? manifest.files : [];
  const onDisk = readdirSync(GOLDEN_V2).filter((f) => f.endsWith(".json"));
  const sets = new Map<string, Body & { cases: Map<number, string> }>();
  const singles: Body[] = [];
  for (const f of files) {
    const p = path.join(GOLDEN_V2, f.file);
    if (!existsSync(p)) continue; // reported by the manifest-integrity check
    const raw = readFileSync(p, "utf8");
    if (f.kind === "single") {
      singles.push({ tag: f.file, kind: "single", body: JSON.parse(raw), files: [f.file], subjectOf: () => subjectOfCase(f.caseId) });
      continue;
    }
    const h = sha(raw); // a set body is written under EACH of its case ids — replay it once
    let s = sets.get(h);
    if (!s) {
      const cases = new Map<number, string>();
      s = { tag: f.file, kind: "set", body: JSON.parse(raw), files: [], cases, subjectOf: (n: number) => subjectOfCase(cases.get(n) ?? "") };
      sets.set(h, s);
    }
    s.files.push(f.file);
    if (typeof f.qNumber === "number") s.cases.set(f.qNumber, f.caseId);
  }
  return { files, onDisk, sets: [...sets.values()], singles };
}
const GOLDEN = GOLDEN_PRESENT ? loadGolden() : null;

const CURATED_SET = CURATED("owner-paper-shape.set.json");
const CURATED_RECLASS = CURATED("missing-step-reclass.set.json");
const CURATED_SINGLES = ["could-not-read.single.json", "answer-mismatch.single.json", "withdrawn-rubric.single.json", "short-sum-tolerance.single.json"].map((name) => ({
  name,
  fx: CURATED(name),
}));
const curatedBodies: Body[] = [
  {
    tag: "curated:owner-paper-shape.set.json",
    kind: "set",
    body: CURATED_SET.body,
    files: ["owner-paper-shape.set.json"],
    subjectOf: (n: number) => (CURATED_SET.trueSubjects?.[String(n)] === "Science" ? "Science" : "Maths"),
    request: CURATED_SET.request,
    trueChapters: CURATED_SET.trueChapters,
  },
  {
    tag: "curated:missing-step-reclass.set.json",
    kind: "set",
    body: CURATED_RECLASS.body,
    files: ["missing-step-reclass.set.json"],
    subjectOf: (n: number) => (CURATED_RECLASS.trueSubjects?.[String(n)] === "Science" ? "Science" : "Maths"),
    request: CURATED_RECLASS.request,
    trueChapters: CURATED_RECLASS.trueChapters,
  },
  ...CURATED_SINGLES.map(({ name, fx }) => ({
    tag: `curated:${name}`,
    kind: "single" as const,
    body: fx.body,
    files: [name],
    subjectOf: () => (fx.request.subject === "Science" ? ("Science" as const) : ("Maths" as const)),
    request: fx.request,
  })),
];

/* ── the owner's rulings and words, written out INDEPENDENTLY of lib/mistakeDisplay ── */
const BUCKETS = ["conceptual", "calculation", "silly", "presentation", "unattempted", "untyped"] as const;
type Bucket = (typeof BUCKETS)[number];
type Marks = Record<Bucket, number>;
const TYPES = ["conceptual", "calculation", "silly", "presentation"] as const;
const OWNER_GROUP: Record<string, "knowledge" | "technique" | "careless"> = {
  conceptual: "knowledge",
  presentation: "technique",
  calculation: "careless",
  silly: "careless",
};
const OWNER_GROUP_ORDER = ["knowledge", "technique", "careless"] as const;
/** The owner's sentences (PR-2 B8 + the 2026-10-05 addendum), verbatim — em dashes included. */
const OWNER_COPY = {
  "answer-mismatch": "This answer doesn't seem to match the question — check you uploaded the right page",
  "could-not-read": "We couldn't read this answer — retake the photo",
  "unread-option": "We couldn't read your option",
} as const;
const EPS = 1e-9;
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const zero = (): Marks => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 });
const sumMarks = (m: Marks) => r2(BUCKETS.reduce((s, b) => s + m[b], 0));
const addM = (a: Marks, b: Marks): Marks => {
  const out = zero();
  for (const k of BUCKETS) out[k] = r2(a[k] + b[k]);
  return out;
};
const sameMarks = (a: Marks | null | undefined, b: Marks | null | undefined) =>
  !!a && !!b && BUCKETS.every((k) => Math.abs((Number(a[k]) || 0) - (Number(b[k]) || 0)) <= EPS);

/** Was this question GRADED? From the v2 FLAGS alone, never from the marks. */
const oGraded = (q: Any) => !!q && q.answerMismatch !== true && !q.couldNotRead;
/** Which honest state a not-graded question is in. */
const oState = (q: Any) => (q?.answerMismatch === true ? "answer-mismatch" : q?.objectiveResolved === false ? "unread-option" : "could-not-read");
const oLost = (q: Any) => (oGraded(q) ? r2(Math.max(0, (Number(q.totalMarks) || 0) - (Number(q.marksAwarded) || 0))) : 0);
function oBuckets(raw: Any): Marks | null {
  if (!raw || typeof raw !== "object") return null;
  const out = zero();
  for (const b of BUCKETS) {
    const v = raw[b];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
    out[b] = v;
  }
  return out;
}
/** Where every lost mark of a GRADED question is displayed: the grader's buckets; a shortfall is
 *  "reason not recorded"; buckets that claim MORE than the loss cannot be shown in marks (null). */
function oParts(q: Any): Marks | null {
  if (!oGraded(q)) return null;
  const m = oBuckets(q.marksLostByType);
  if (!m) return null;
  const lost = oLost(q);
  const sum = sumMarks(m);
  if (sum > lost + EPS) return null;
  return sum < lost - EPS ? { ...m, untyped: r2(m.untyped + (lost - sum)) } : m;
}
const isNotAttemptedStep = (s: Any) => s?.status === "missing" || s?.status === "unattempted";
/**
 * The marks the grader's OWN STEP STATES say were not attempted (OR-LIVE L3) — a FLOOR for what
 * the display must show as "Not attempted", read from the steps, never from lib/mistakeDisplay:
 *   - the grader's `unattempted` bucket;
 *   - plus the deductions on "missing" steps that earned nothing and carry no type, as far as the
 *     grader filed them under "reason not recorded" (a typed mark is the grader's ruling: never moved);
 *   - and when every OTHER marked step is fully correct, the whole untyped remainder — nothing else
 *     on the page could have lost it.
 */
function oNotAttemptedFloor(q: Any): number {
  const p = oParts(q);
  if (!p) return 0;
  const marked: Any[] = (q.annotatedSteps ?? []).filter((s: Any) => s?.status !== "withdrawn");
  const na = marked.filter((s) => isNotAttemptedStep(s) && !((Number(s?.marksAwarded) || 0) > 0));
  if (na.length === 0) return p.unattempted;
  if (marked.filter((s) => !na.includes(s)).every((s) => s?.status === "correct")) return r2(p.unattempted + p.untyped);
  const missingUntyped = na
    .filter((s) => s?.status === "missing" && !(TYPES as readonly string[]).includes(s?.mistakeType))
    .reduce((sum, s) => sum + Math.max(0, Number(s?.marksDeducted) || 0), 0);
  return r2(p.unattempted + Math.min(p.untyped, missingUntyped));
}
/**
 * The display's ledger against the grader's, as INVARIANTS (the display may re-file an untyped
 * mark as "Not attempted" when the grader's own step says so — see oNotAttemptedFloor):
 *   every TYPED bucket is exactly the grader's; "Not attempted" + "reason not recorded" keep the
 *   grader's sum; "Not attempted" never shrinks below the grader's and reaches the step floor.
 */
function ledgerOk(m: Marks | null | undefined, want: Marks | null | undefined, floor: number): boolean {
  return (
    !!m &&
    !!want &&
    TYPES.every((t) => Math.abs(m[t] - want[t]) <= EPS) &&
    Math.abs(m.unattempted + m.untyped - (want.unattempted + want.untyped)) <= EPS &&
    m.unattempted >= want.unattempted - EPS &&
    m.unattempted >= floor - EPS
  );
}
/** The paper's marks as the GRADER filed them (graded questions only; a graded loss with no usable
 *  split is "reason not recorded"), plus the sum of the step floors. */
function oPaper(results: Any[]): { lost: number; byType: Marks; floor: number; anySplit: boolean } {
  let byType = zero();
  let lost = 0;
  let floor = 0;
  let anySplit = false;
  for (const q of results) {
    if (!oGraded(q)) continue;
    lost = r2(lost + oLost(q));
    const p = oParts(q);
    if (p) {
      anySplit = true;
      byType = addM(byType, p);
      floor = r2(floor + oNotAttemptedFloor(q));
    } else if (oLost(q) > 0) byType = { ...byType, untyped: r2(byType.untyped + oLost(q)) };
  }
  return { lost, byType, floor, anySplit };
}
/** Not attempted (owner ruling): graded, nothing awarded, and either the whole loss is
 *  `unattempted` or every marked (non-withdrawn) step is a not-attempted step. */
function oNotAttempted(q: Any): boolean {
  if (!oGraded(q) || (Number(q.marksAwarded) || 0) > 0) return false;
  const m = oBuckets(q.marksLostByType);
  const total = Number(q.totalMarks) || 0;
  if (m && total > 0 && r2(m.unattempted) === r2(total)) return true;
  const marked = (q.annotatedSteps ?? []).filter((s: Any) => s?.status !== "withdrawn");
  return marked.length > 0 && marked.every((s: Any) => s?.status === "missing" || s?.status === "unattempted");
}
/** An MI entry is written for a graded question that lost marks TO ITS WORK (OR-LIVE L3): its loss
 *  is NOT only on parts the grader's own steps say were not attempted. So a question whose only
 *  non-"correct" marked steps are not attempted (0 awarded) and that carries no typed mark gets no
 *  entry; a typed mark always counts (the grader's ruling is never re-filed). */
function oWantsEntry(q: Any): boolean {
  if (!oGraded(q) || oLost(q) <= 0 || oNotAttempted(q)) return false;
  const p = oParts(q);
  const toWork = p ? r2(oLost(q) - oNotAttemptedFloor(q)) : marksLostToWork(q);
  return toWork > 0;
}
/** The type that cost the most MARKS over some entries; a tie goes to the group shown first,
 *  then to the type's order inside it. Falls back to the most COUNTED type (conceptual,
 *  calculation, silly, presentation order) when no mistake bucket lost a mark. */
function oTopType(entries: Any[]): string | null {
  const marks = entries.reduce((acc: Marks, e: Any) => addM(acc, oBuckets(e.marksLostByType) ?? zero()), zero());
  const order = OWNER_GROUP_ORDER.flatMap((g) => TYPES.filter((t) => OWNER_GROUP[t] === g));
  let best: string | null = null;
  let bestN = 0;
  for (const t of order) {
    if (marks[t] > bestN) {
      best = t;
      bestN = marks[t];
    }
  }
  if (best) return best;
  const counts: Record<string, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const e of entries) for (const t of TYPES) counts[t] += Number(e.mistakeCounts?.[t]) || 0;
  const max = Math.max(...TYPES.map((t) => counts[t]));
  return max > 0 ? (TYPES.find((t) => counts[t] === max) ?? null) : null;
}
/** Each stored type sits in exactly ONE owner group, and the groups are shown in owner order. */
function typesPartitioned(): boolean {
  return (
    JSON.stringify(MISTAKE_GROUPS.map((g) => g.key)) === JSON.stringify(OWNER_GROUP_ORDER) &&
    STORED_MISTAKE_TYPES.length === TYPES.length &&
    TYPES.every((t) => {
      const hits = MISTAKE_GROUPS.filter((g) => (g.types as readonly string[]).includes(t));
      return hits.length === 1 && hits[0].key === OWNER_GROUP[t];
    })
  );
}

/* ── the check ledger ──────────────────────────────────────────────────────── */
interface Check {
  id: string;
  surface: string;
  pass: boolean;
  detail: string;
}
const LEDGER: Check[] = [];
function check(surface: string, id: string, pass: boolean, detail = "") {
  LEDGER.push({ id, surface, pass, detail });
}
/** Each test asserts only the checks IT added (a ledger index taken at its start). */
const mark = () => LEDGER.length;
const failedSince = (i: number) => LEDGER.slice(i).filter((c) => !c.pass).map((c) => `${c.surface} ${c.id}: ${c.detail}`);

/* ── (b) per-question and per-paper marks checks (pure) ────────────────────── */
function checkQuestion(S: string, q: Any) {
  const graded = oGraded(q);
  check(S, "gradeState=flags", isGradedQuestion(q) === graded, `module ${isGradedQuestion(q)} vs flags ${graded}`);
  const steps: Any[] = q.annotatedSteps ?? [];
  if (!graded) {
    const zeroBuckets = (() => {
      const m = oBuckets(q.marksLostByType);
      return !!m && sumMarks(m) === 0;
    })();
    check(S, "notGraded.noMarksNoType", questionMarksLost(q) === null && marksLostOn(q) === 0 && marksLostToWork(q) === 0 && zeroBuckets && totalOf(effectiveTypeCounts(q)) === 0, JSON.stringify(q.marksLostByType));
    if (q.answerMismatch === true) {
      check(S, "notGraded.answerMismatch.shape", q.marksAwarded === 0 && Array.isArray(steps) && steps.length === 0 && q.couldNotRead !== true, `awarded ${JSON.stringify(q.marksAwarded)}, steps ${steps.length}`);
    }
    check(S, "notGraded.copy=owner", gradeStateCopy(q) === OWNER_COPY[oState(q)], String(gradeStateCopy(q)));
    return;
  }
  const lost = oLost(q);
  const m = questionMarksLost(q);
  const want = oParts(q);
  const displayed = m ? r2(marksGroupRows(m).reduce((s, r) => s + r.marks, 0) + m.unattempted + m.untyped) : NaN;
  // The display may move an UNTYPED mark to "Not attempted" when the grader's own step says the
  // part was not attempted ("missing" — the v2 grader still passes it through from the model).
  // Independent of that rule: every TYPED bucket is exactly the grader's, the two non-mistake
  // buckets keep their sum, and "Not attempted" only ever grows — up to at least what the steps
  // say was not attempted (ledgerOk / oNotAttemptedFloor), never invented from a type.
  const floor = oNotAttemptedFloor(q);
  check(
    S,
    "fourType.inMarks",
    !!m && Math.abs(displayed - lost) <= EPS && ledgerOk(m, want, floor),
    `displayed ${displayed} vs lost ${lost} · ${JSON.stringify(m)} · grader ${JSON.stringify(want)} · not-attempted floor ${floor}`,
  );
  if (lost > 0) {
    const ok = !!m && BUCKETS.every((b) => m[b] >= 0) && Math.abs(sumMarks(m) - lost) <= EPS && typesPartitioned();
    check(S, "everyLostMarkHasAType", ok, `lost ${lost} · buckets ${JSON.stringify(m)} · partition ${typesPartitioned()}`);
  }
  // withdrawn steps: never typed, never marked — on the data AND in what the client derives
  const withdrawn = steps.filter((s) => s?.status === "withdrawn");
  for (const s of withdrawn) {
    const stray = { ...s, mistakeType: "conceptual" };
    check(
      S,
      `step${s.stepNumber}.withdrawn.untypedUnmarked`,
      s.mistakeType == null && s.marksAwarded === 0 && s.marksDeducted === 0 && s.marksAvailable === 0 && !stepShowsType(stray, q) && !stepDisplay(s.status).showDeduction,
      JSON.stringify({ t: s.mistakeType, aw: s.marksAwarded, ded: s.marksDeducted, av: s.marksAvailable }),
    );
  }
  if (withdrawn.length) {
    const strayQ = { ...q, annotatedSteps: steps.map((s) => (s?.status === "withdrawn" ? { ...s, mistakeType: "conceptual" } : s)) };
    const noWithdrawn = { ...q, annotatedSteps: steps.filter((s) => s?.status !== "withdrawn") };
    check(S, "withdrawn.neverCountedOrMarked", JSON.stringify(stepTypeCounts(strayQ.annotatedSteps)) === JSON.stringify(stepTypeCounts(noWithdrawn.annotatedSteps)) && sameMarks(questionMarksLost(strayQ), questionMarksLost(noWithdrawn)), "");
  }
}
const totalOf = (c: Record<string, number>) => TYPES.reduce((s, t) => s + (Number(c[t]) || 0), 0);

function checkPaper(S: string, paper: Any) {
  const results: Any[] = paper.results ?? [];
  const pm = paperMarksLost(results);
  const o = oPaper(results);
  if (!o.anySplit) {
    check(S, "paper.marksLost.nullWithoutGradedSplit", pm === null, JSON.stringify(pm));
  } else {
    check(S, "paper.byType.sumsToLost", !!pm && Math.abs(sumMarks(pm.byType) - pm.lost) <= EPS && Math.abs(pm.lost - o.lost) <= EPS, `byType ${pm ? sumMarks(pm.byType) : "∅"} · lost ${pm?.lost} · oracle ${o.lost}`);
    check(S, "paper.byType=oracle", !!pm && ledgerOk(pm.byType, o.byType, o.floor), `${JSON.stringify(pm?.byType)} vs grader ${JSON.stringify(o.byType)} · not-attempted floor ${o.floor}`);
    const onlyGraded = paperMarksLost(results.filter(oGraded));
    check(S, "paper.notGraded.excluded", !!pm && !!onlyGraded && sameMarks(onlyGraded.byType, pm.byType) && onlyGraded.lost === pm.lost, "");
  }
  const t = paperGradedTotals(results);
  const g = results.filter(oGraded);
  const oAw = r2(g.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0));
  const oTot = r2(g.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0));
  check(
    S,
    "paper.gradedTotals=body",
    t.awarded === paper.gradedMarksAwarded && t.total === paper.gradedMarksTotal && t.gradedCount === paper.gradedCount && t.notGradedCount === paper.pendingCount && t.awarded === oAw && t.total === oTot,
    `module ${JSON.stringify(t)} · body ${paper.gradedMarksAwarded}/${paper.gradedMarksTotal} n${paper.gradedCount} p${paper.pendingCount} · oracle ${oAw}/${oTot}`,
  );
  const all = r2(results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0));
  check(S, "paper.worksheetTotal.includesNotGraded", all === paper.worksheetTotalMarks && paper.totalQuestions === results.length, `${all} vs ${paper.worksheetTotalMarks}`);
}

/** A single, adapted into the one-question paper exactly as Check & Improve adapts it. */
const adaptSingle = (b: Any): WorksheetGradeResponse => withV2Echo(withObjectiveEcho(singleCheckToWorksheetResponse(b), b), b);

/* ── harness ───────────────────────────────────────────────────────────────── */
const UID = "g3v2-student";
const USER = { uid: UID, isLocalSession: false, email: null, phoneNumber: null, displayName: "G3 v2 Student" };
const UPLOAD = { imageBase64: "AAAA", imageMimeType: "application/pdf" };
const docsUnder = (prefix: string) =>
  [...H.store.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/")).map(([p, d]) => ({ path: p, ...(d as Any) }));
const miEntries = () => docsUnder(`learnerProfiles/${UID}/mistakeLogs/`);
const records = () => docsUnder(`sessionRecords/${UID}/records/`);
const qOfId = (id: unknown) => Number(/:q(\d+)$/.exec(String(id ?? ""))?.[1] ?? NaN);
const attemptIds = () => vi.mocked(recordAttempt).mock.calls.map((c) => String((c[1] as Any)?.questionId ?? ""));

function resetWorld() {
  H.store.clear();
  H.auto.n = 0;
  window.localStorage.clear();
  vi.mocked(recordAttempt).mockClear();
  H.gradeWorksheet.mockReset();
  H.getMistakeLogs.mockReset();
}
beforeEach(() => {
  resetWorld();
  setActiveProgressUser(UID);
  H.auth = { user: USER, loading: false };
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The persisted worksheet a body is graded against (its questions, marks and papers). */
function worksheetFor(b: Body, paper: Any, idTag: string): PersistedWorksheet {
  const results: Any[] = Array.isArray(paper?.results) && paper.results.length ? paper.results : [{ qNumber: 1, totalMarks: 1 }];
  const reqQ = new Map<number, Any>((b.request?.questions ?? []).map((q: Any) => [Number(q.qNumber), q]));
  const questions = results.map((r) => {
    const n = Number(r.qNumber);
    const rq = reqQ.get(n);
    const marks = Number(rq?.marks ?? r.totalMarks) || 1;
    const subject = b.subjectOf(n);
    return {
      qNumber: n,
      id: `g3v2-${idTag}-q${n}`,
      subject,
      topicKey: b.trueChapters?.[String(n)] ?? "",
      topicLabel: rq?.topic ?? b.request?.topic ?? `${subject} · ${b.tag}`,
      section: r.objective || rq?.objective ? "A" : marks >= 5 ? "D" : marks === 4 ? "E" : marks === 3 ? "C" : "B",
      marks,
      questionText: rq?.questionText ?? b.request?.question ?? `G3-v2 ${b.tag} · Q${n}`,
    };
  });
  return {
    worksheetId: `g3v2-${idTag}`,
    createdAt: new Date("2026-10-05T09:00:00Z").toISOString(),
    title: `G3 v2 ${b.tag}`,
    subject: questions[0]?.subject ?? "Maths",
    grade: "10",
    sectionFilter: "All",
    totalMarks: questions.reduce((s, q) => s + q.marks, 0),
    questions,
  } as unknown as PersistedWorksheet;
}

/* ── (c) real-code consistency for one body ────────────────────────────────── */
async function replay(b: Body) {
  const S = `${b.kind}:${b.tag}`;
  const paper: Any = b.kind === "single" ? (b.body?.ok === false ? b.body : adaptSingle(b.body)) : b.body;
  const ws = worksheetFor(b, paper, sha(b.tag));
  H.gradeWorksheet.mockResolvedValue(clone(paper));
  const out: Any = await gradeWorksheetAndRecord(USER as never, ws, UPLOAD);

  if (paper?.ok === false) {
    // a failed grade carries no grade at all: nothing is recorded, nothing is scored
    check(S, "errorBody.nothingRecorded", miEntries().length === 0 && attemptIds().length === 0 && records().length === 0 && out.miOutcomes.length === 0, `mi ${miEntries().length}, attempts ${attemptIds().length}, records ${records().length}`);
    return;
  }
  const res: WorksheetGradeResponse = out.response;
  const results: Any[] = res.results;
  const o = oPaper(results);
  const allPending = res.gradedCount === 0;

  // (i) scorecard — the variant's marks ARE the paper's, and the rendered block sums to the loss
  const variant = worksheetScorecardVariant({ name: ws.title, code: "WS-G3V2", response: res, downloading: false, onRead: () => {}, onDownload: () => {} });
  const pm = paperMarksLost(results);
  check(S, "scorecard.marksLost=paperMarksLost=oracle", allPending ? variant.marksLost === null : !!pm && sameMarks(variant.marksLost?.byType, pm.byType) && ledgerOk(pm.byType, o.byType, o.floor) && variant.marksLost?.lost === o.lost, `${JSON.stringify(variant.marksLost?.byType)} vs grader ${JSON.stringify(o.byType)} · not-attempted floor ${o.floor}`);
  const sc = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
  const block = sc.container.querySelector('[data-testid="sc-marks-lost"]');
  if (!allPending && o.lost > 0) {
    const groups = Array.from(block?.querySelectorAll("[data-marks]") ?? []).reduce((s, e) => s + Number(e.getAttribute("data-marks")), 0);
    const rows = Array.from(sc.container.querySelectorAll('[data-group="not-attempted"][data-marks], [data-group="untyped"][data-marks]'))
      .filter((e) => !block?.contains(e))
      .reduce((s, e) => s + Number(e.getAttribute("data-marks")), 0);
    check(S, "scorecard.rendered.sumsToLost", !!block && Math.abs(r2(groups + rows) - o.lost) <= EPS, `groups ${groups} + rows ${rows} vs lost ${o.lost}`);
    const text = sc.container.textContent || "";
    check(S, "scorecard.rendered.inMarks", text.includes(MARKS_HEADING) && !text.includes(MISTAKES_BY_KIND_HEADING), "");
  } else {
    check(S, "scorecard.rendered.noMarksBlockWithoutLoss", block === null, "");
  }
  sc.unmount();

  // (ii) PDF — the header chips sum to the loss
  const pdf = render(createElement(WorksheetGradedPrintDoc, { ws, response: res, name: ws.title, code: "WS-G3V2", coaching: "" }));
  const chips = pdf.container.querySelector('[data-testid="gp-marks-chips"]');
  if (o.lost > 0) {
    const sum = Array.from(chips?.querySelectorAll("[data-marks]") ?? []).reduce((s, e) => s + Number(e.getAttribute("data-marks")), 0);
    check(S, "pdf.chips.sumsToLost", !!chips && Math.abs(r2(sum) - o.lost) <= EPS, `chips ${sum} vs lost ${o.lost}`);
  } else {
    check(S, "pdf.chips.noneWithoutLoss", chips === null, "");
  }
  pdf.unmount();

  // (iii) MI — one entry per question lost TO ITS WORK, carrying that question's marks
  const entries = miEntries();
  const byQ = new Map<number, Any>(entries.map((e) => [qOfId(e.questionId), e]));
  const wantQ = results.filter(oWantsEntry).map((r) => Number(r.qNumber)).sort((a, z) => a - z);
  const gotQ = [...byQ.keys()].sort((a, z) => a - z);
  check(S, "mi.entries=questionsLostToWork", JSON.stringify(gotQ) === JSON.stringify(wantQ) && entries.length === byQ.size, `got ${JSON.stringify(gotQ)} want ${JSON.stringify(wantQ)}`);
  for (const r of results) {
    const n = Number(r.qNumber);
    if (!oGraded(r)) check(S, `Q${n}.mi.noEntry.notGraded`, !byQ.has(n), "");
    else if (oLost(r) > 0 && !oWantsEntry(r)) check(S, `Q${n}.mi.noEntry.onlyNotAttempted`, !byQ.has(n), "");
  }
  for (const e of entries) {
    const r = results.find((x) => Number(x.qNumber) === qOfId(e.questionId));
    const qm = questionMarksLost(r);
    check(S, `Q${qOfId(e.questionId)}.mi.marksLostByType=questionMarksLost`, e.marksLostByTypeVersion === 1 && sameMarks(e.marksLostByType, qm) && ledgerOk(qm, oParts(r), oNotAttemptedFloor(r)) && Math.abs(Number(e.marksLost) - oLost(r)) <= EPS, `${JSON.stringify(e.marksLostByType)} vs ${JSON.stringify(qm)} · grader ${JSON.stringify(oParts(r))} · floor ${oNotAttemptedFloor(r)}`);
  }
  // the attempt twin: every GRADED question, and nothing else
  const wantAttempts = results.filter(oGraded).map((r) => `ws:${ws.worksheetId}:q${r.qNumber}`).sort();
  check(S, "attempts=gradedQuestions", JSON.stringify([...attemptIds()].sort()) === JSON.stringify(wantAttempts), `${attemptIds().length} vs ${wantAttempts.length}`);

  if (entries.length === 0) return;
  // (iv) Me — the split over the stored entries equals the owner's groups of their marks
  const withEntries = results.filter((r) => byQ.has(Number(r.qNumber)));
  const rung = {
    key: "paper",
    label: "Paper",
    marksAvailable: r2(withEntries.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0)),
    marksScored: r2(withEntries.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0)),
  };
  const split = splitPaperMarks(rung as never, entries as never);
  const summed = entries.reduce((acc: Marks, e: Any) => addM(acc, oBuckets(e.marksLostByType) ?? zero()), zero());
  const g = groupMarks(summed);
  const oG = { knowledge: summed.conceptual, technique: summed.presentation, careless: r2(summed.calculation + summed.silly) };
  const near = (a: number, b: number) => Math.abs(a - b) < 0.051; // Me rounds to 0.1
  check(
    S,
    "me.split=groupMarks(entryMarks)",
    !!split && split.splitKnown && near(split.knowledge, g.knowledge) && near(split.technique, g.technique) && near(split.careless, g.careless) && near(split.notAttempted, summed.unattempted) && near(g.knowledge, oG.knowledge) && near(g.technique, oG.technique) && near(g.careless, oG.careless),
    `split ${JSON.stringify(split)} vs ${JSON.stringify(g)}`,
  );

  // (v) Tutor — the insight's top type is the type that cost the most marks
  H.getMistakeLogs.mockResolvedValue(clone(entries));
  const ins = await getMistakeInsights(UID, 30);
  const want = oTopType(entries);
  check(S, "tutor.topMistakeType=mostMarksLost", ins.topMistakeType === want && sameMarks(ins.marksLostByType as Marks, summed), `${ins.topMistakeType} (${ins.topMistakeBasis}) vs ${want}`);
}

/* ── (b)+(c) over the GOLDEN bodies ────────────────────────────────────────── */
if (!GOLDEN) {
  describe("G3-v2 · golden source", () => {
    it(`FAILS LOUDLY: the golden v2 responses are missing — expected ${GOLDEN_MANIFEST} and ${GOLDEN_V2}${process.env.LT_G3_GOLDEN_DIR ? " (from LT_G3_GOLDEN_DIR)" : " (the in-repo default; GRADER-CORE-1 PR-2 lands them there)"}`, () => {
      throw new Error(`[G3-v2] golden v2 responses missing at ${GOLDEN_DIR} — this gate never skips. Set LT_G3_GOLDEN_DIR or land the GRADER-CORE-1 PR-2 outputs.`);
    });
  });
} else {
  const G = GOLDEN;
  describe("G3-v2 · golden manifest", () => {
    it("every manifest file exists, every v2 file on disk is in the manifest, and each case's question is in its body", () => {
      const i0 = mark();
      const named = new Set(G.files.map((f) => f.file));
      const missing = G.files.filter((f) => !existsSync(path.join(GOLDEN_V2, f.file))).map((f) => f.file);
      const unnamed = G.onDisk.filter((f) => !named.has(f));
      check("manifest", "manifest.filesExist", missing.length === 0, JSON.stringify(missing));
      check("manifest", "manifest.coversDisk", unnamed.length === 0, JSON.stringify(unnamed));
      check("manifest", "manifest.nonEmpty", G.files.length > 0 && G.sets.length > 0 && G.singles.length > 0, `${G.files.length} files`);
      for (const f of G.files.filter((x) => x.kind === "set")) {
        const body: Any = G.sets.find((s) => s.files.includes(f.file))?.body;
        if (body?.ok === false) continue;
        check("manifest", `${f.file}.caseQuestionPresent`, !!body && (body.results ?? []).some((r: Any) => r.qNumber === f.qNumber), `q${f.qNumber}`);
      }
      expect(failedSince(i0)).toEqual([]);
    });
  });

  describe("G3-v2 · (b) marks on every golden body (pure)", () => {
    it("every graded question: shown in marks that sum to the loss; every paper: totals per the v2 rule", () => {
      const i0 = mark();
      for (const s of G.sets) {
        if (s.body?.ok === false) {
          check(`set:${s.tag}`, "errorBody.noResults", !Array.isArray(s.body.results), String(s.body.error ?? ""));
          continue;
        }
        for (const q of s.body.results) checkQuestion(`set:${s.tag}:Q${q.qNumber}`, q);
        checkPaper(`set:${s.tag}`, s.body);
      }
      for (const s of G.singles) {
        if (s.body?.ok === false) continue;
        checkQuestion(`single:${s.tag}`, s.body);
        checkPaper(`single:${s.tag}`, adaptSingle(s.body));
      }
      expect(failedSince(i0)).toEqual([]);
    });
  });

  describe("G3-v2 · (c) real code — every distinct golden SET body", () => {
    it.each(G.sets.map((s) => [s.tag, s] as const))("%s — scorecard = PDF = MI = Me = tutor", async (_tag, s) => {
      const i0 = mark();
      await replay(s);
      expect(failedSince(i0)).toEqual([]);
    }, 30000);
  });

  describe("G3-v2 · (c) real code — every golden SINGLE (adapted as Check & Improve adapts it)", () => {
    it.each(G.singles.map((s) => [s.tag, s] as const))("%s — scorecard = PDF = MI = Me = tutor", async (_tag, s) => {
      const i0 = mark();
      await replay(s);
      expect(failedSince(i0)).toEqual([]);
    }, 30000);
  });
}

/* ── (d) the CURATED v2 fixtures through (b) and (c) ───────────────────────── */
describe("G3-v2 · (d) curated v2 fixtures", () => {
  it("each is labelled SYNTHETIC with its contract source", () => {
    const i0 = mark();
    for (const b of [CURATED_SET, CURATED_RECLASS, ...CURATED_SINGLES.map((x) => x.fx)]) {
      check("curated", "source.synthetic", /^SYNTHETIC/.test(b.source) && b.source.includes("lane/grader-core-1 @e5f81a3a server/grading/postprocess.cjs"), String(b.source).slice(0, 80));
    }
    expect(failedSince(i0)).toEqual([]);
  });

  it("the owner-paper shape is the shape it claims: 10 questions, Maths + Science, Q6 not attempted, Q7 withdrawn + a mistake, a rubric, a mismatch, an unread option", () => {
    const r: Any[] = CURATED_SET.body.results;
    const by = (n: number) => r.find((x) => x.qNumber === n);
    expect(r).toHaveLength(10);
    expect(new Set(Object.values(CURATED_SET.trueSubjects))).toEqual(new Set(["Maths", "Science"]));
    expect(by(6).annotatedSteps.map((s: Any) => s.status)).toEqual(["unattempted"]);
    expect(by(6).marksLostByType.unattempted).toBe(by(6).totalMarks);
    expect(by(7).annotatedSteps.some((s: Any) => s.status === "withdrawn")).toBe(true);
    expect(by(7).marksAwarded).toBeLessThan(by(7).totalMarks);
    expect(r.filter((x) => Array.isArray(x.rubric)).length).toBeGreaterThan(0);
    expect(by(4)).toMatchObject({ answerMismatch: true, marksAwarded: 0, annotatedSteps: [], couldNotRead: false });
    expect(by(2)).toMatchObject({ couldNotRead: true, objectiveResolved: false });
  });

  it("the 'missing'-step reclass (L3 on v2): a missing step's untyped mark is shown as Not attempted; a typed slip beside it stays a mistake with its MI entry; a missing-only loss writes none", async () => {
    const S = "curated:missing-step-reclass";
    const i0 = mark();
    const r: Any[] = CURATED_RECLASS.body.results;
    // the grader's ledger, as it arrives (the premise): the missing steps are filed under `untyped`
    check(S, "premise.graderFiledMissingAsUntyped", r[0].marksLostByType.untyped === 1 && r[0].marksLostByType.calculation === 1 && r[1].marksLostByType.untyped === 1 && r.every((q) => q.marksLostByType.unattempted === 0), "");
    // what a student is shown — written out by hand from the owner's rule, not computed
    const want: Record<number, Marks> = {
      1: { ...zero(), calculation: 1, unattempted: 1 },
      2: { ...zero(), unattempted: 1 },
    };
    for (const q of r) check(S, `Q${q.qNumber}.shown`, sameMarks(questionMarksLost(q), want[q.qNumber]), `${JSON.stringify(questionMarksLost(q))} vs ${JSON.stringify(want[q.qNumber])}`);
    check(S, "paper.shown", sameMarks(paperMarksLost(r)?.byType, { ...zero(), calculation: 1, unattempted: 2 }), JSON.stringify(paperMarksLost(r)?.byType));
    // through the real worksheet path: Q1 keeps its entry (the slip), Q2 writes none; the scorecard
    // and the PDF show Not attempted 2 and no "reason not recorded"
    const ws = paperFromRequest(CURATED_RECLASS, "reclass");
    H.gradeWorksheet.mockResolvedValue(clone(CURATED_RECLASS.body));
    const out: Any = await gradeWorksheetAndRecord(USER as never, ws, UPLOAD);
    const entries = miEntries();
    check(S, "mi.onlyTheSlip", entries.length === 1 && qOfId(entries[0].questionId) === 1, JSON.stringify(entries.map((e) => e.questionId)));
    check(S, "mi.Q1.marks", !!entries[0] && sameMarks(entries[0].marksLostByType, want[1]) && entries[0].mistakeCounts?.calculation === 1, JSON.stringify(entries[0]?.marksLostByType));
    check(S, "attempts.both", JSON.stringify(attemptIds().map(qOfId).sort()) === JSON.stringify([1, 2]), JSON.stringify(attemptIds()));
    const variant = worksheetScorecardVariant({ name: "Reclass", code: "WS-RC", response: out.response, downloading: false, onRead: () => {}, onDownload: () => {} });
    const sc = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
    const na = sc.container.querySelector('[data-group="not-attempted"][data-marks]');
    check(S, "scorecard.notAttempted=2", Number(na?.getAttribute("data-marks")) === 2 && sc.container.querySelector('[data-group="untyped"][data-marks]') === null, `${na?.getAttribute("data-marks")}`);
    sc.unmount();
    const pdf = render(createElement(WorksheetGradedPrintDoc, { ws, response: out.response, name: "Reclass", code: "WS-RC", coaching: "" }));
    const chip = pdf.container.querySelector('[data-testid="gp-marks-chips"] [data-group="not-attempted"]');
    check(S, "pdf.notAttempted=2", Number(chip?.getAttribute("data-marks")) === 2 && pdf.container.querySelector('[data-testid="gp-marks-chips"] [data-group="untyped"]') === null, `${chip?.getAttribute("data-marks")}`);
    pdf.unmount();
    expect(failedSince(i0)).toEqual([]);
  });

  it("(b) marks: every graded question and every paper", () => {
    const i0 = mark();
    for (const b of curatedBodies) {
      if (b.kind === "set") {
        for (const q of b.body.results) checkQuestion(`curated-set:${b.tag}:Q${q.qNumber}`, q);
        checkPaper(`curated-set:${b.tag}`, b.body);
      } else {
        checkQuestion(`curated-single:${b.tag}`, b.body);
        checkPaper(`curated-single:${b.tag}`, adaptSingle(b.body));
      }
    }
    expect(failedSince(i0)).toEqual([]);
  });

  it.each(curatedBodies.map((b) => [b.tag, b] as const))("(c) real code · %s", async (_tag, b) => {
    const i0 = mark();
    await replay(b);
    expect(failedSince(i0)).toEqual([]);
  }, 30000);
});

/* ── (e) NOTHING RECORDED ANYWHERE ─────────────────────────────────────────── */
function paperFromRequest(fx: Any, id: string): PersistedWorksheet {
  return worksheetFor(
    { tag: id, kind: "set", body: fx.body, files: [], subjectOf: (n: number) => (fx.trueSubjects?.[String(n)] === "Science" ? "Science" : "Maths"), request: fx.request, trueChapters: fx.trueChapters },
    fx.body,
    id,
  );
}
const NOT_GRADED_Q = [2, 4]; // Q2 unread option · Q4 answer does not match
const GRADED_Q = [1, 3, 5, 6, 7, 8, 9, 10];
const ENTRY_Q = [3, 5, 7, 9, 10]; // lost marks to the work (Q1/Q8 full marks, Q6 not attempted)

function expectNothingRecordedFor(S: string, ns: string, id: string) {
  const entries = miEntries();
  const qs = entries.map((e) => qOfId(e.questionId)).sort((a, z) => a - z);
  for (const n of NOT_GRADED_Q) {
    check(S, `Q${n}.noMiEntry`, !entries.some((e) => e.questionId === `${ns}:${id}:q${n}`), "");
    check(S, `Q${n}.noAttempt`, !attemptIds().includes(`${ns}:${id}:q${n}`), JSON.stringify(attemptIds()));
  }
  check(S, "siblings.miEntries", JSON.stringify(qs) === JSON.stringify(ENTRY_Q), JSON.stringify(qs));
  check(S, "siblings.attempts", JSON.stringify(attemptIds().map(qOfId).sort((a, z) => a - z)) === JSON.stringify(GRADED_Q), JSON.stringify(attemptIds()));
  // unattempted → no MI type; withdrawn → never in MI stepDetails or marks
  const q6 = entries.find((e) => qOfId(e.questionId) === 6);
  check(S, "Q6.notAttempted.noEntry", !q6, "");
  const q10 = entries.find((e) => qOfId(e.questionId) === 10);
  check(S, "Q10.unattempted.noType", !!q10 && totalOf(q10.mistakeCounts) === 1 && q10.mistakeCounts.calculation === 1 && !(q10.stepDetails ?? []).some((d: Any) => d.stepNumber === 4) && q10.marksLostByType?.unattempted === 1, JSON.stringify({ c: q10?.mistakeCounts, d: q10?.stepDetails }));
  const q7 = entries.find((e) => qOfId(e.questionId) === 7);
  check(S, "Q7.withdrawn.notInMi", !!q7 && !(q7.stepDetails ?? []).some((d: Any) => d.stepNumber === 1) && q7.marksLost === 1.5 && sumMarks(q7.marksLostByType) === 1.5 && q7.mistakeCounts.conceptual === 1 && q7.mistakeCounts.presentation === 1, JSON.stringify({ d: q7?.stepDetails, m: q7?.marksLostByType }));
}

describe("G3-v2 · (e) nothing recorded anywhere for a question that was not graded", () => {
  it("the owner's copy is the module's, verbatim (em dash included)", () => {
    const i0 = mark();
    check("copy", "ANSWER_MISMATCH_COPY", ANSWER_MISMATCH_COPY === OWNER_COPY["answer-mismatch"] && ANSWER_MISMATCH_COPY.includes("—"), ANSWER_MISMATCH_COPY);
    check("copy", "COULD_NOT_READ_COPY", COULD_NOT_READ_COPY === OWNER_COPY["could-not-read"] && COULD_NOT_READ_COPY.includes("—"), COULD_NOT_READ_COPY);
    check("copy", "UNREAD_OPTION_COPY", UNREAD_OPTION_COPY === OWNER_COPY["unread-option"], UNREAD_OPTION_COPY);
    check("copy", "NOT_ATTEMPTED.label", NOT_ATTEMPTED.label === "Not attempted", NOT_ATTEMPTED.label);
    check("copy", "UNTYPED_MARKS_LABEL", UNTYPED_MARKS_LABEL === "Marks lost, reason not recorded", UNTYPED_MARKS_LABEL);
    expect(failedSince(i0)).toEqual([]);
  });

  it("WORKSHEET — the owner paper: Q2/Q4 get no entry and no attempt, their siblings do; the scorecard and the PDF name them in the owner's words", async () => {
    const S = "nothing:worksheet";
    const i0 = mark();
    const ws = paperFromRequest(CURATED_SET, "nr-ws");
    H.gradeWorksheet.mockResolvedValue(clone(CURATED_SET.body));
    const out: Any = await gradeWorksheetAndRecord(USER as never, ws, UPLOAD);
    expectNothingRecordedFor(S, "ws", ws.worksheetId);
    check(S, "miOutcomes.gradedOnly", JSON.stringify(out.miOutcomes.map((m: Any) => m.qNumber)) === JSON.stringify(GRADED_Q), JSON.stringify(out.miOutcomes));
    await waitFor(() => expect(records().length).toBeGreaterThan(0));
    const rec = records()[0];
    check(S, "record.gradedTotalsOnly", !!rec && rec.marksAwarded === 12.5 && rec.marksTotal === 25, JSON.stringify({ a: rec?.marksAwarded, t: rec?.marksTotal }));
    // the scorecard: the mismatch is NAMED with the owner's sentence; the unread one is counted
    const variant = worksheetScorecardVariant({ name: "Owner paper", code: "WS-NR", response: out.response, downloading: false, onRead: () => {}, onDownload: () => {} });
    const sc = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
    const named = Array.from(sc.container.querySelectorAll('[data-grade-state="answer-mismatch"]')).map((e) => e.textContent);
    check(S, "scorecard.mismatch.namedVerbatim", JSON.stringify(named) === JSON.stringify([`Q4: ${OWNER_COPY["answer-mismatch"]}`]), JSON.stringify(named));
    check(S, "scorecard.unread.counted", (sc.container.textContent || "").includes("1 question couldn’t be read"), "");
    sc.unmount();
    // the graded sheet / PDF: each not-graded question named, with its state and the owner's sentence
    const pdf = render(createElement(WorksheetGradedPrintDoc, { ws, response: out.response, name: "Owner paper", code: "WS-NR", coaching: "" }));
    for (const [state, copy] of [["unread-option", OWNER_COPY["unread-option"]], ["answer-mismatch", OWNER_COPY["answer-mismatch"]]] as const) {
      const note = pdf.container.querySelector(`.lt-gp__pendnote[data-grade-state="${state}"]`);
      check(S, `pdf.${state}.namedVerbatim`, !!note && (note.textContent || "").includes(copy), note?.textContent ?? "∅");
    }
    pdf.unmount();
    expect(failedSince(i0)).toEqual([]);
  });

  it("ROBUSTNESS — a stray type on a crossed-out or not-attempted step never reaches MI", async () => {
    const S = "nothing:worksheet-stray-types";
    const i0 = mark();
    const body = clone(CURATED_SET.body);
    for (const r of body.results) for (const s of r.annotatedSteps ?? []) if (s.status === "withdrawn" || s.status === "unattempted") s.mistakeType = "conceptual";
    const ws = paperFromRequest(CURATED_SET, "nr-stray");
    H.gradeWorksheet.mockResolvedValue(body);
    await gradeWorksheetAndRecord(USER as never, ws, UPLOAD);
    expectNothingRecordedFor(S, "ws", ws.worksheetId);
    expect(failedSince(i0)).toEqual([]);
  });

  it("CHAPTER TEST and FULL MOCK — the same paper through the real grade services", async () => {
    const i0 = mark();
    for (const [S, ns, run] of [
      [
        "nothing:chapter-test",
        "ct",
        async (paper: PersistedWorksheet) =>
          gradeChapterTestUpload({ user: USER as never, paper, code: "CT-G3V2", subject: "maths", topicKey: "real-numbers", objective: scoreObjectiveSection([], {}), subjectiveQuestions: paper.questions, upload: UPLOAD }),
      ],
      [
        "nothing:full-mock",
        "fm",
        async (paper: PersistedWorksheet) =>
          gradeFullMockUpload({ user: USER as never, paper, code: "FM-G3V2", subject: "maths", objective: scoreObjectiveSection([], {}), subjectiveQuestions: paper.questions, upload: UPLOAD }),
      ],
    ] as const) {
      resetWorld();
      const paper = paperFromRequest(CURATED_SET, `nr-${ns}`);
      H.gradeWorksheet.mockResolvedValue(clone(CURATED_SET.body));
      const out: Any = await run(paper);
      check(S, "graded.ok", out.ok === true, String(out.response?.error ?? ""));
      expectNothingRecordedFor(S, ns, paper.worksheetId);
      const t = paperGradedTotals(out.response.results);
      check(S, "unified.totals.v2Rule", out.response.gradedMarksAwarded === 12.5 && out.response.gradedMarksTotal === 25 && out.response.pendingCount === 2 && t.notGradedCount === 2, JSON.stringify({ a: out.response.gradedMarksAwarded, t: out.response.gradedMarksTotal, p: out.response.pendingCount }));
      expect(failedSince(i0)).toEqual([]);
    }
  });

  it("SINGLES — couldNotRead and answerMismatch through the Check & Improve adapter: no entry, no attempt, all pending, the scorecard says why", async () => {
    const i0 = mark();
    for (const name of ["could-not-read.single.json", "answer-mismatch.single.json"]) {
      const S = `nothing:single:${name}`;
      resetWorld();
      const fx = CURATED(name);
      const b = curatedBodies.find((x) => x.tag === `curated:${name}`)!;
      const paper = adaptSingle(fx.body);
      const ws = worksheetFor(b, paper, `nr-${sha(name)}`);
      H.gradeWorksheet.mockResolvedValue(clone(paper));
      const out: Any = await gradeWorksheetAndRecord(USER as never, ws, UPLOAD);
      check(S, "noMiEntry", miEntries().length === 0, `${miEntries().length}`);
      check(S, "noAttempt", attemptIds().length === 0, JSON.stringify(attemptIds()));
      check(S, "allPending", out.response.gradedCount === 0 && out.response.pendingCount === 1 && out.response.gradedMarksTotal === 0, JSON.stringify({ g: out.response.gradedCount, p: out.response.pendingCount }));
      const variant = worksheetScorecardVariant({ name: "Single", code: "CI-NR", response: out.response, downloading: false, onRead: () => {}, onDownload: () => {} });
      const sc = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
      const text = sc.container.textContent || "";
      if (fx.body.answerMismatch === true) check(S, "scorecard.allPending.mismatchVerbatim", variant.allPending?.title === OWNER_COPY["answer-mismatch"] && text.includes(OWNER_COPY["answer-mismatch"]), String(variant.allPending?.title));
      else check(S, "scorecard.allPending.unreadable", !!variant.allPending && !text.includes(OWNER_COPY["answer-mismatch"]), String(variant.allPending?.title));
      check(S, "scorecard.noScoreNoMarks", sc.container.querySelector('[data-testid="sc-marks-lost"]') === null && sc.container.querySelector(".lt-sc__big") === null, "");
      sc.unmount();
      expect(failedSince(i0)).toEqual([]);
    }
  });

  it("THE FRONT DOOR — recordMistake itself records nothing for a not-graded grade and never removes the earlier entry", async () => {
    const i0 = mark();
    const mistake = CURATED("withdrawn-rubric.single.json");
    const unreadOption = { ...CURATED("could-not-read.single.json").body, objective: true, objectiveResolved: false, totalMarks: 1 };
    for (const [label, body] of [
      ["answer-mismatch", CURATED("answer-mismatch.single.json").body],
      ["could-not-read", CURATED("could-not-read.single.json").body],
      ["unread-option", unreadOption],
    ] as const) {
      const S = `nothing:front-door:${label}`;
      resetWorld();
      const ctx = { subject: "Science", topic: "Motion", question: mistake.request.question, surface: "check-improve", submissionId: `CI-G3V2-${label}` };
      const first = await recordMistake(USER as never, clone(mistake.body), ctx);
      const before = JSON.stringify(miEntries());
      check(S, "earlierEntry.logged", first.outcome === "logged" && miEntries().length === 1, first.outcome);
      // the SAME submission re-graded and NOT graded this time: nothing new is known about the work
      const again = await recordMistake(USER as never, clone(body), ctx);
      check(S, "sameSubmission.skippedNotGraded", again.outcome === "skipped-not-graded" && !again.cleared, JSON.stringify(again));
      check(S, "sameSubmission.entryUntouched", JSON.stringify(miEntries()) === before, `${miEntries().length} entries`);
      // a NEW submission that was not graded writes nothing
      const fresh = await recordMistake(USER as never, clone(body), { ...ctx, submissionId: `CI-G3V2-${label}-new` });
      check(S, "newSubmission.nothingWritten", fresh.outcome === "skipped-not-graded" && miEntries().length === 1, `${fresh.outcome}, ${miEntries().length} entries`);
      check(S, "copy=owner", gradeStateCopy(body) === OWNER_COPY[label], String(gradeStateCopy(body)));
      expect(failedSince(i0)).toEqual([]);
    }
  });
});

/* ── (f) THE GATE ──────────────────────────────────────────────────────────── */
if (GOLDEN) {
  const G = GOLDEN;
  describe("G3-v2 · the gate", () => {
    it("every check passed on 100% of the v2 bodies", () => {
      const pass = LEDGER.filter((c) => c.pass).length;
      const total = LEDGER.length;
      const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
      const inMarks = LEDGER.filter((c) => c.id === "fourType.inMarks");
      const everyLost = LEDGER.filter((c) => c.id === "everyLostMarkHasAType");
      const a = inMarks.filter((c) => c.pass).length;
      const c2 = everyLost.filter((c) => c.pass).length;
      // LIVENESS — a gate that saw nothing cannot have checked anything.
      expect(G.sets.length).toBeGreaterThan(0);
      expect(G.singles.length).toBeGreaterThan(0);
      expect(inMarks.length).toBeGreaterThan(G.singles.length);
      expect(everyLost.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(1000);
      console.info(
        `[G3-v2] checks ${pass}/${total} (${pct(pass, total)}%) · ` +
          `fourType.inMarks ${pct(a, inMarks.length)}% (${a}/${inMarks.length}) · ` +
          `everyLostMarkHasAType ${pct(c2, everyLost.length)}% (${c2}/${everyLost.length}) · ` +
          `source ${path.basename(GOLDEN_DIR)} (${G.files.length} v2 files: ${G.sets.length} distinct set bodies, ${G.singles.length} singles) + ${curatedBodies.length} curated`,
      );
      expect(LEDGER.filter((c) => !c.pass).map((c) => `${c.surface} ${c.id}: ${c.detail}`)).toEqual([]);
      expect(pass).toBe(total);
    });
  });
}
