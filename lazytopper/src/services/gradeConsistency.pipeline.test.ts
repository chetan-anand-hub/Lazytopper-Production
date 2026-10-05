/**
 * G3 · SCORECARD-MI-1 PR-1 — the grade-consistency pipeline, PORTED.
 *
 * WHAT THIS IS. The GRADER-AUDIT-1 S4/S6 consistency pipeline (Desktop/diff/grader-audit-1/
 * s4/pipeline/s4pipeline.s4.test.ts), brought into the repo and pointed at a SMALL curated set
 * of the audit's STORED grader outputs (src/services/__fixtures__/gradeConsistency/*.json —
 * each fixture records its `source` path) plus one SYNTHETIC fixture shaped on the owner's
 * real paper (owner-anomaly-01, labelled synthetic in its own `source`).
 *
 * REAL CODE, NOT MIRRORS. Unlike S4 (which MIRRORED the C&I page's MI loop), Check & Improve
 * is RENDERED here — the real page, the real scorecard, the real graded sheet, the real MI
 * front door and log store — with only the network (aiClient grade/detect), Firestore (an
 * in-memory map) and the session/subscription hooks replaced. Worksheet and Chapter Test run
 * through their real grade services.
 *
 * THE GATE. Every check that does NOT need `marksLostByType` must pass on 100% of own-surface
 * renderings (spec §3 G3; brief D9): wording/grouping, the not-attempted state where today's
 * data marks it, per-question chapter, one MI entry per re-grade, no type on full marks,
 * coaching true to marks, MI = scorecard = record. The two MARKS checks (`fourType.inMarks`,
 * `everyLostMarkHasAType`) are measured and REPORTED as a baseline only — they become PR-2's
 * gate once GRADER-CORE-1 ships `marksLostByType`.
 *
 * FORMERLY HELD, NOW IN THE 100% (SCORECARD-MI-1 PR-2 — owner ruling 2026-10-05 approved the gate
 * amendments): ONE ATTEMPT per re-grade on every replayed surface (H1 — the attempt key is the
 * submission identity, latest wins), and the sidebar MI card's checked-count = the GRADED answers,
 * never the MI log entries (H3).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { readFileSync } from "node:fs";
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
    detectQuestion: vi.fn(),
    checkSolutionImage: vi.fn(),
    gradeWorksheet: vi.fn(),
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
  firebaseProjectId: "g3-in-memory",
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
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
  };
});

import DesktopCheckImprovePage from "../pages/desktop/DesktopCheckImprovePage";
import { recordMistake } from "./mistakeIntelligence";
import { gradeWorksheetAndRecord } from "./worksheetGradeService";
import { gradeChapterTestUpload, scoreObjectiveSection } from "./chapterTestGradeService";
import { setActiveProgressUser } from "./studentProgressStore";
import { aggregateFourType } from "../components/results/scorecardVariants";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";
import { hashAttemptString } from "./attemptDedupKey";
import { removeStableMistakeLog } from "./mistakeLogService";
import { desktopTopicBySlug } from "../lib/desktop/topics";
import { marksLostToWork } from "../lib/mistakeDisplay";
import { recordAttempt } from "./practiceInsights";
import { computeMiCardSummary } from "../components/desktop/MistakeIntelCard";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import type { WorksheetGradeResponse } from "../ai/aiClient";

/* ── fixtures ───────────────────────────────────────────────────────────────── */
type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = (name: string): Any =>
  JSON.parse(readFileSync(path.join(HERE, "__fixtures__", "gradeConsistency", `${name}.json`), "utf8"));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const UID = "g3-student";
const USER = { uid: UID, isLocalSession: false, email: null, phoneNumber: null, displayName: "G3 Student" };
const TYPES = ["conceptual", "calculation", "silly", "presentation"] as const;

/** The owner's ruling, written out INDEPENDENTLY of lib/mistakeDisplay — the oracle. */
const OWNER_GROUP: Record<string, "knowledge" | "technique" | "careless"> = {
  conceptual: "knowledge",
  presentation: "technique",
  calculation: "careless",
  silly: "careless",
};
const GROUP_LABEL = { knowledge: "Knowledge gap", technique: "Exam technique", careless: "Careless" } as const;
const GROUP_ORDER = ["knowledge", "technique", "careless"] as const;
/** Labels that may no longer appear anywhere a student reads (B3/G4, GA-32, GA-24, P8). */
const LEGACY = /Where your marks went|Knowledge gaps — worth practising|Careless mark-loss|Careless slip\b|calculation slips|silly mistakes|Knowledge gap ×|Careless ×|Clean (work|sheet)|One-mark answers are marked/;

/* ── independent grade facts (no app code) ──────────────────────────────────── */
interface Facts {
  q: number;
  total: number;
  awarded: number;
  lost: number;
  shown: Record<string, number>;
  typedDeduct: Record<string, number>;
  missingSteps: number;
  notAttempted: boolean;
  couldNotRead: boolean;
}
function facts(r: Any, qNumber = r.qNumber ?? 1): Facts {
  const steps: Any[] = r.annotatedSteps ?? [];
  const total = Number(r.totalMarks) || 0;
  const awarded = Number(r.marksAwarded) || 0;
  const lost = Math.max(0, total - awarded);
  const stepCount: Record<string, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  const typedDeduct: Record<string, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const s of steps) {
    if (s.status === "missing") continue;
    if (TYPES.includes(s.mistakeType)) {
      stepCount[s.mistakeType] += 1;
      typedDeduct[s.mistakeType] += Number(s.marksDeducted) || 0;
    }
  }
  const shown: Record<string, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  if (!r.couldNotRead && lost > 0) {
    for (const t of TYPES) shown[t] = Math.max(Number(r.mistakeSummary?.[t]) || 0, stepCount[t]);
  }
  const missingSteps = steps.filter((s) => s.status === "missing").length;
  return {
    q: qNumber,
    total,
    awarded,
    lost,
    shown,
    typedDeduct,
    missingSteps,
    notAttempted: !r.couldNotRead && steps.length > 0 && awarded <= 0 && steps.every((s) => s.status === "missing"),
    couldNotRead: !!r.couldNotRead,
  };
}
const groupsOf = (counts: Record<string, number>) => {
  const g = { knowledge: 0, technique: 0, careless: 0 };
  for (const t of TYPES) g[OWNER_GROUP[t]] += counts[t] || 0;
  return g;
};
const sumShown = (fs: Facts[]) => {
  const out: Record<string, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const f of fs) for (const t of TYPES) out[t] += f.shown[t];
  return out;
};
const unit = (n: number) => `${n} ${n === 1 ? "mistake" : "mistakes"}`;

/* ── the check ledger ──────────────────────────────────────────────────────── */
interface Check {
  id: string;
  surface: string;
  pass: boolean;
  detail: string;
  marks?: boolean;
}
const LEDGER: Check[] = [];
function check(surface: string, id: string, pass: boolean, detail = "", marks = false) {
  LEDGER.push({ id, surface, pass, detail, marks });
}
/** The two MARKS checks — reported as a baseline, never gated in PR-1. */
function marksBaseline(surface: string, fs: Facts[], shownCounts: Record<string, number>) {
  const marksByType: Record<string, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const f of fs) for (const t of TYPES) marksByType[t] += f.typedDeduct[t];
  check(surface, "fourType.inMarks", TYPES.every((t) => Math.abs((shownCounts[t] || 0) - marksByType[t]) < 0.01), JSON.stringify({ shownCounts, marksByType }), true);
  for (const f of fs.filter((x) => !x.couldNotRead)) {
    const typed = TYPES.reduce((s, t) => s + f.typedDeduct[t], 0);
    check(surface, `Q${f.q}.everyLostMarkHasAType`, f.lost <= 0 || typed + 0.01 >= f.lost, `lost ${f.lost}, typed ${typed}`, true);
  }
}

/* ── store read-outs ───────────────────────────────────────────────────────── */
const docsUnder = (prefix: string) =>
  [...H.store.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/")).map(([p, d]) => ({ path: p, ...(d as Any) }));
const miEntries = () => docsUnder(`learnerProfiles/${UID}/mistakeLogs/`);
const records = () => docsUnder(`sessionRecords/${UID}/records/`);
// H1 — one durable attempt doc per SUBMISSION (its id is the submission identity).
const attempts = () => docsUnder(`practiceInsights/${UID}/attempts/`);

/* ── harness ───────────────────────────────────────────────────────────────── */
beforeEach(() => {
  H.store.clear();
  H.auto.n = 0;
  window.localStorage.clear();
  setActiveProgressUser(UID);
  H.auth = { user: USER, loading: false };
  H.detectQuestion.mockReset();
  H.checkSolutionImage.mockReset();
  H.gradeWorksheet.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCheckImprove() {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: ["/check-improve"] },
      createElement(Routes, null, createElement(Route, { path: "/check-improve", element: createElement(DesktopCheckImprovePage) })),
    ),
  );
}

async function readQuestion(text: string) {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalled());
}

async function pressGrade() {
  const grade = await screen.findByRole("button", { name: /Grade my answer/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
}

function bodyText() {
  return (document.body.textContent || "").replace(/\s+/g, " ");
}

/* ── C&I MULTI — rendered ──────────────────────────────────────────────────── */
async function runCiMulti(name: string) {
  const fx = FIX(name);
  const qs: Any[] = fx.request.questions;
  const chapterOf = (n: number) => String(fx.trueChapters?.[String(n)] ?? "");
  H.detectQuestion.mockImplementation(async (req: { question?: string }) => {
    const hit = qs.find((q) => q.questionText === req.question);
    if (hit) return { ok: true, detectedTopic: chapterOf(hit.qNumber) || null, detectedSubject: null };
    return {
      ok: true,
      detectedMarks: qs[0].marks,
      detectedSubject: fx.request.subject,
      detectedTopic: chapterOf(qs[0].qNumber) || null,
      marksSource: "stated",
      questions: qs.map((q) => ({ questionNumber: q.qNumber, questionText: q.questionText, marks: q.marks, marksSource: "stated", objective: q.objective })),
    };
  });
  H.gradeWorksheet.mockResolvedValue(clone(fx.body));
  const { container } = renderCheckImprove();
  await readQuestion("Whole question paper");
  const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
  fireEvent.change(answerInput, { target: { files: [new File(["png"], "answers.png", { type: "image/png" })] } });
  await pressGrade();
  return { fx, qs, chapterOf, container };
}

describe("G3 · Check & Improve, whole paper (rendered)", () => {
  it.each(["owner-anomaly-01-shape", "p4-cm2-multi"])("%s — every non-marks check holds; marks measured as a baseline", async (name) => {
    const S = `ci-multi:${name}`;
    const { fx, qs, chapterOf } = await runCiMulti(name);
    const fs: Facts[] = fx.body.results.map((r: Any) => facts(r));
    const expectedEntries = fs.filter((f) => !f.couldNotRead && f.lost > 0 && !f.notAttempted);
    await waitFor(() => expect(miEntries()).toHaveLength(expectedEntries.length), { timeout: 8000 });
    await waitFor(() => expect(records()).toHaveLength(1));

    // ── wording: no legacy label anywhere on the page (scorecard + graded view)
    fireEvent.click(screen.getByRole("button", { name: "Read on screen" }));
    await waitFor(() => expect(document.querySelector(".lt-cigp")).not.toBeNull());
    const text = bodyText();
    check(S, "wording.noLegacyLabel", !LEGACY.test(text), (text.match(LEGACY) ?? [""])[0]);

    // ── grouping: scorecard = the owner's groups over the shown counts
    const shown = sumShown(fs);
    const g = groupsOf(shown);
    const subs = Array.from(document.querySelectorAll(".lt-sc__gsub")).map((e) => e.textContent);
    check(S, "scorecard.groups=owner", JSON.stringify(subs) === JSON.stringify(GROUP_ORDER.map((k) => `${GROUP_LABEL[k]} · ${unit(g[k])}`)), JSON.stringify(subs));
    const pdfChips = Array.from(document.querySelectorAll(".lt-cigp__chip[data-group]")).map((e) => e.textContent);
    check(S, "pdf.chips=scorecard.groups", JSON.stringify(pdfChips) === JSON.stringify(GROUP_ORDER.filter((k) => g[k] > 0).map((k) => `${GROUP_LABEL[k]} · ${unit(g[k])}`)), JSON.stringify(pdfChips));

    // ── not attempted: every "missing" step reads Not attempted, none carries "−N"
    const missing = fs.reduce((s, f) => s + f.missingSteps, 0);
    const naBadges = Array.from(document.querySelectorAll(".lt-cigp__stbadge--na")).filter((e) => e.textContent === "Not attempted");
    check(S, "pdf.notAttemptedState", naBadges.length === missing, `badges ${naBadges.length} vs missing steps ${missing}`);
    const naWithDeduction = naBadges.filter((b) => (b.closest(".lt-cigp__stephead")?.textContent || "").includes("−"));
    check(S, "pdf.notAttempted.noDeduction", naWithDeduction.length === 0, `${naWithDeduction.length} carry −N`);

    // ── per-question chapter: each MI entry under ITS OWN chapter (GA-16)
    const code = records()[0].id;
    for (const f of expectedEntries) {
      const e = miEntries().find((x) => x.questionId === `ci:${code}:q${f.q}`);
      const want = desktopTopicBySlug(chapterOf(f.q));
      check(S, `Q${f.q}.mi.ownChapter`, !!e && !!want && e.topic === want.name && e.subject === want.subject, `${e?.topic}/${e?.subject} vs ${want?.name}/${want?.subject}`);
    }
    // ── no type on full marks / not attempted: those questions write NO MI entry
    for (const f of fs.filter((x) => !x.couldNotRead && (x.lost <= 0 || x.notAttempted))) {
      check(S, `Q${f.q}.mi.noEntryWithoutLoss`, !miEntries().some((x) => x.questionId === `ci:${code}:q${f.q}`), "");
    }
    // ── MI = scorecard = record (one count function)
    const miCounts: Record<string, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    for (const e of miEntries()) for (const t of TYPES) miCounts[t] += Number(e.mistakeCounts?.[t]) || 0;
    check(S, "mi.counts=shown", JSON.stringify(miCounts) === JSON.stringify(shown), JSON.stringify({ miCounts, shown }));
    const rec = records()[0];
    check(S, "record.fourType=shown", TYPES.every((t) => (rec.fourType?.[t] ?? 0) === shown[t]), JSON.stringify(rec.fourType));
    // ── coaching true to marks
    const lost = fs.reduce((s, f) => s + f.lost, 0);
    const coaching = document.querySelector(".lt-cigp__coach")?.textContent || "";
    check(S, "pdf.coachingTrueToMarks", !(lost > 0 && /clean (work|sheet)|full marks/i.test(coaching)), coaching.slice(0, 120));
    // ── a mixed paper is titled with its real mix, never the first question's chapter
    const subjects = new Set(Object.values(fx.trueSubjects ?? {}));
    const chapters = new Set(qs.map((q) => chapterOf(q.qNumber)).filter(Boolean));
    if (chapters.size >= 2) {
      check(S, "record.title=realMix", String(rec.title).includes(`${chapters.size} chapters`) && (subjects.size < 2 || String(rec.title).includes("Maths + Science")), String(rec.title));
      check(S, "record.notFiledUnderOneChapter", Array.isArray(rec.topicKeys) && rec.topicKeys.length === 0, JSON.stringify(rec.topicKeys));
    }
    marksBaseline(S, fs, shown);

    // ── RE-GRADE THE SAME PAPER (D5): a different outcome on one question REPLACES its entry
    const regraded = clone(fx.body);
    const target = regraded.results.find((r: Any) => facts(r).lost > 0 && !facts(r).notAttempted);
    target.marksAwarded = Math.max(0, Number(target.marksAwarded) - 0.5);
    H.gradeWorksheet.mockResolvedValue(regraded);
    fireEvent.click(screen.getAllByRole("button", { name: "Back" })[0]);
    await pressGrade();
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      const e = miEntries().find((x) => x.questionId === `ci:${code}:q${target.qNumber}`);
      expect(e?.marksLost).toBe(Number(target.totalMarks) - Number(target.marksAwarded));
    });
    check(S, "regrade.oneMiEntryPerQuestion", miEntries().length === expectedEntries.length, `${miEntries().length} entries vs ${expectedEntries.length} questions`);
    check(S, "regrade.oneRecord", records().length === 1, `${records().length} records`);
    // H1 (formerly HELD) — the re-grade REPLACED each question's attempt: one per graded question,
    // and the re-graded question's attempt holds the LATEST score.
    const gradedQs = fs.filter((x) => !x.couldNotRead).length;
    await waitFor(() => {
      const a = attempts().find((x) => x.questionId === `ci:${code}:q${target.qNumber}`);
      expect(a?.marksScored).toBe(Number(target.marksAwarded));
    });
    check(S, "regrade.oneAttemptPerQuestion", attempts().length === gradedQs, `${attempts().length} attempts vs ${gradedQs} graded questions`);
    // H3 (formerly HELD) — the sidebar card's "checked answers" are the GRADED answers, not MI entries.
    const card = computeMiCardSummary(miEntries() as never, attempts() as never);
    check(S, "miCard.checkedCount=gradedAnswers", card.checkedCount === gradedQs, `card ${card.checkedCount} vs graded ${gradedQs} (MI entries ${miEntries().length})`);
  }, 30000);
});

/* ── C&I SINGLE — rendered ─────────────────────────────────────────────────── */
describe("G3 · Check & Improve, whole paper — the question line's maths (W3)", () => {
  it("every question line with maths renders through the maths renderer (no raw x^2 left on the page)", async () => {
    const S = "ci-multi-qline:owner-anomaly-01-shape";
    const { qs } = await runCiMulti("owner-anomaly-01-shape");
    await waitFor(() => expect(records()).toHaveLength(1));
    for (const b of screen.getAllByRole("button", { name: /Show step-by-step working/ })) fireEvent.click(b);
    const MATH = /[A-Za-z0-9][\^_]\d/;
    const withMaths = qs.filter((q) => MATH.test(q.questionText));
    expect(withMaths.length).toBeGreaterThan(0); // liveness: the fixture carries maths in a question
    await waitFor(() => expect(document.querySelectorAll('[data-testid="ci-q-text"] .katex').length).toBeGreaterThanOrEqual(withMaths.length));
    const lines = Array.from(document.querySelectorAll('[data-testid="ci-q-text"]'));
    // KaTeX renders HTML only (MathText: output "html"), so a rendered "2x^2" no longer reads "x^2".
    const raw = lines.filter((l) => MATH.test(l.textContent || ""));
    check(S, "ciList.qText.mathsRendered", lines.filter((l) => l.querySelector(".katex")).length >= withMaths.length && raw.length === 0, `${lines.length} lines, ${raw.length} raw`);
  }, 30000);
});

describe("G3 · Check & Improve, single question (rendered)", () => {
  async function runSingle(name: string) {
    const fx = FIX(name);
    H.detectQuestion.mockResolvedValue({
      ok: true,
      detectedMarks: fx.request.marks,
      detectedSubject: fx.request.subject,
      detectedTopic: null,
      marksSource: "stated",
      questions: [{ questionNumber: 1, questionText: fx.request.question, marks: fx.request.marks, marksSource: "stated" }],
    });
    H.checkSolutionImage.mockResolvedValue(clone(fx.body));
    renderCheckImprove();
    await readQuestion(fx.request.question);
    fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "My working, as written on the page." } });
    await pressGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    return fx;
  }

  it.each(["p3-sup02-fullmarks-withdrawn", "p3-m17a-missing-steps", "p3-m07a-miscopy-typed"])("%s — every non-marks check holds", async (name) => {
    const S = `ci-single:${name}`;
    const fx = await runSingle(name);
    const f = facts(fx.body, 1);
    // PR-2 · OR-LIVE L3 (binding): a loss made ONLY of parts NOT ATTEMPTED is not a mistake, so
    // it writes no MI entry. `p3-m17a-missing-steps` is exactly that case — step 3 is "missing"
    // (−1.5) and every other marked step is correct — so it now expects 0 entries, not 1. The
    // admission rule is the front door's own (`marksLostToWork(q) > 0`, lib/mistakeDisplay),
    // computed here from the fixture body through the real function; every other check is kept.
    const wantEntries = marksLostToWork(fx.body) > 0 ? 1 : 0;
    await waitFor(() => expect(records()).toHaveLength(1));
    await waitFor(() => expect(miEntries()).toHaveLength(wantEntries));
    // B1 — the grader was sent the QUESTION, never the chapter name
    check(S, "b1.questionSent", H.checkSolutionImage.mock.calls[0][0].question === fx.request.question, String(H.checkSolutionImage.mock.calls[0][0].question).slice(0, 60));
    fireEvent.click(screen.getAllByRole("button", { name: "Read on screen" })[0]);
    await waitFor(() => expect(document.querySelector(".lt-cigp")).not.toBeNull());
    const text = bodyText();
    check(S, "wording.noLegacyLabel", !LEGACY.test(text), (text.match(LEGACY) ?? [""])[0]);
    // no type on full marks — the summary card, the PDF chips and MI all silent
    const typeChips = document.querySelectorAll(".lt-cigp__chip[data-group]").length;
    check(S, "noTypeOnFullMarks", f.lost > 0 || (typeChips === 0 && miEntries().length === 0), `chips ${typeChips}, mi ${miEntries().length}`);
    // not attempted where today's data marks it
    const na = Array.from(document.querySelectorAll(".lt-cigp__stbadge--na")).length;
    check(S, "pdf.notAttemptedState", na === f.missingSteps, `${na} vs ${f.missingSteps}`);
    // coaching
    const coaching = document.querySelector(".lt-cigp__coach")?.textContent || "";
    check(S, "pdf.coachingTrueToMarks", !(f.lost > 0 && /clean (work|sheet)|full marks/i.test(coaching)), coaching.slice(0, 120));
    // MI = shown = record
    const rec = records()[0];
    check(S, "record.fourType=shown", TYPES.every((t) => (rec.fourType?.[t] ?? 0) === f.shown[t]), JSON.stringify(rec.fourType));
    if (wantEntries) {
      const e = miEntries()[0];
      check(S, "mi.counts=shown", TYPES.every((t) => (Number(e.mistakeCounts?.[t]) || 0) === f.shown[t]), JSON.stringify(e.mistakeCounts));
      // GA-22 — MI carries the real question text
      check(S, "mi.questionText", e.questionText === fx.request.question, String(e.questionText).slice(0, 40));
    }
    marksBaseline(S, [f], f.shown);
    // RE-GRADE the same answer with a different outcome → still ONE entry (D5)
    if (wantEntries) {
      const again = clone(fx.body);
      again.marksAwarded = Math.max(0, Number(again.marksAwarded) - 0.5);
      H.checkSolutionImage.mockResolvedValue(again);
      fireEvent.click(screen.getAllByRole("button", { name: "Back" })[0]);
      await pressGrade();
      await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(miEntries()[0]?.marksLost).toBe(Number(again.totalMarks) - Number(again.marksAwarded)));
      check(S, "regrade.oneMiEntry", miEntries().length === 1, `${miEntries().length} entries`);
      // H1 (formerly HELD) — and ONE attempt, holding the latest score.
      await waitFor(() => expect(attempts()[0]?.marksScored).toBe(Number(again.marksAwarded)));
      check(S, "regrade.oneAttempt", attempts().length === 1, `${attempts().length} attempts`);
      // W1 — the same answer re-graded to FULL MARKS removes the entry; the mistake back re-writes it.
      const clean = clone(fx.body);
      clean.marksAwarded = Number(clean.totalMarks);
      H.checkSolutionImage.mockResolvedValue(clean);
      fireEvent.click(screen.getAllByRole("button", { name: "Back" })[0]);
      await pressGrade();
      await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(3));
      await waitFor(() => expect(miEntries()).toHaveLength(0));
      check(S, "flip.clean.entryRemoved", miEntries().length === 0, `${miEntries().length} entries`);
      H.checkSolutionImage.mockResolvedValue(clone(fx.body));
      fireEvent.click(screen.getAllByRole("button", { name: "Back" })[0]);
      await pressGrade();
      await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(4));
      await waitFor(() => expect(miEntries()).toHaveLength(1));
      const back = miEntries()[0];
      check(S, "flip.mistakeAgain.entryBack", miEntries().length === 1 && back.marksLost === f.lost, `${miEntries().length} entries, lost ${back?.marksLost}`);
      check(S, "flip.mistakeAgain.counts=shown", TYPES.every((t) => (Number(back.mistakeCounts?.[t]) || 0) === f.shown[t]), JSON.stringify(back.mistakeCounts));
    }
  }, 45000);

  it("B1 — a photo with NO readable question text: grading is not offered; the student is asked to type it", async () => {
    const S = "ci-single:photo-question-no-text";
    H.detectQuestion.mockResolvedValue({
      ok: true,
      detectedMarks: 3,
      detectedSubject: "Maths",
      detectedTopic: "triangles",
      marksSource: "stated",
      questions: [{ questionNumber: 1, questionText: "", marks: 3, marksSource: "stated" }],
    });
    const { container } = renderCheckImprove();
    fireEvent.click(screen.getByRole("button", { name: "Upload question(s)" }));
    const qInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(qInput, { target: { files: [new File(["%PDF-1.4"], "question.pdf", { type: "application/pdf" })] } });
    const read = await screen.findByRole("button", { name: /Read the question/ });
    await waitFor(() => expect(read).not.toBeDisabled());
    fireEvent.click(read);
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "My working, as written on the page." } });
    const grade = await screen.findByRole("button", { name: /Grade my answer/ });
    check(S, "b1.noText.gradeNotOffered", (grade as HTMLButtonElement).disabled === true, "");
    check(S, "b1.noText.askToType", /type it in step 1/.test(bodyText()), "");
    fireEvent.click(grade);
    check(S, "b1.noText.chapterNameNeverSent", H.checkSolutionImage.mock.calls.length === 0, `${H.checkSolutionImage.mock.calls.length} grade calls`);
  }, 30000);

  it("B1 — a PHOTO question sends the text detect read from it (never the chapter name)", async () => {
    const S = "ci-single:photo-question";
    const fx = FIX("p3-m07a-miscopy-typed");
    H.detectQuestion.mockResolvedValue({
      ok: true,
      detectedMarks: 3,
      detectedSubject: "Maths",
      detectedTopic: "triangles",
      marksSource: "stated",
      questions: [{ questionNumber: 1, questionText: fx.request.question, marks: 3, marksSource: "stated" }],
    });
    H.checkSolutionImage.mockResolvedValue(clone(fx.body));
    const { container } = renderCheckImprove();
    fireEvent.click(screen.getByRole("button", { name: "Upload question(s)" }));
    // The question card comes first, so its picker is the first file input on the page. A PDF
    // skips the photo pipeline (no canvas in jsdom) and is what a QR hand-off delivers too.
    const qInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(qInput, { target: { files: [new File(["%PDF-1.4"], "question.pdf", { type: "application/pdf" })] } });
    const read = await screen.findByRole("button", { name: /Read the question/ });
    await waitFor(() => expect(read).not.toBeDisabled());
    fireEvent.click(read);
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "My working, as written on the page." } });
    await pressGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    const sent = H.checkSolutionImage.mock.calls[0][0].question;
    check(S, "b1.photoQuestionSendsDetectedText", sent === fx.request.question && sent !== "Triangles", String(sent).slice(0, 60));
    await waitFor(() => expect(miEntries()).toHaveLength(1));
    check(S, "ga22.miQuestionText", miEntries()[0].questionText === fx.request.question, String(miEntries()[0].questionText).slice(0, 40));
  }, 30000);
});

/* ── WORKSHEET + CHAPTER TEST — the real grade services ────────────────────── */
function paperFrom(fx: Any, id: string): PersistedWorksheet {
  return {
    worksheetId: id,
    createdAt: new Date("2026-10-05T09:00:00Z").toISOString(),
    title: `G3 ${id}`,
    subject: fx.request.subject,
    grade: "10",
    sectionFilter: "All",
    totalMarks: fx.request.questions.reduce((s: number, q: Any) => s + Number(q.marks), 0),
    questions: fx.request.questions.map((q: Any) => ({
      qNumber: q.qNumber,
      id: `g3-nonbank-${q.qNumber}`,
      subject: fx.request.subject,
      topicKey: fx.trueChapters?.[String(q.qNumber)] ?? "",
      topicLabel: q.topic,
      section: q.objective ? "A" : Number(q.marks) >= 5 ? "D" : Number(q.marks) === 3 ? "C" : "B",
      marks: q.marks,
      questionText: q.questionText,
    })),
  } as unknown as PersistedWorksheet;
}

describe("G3 · Worksheet and Chapter Test (real grade services)", () => {
  it("worksheet re-upload REPLACES each question's MI entry; record = scorecard; PDF groups = scorecard; coaching true", async () => {
    const S = "worksheet:p4-bs1-worksheet";
    const fx = FIX("p4-bs1-worksheet");
    const ws = paperFrom(fx, "ws-g3-bs1");
    H.gradeWorksheet.mockResolvedValue(clone(fx.body));
    const first: Any = await gradeWorksheetAndRecord(USER as never, ws, { imageBase64: "AAAA", imageMimeType: "application/pdf" });
    const fs: Facts[] = fx.body.results.map((r: Any) => facts(r));
    const want = fs.filter((f) => !f.couldNotRead && f.lost > 0 && !f.notAttempted).length;
    expect(miEntries()).toHaveLength(want);
    const shown = sumShown(fs);
    check(S, "scorecard.fourType=shown", JSON.stringify(aggregateFourType(first.response)) === JSON.stringify(shown), JSON.stringify(aggregateFourType(first.response)));
    await waitFor(() => expect(records().length).toBeGreaterThan(0));
    check(S, "record.fourType=shown", TYPES.every((t) => (records()[0].fourType?.[t] ?? 0) === shown[t]), JSON.stringify(records()[0].fourType));
    const html = render(createElement(WorksheetGradedPrintDoc as Any, { ws, response: first.response, name: "G3", code: "WS-G3", coaching: "" }));
    const chips = Array.from(html.container.querySelectorAll(".lt-gp__chip[data-group]")).map((e) => e.textContent);
    const g = groupsOf(shown);
    check(S, "pdf.chips=scorecard.groups", JSON.stringify(chips) === JSON.stringify(GROUP_ORDER.filter((k) => g[k] > 0).map((k) => `${GROUP_LABEL[k]} · ${unit(g[k])}`)), JSON.stringify(chips));
    check(S, "wording.noLegacyLabel", !LEGACY.test(html.container.textContent || ""), "");
    marksBaseline(S, fs, shown);
    // RE-UPLOAD with one question re-graded differently
    const regraded = clone(fx.body);
    const t = regraded.results.find((r: Any) => facts(r).lost > 0);
    t.marksAwarded = Math.max(0, Number(t.marksAwarded) - 0.5);
    H.gradeWorksheet.mockResolvedValue(regraded);
    await gradeWorksheetAndRecord(USER as never, ws, { imageBase64: "AAAA", imageMimeType: "application/pdf" });
    check(S, "reupload.oneMiEntryPerQuestion", miEntries().length === want, `${miEntries().length} vs ${want}`);
    // H1 (formerly HELD) — the re-upload REPLACED the attempts: one per graded question.
    const wsGraded = fx.body.results.filter((r: Any) => !r.couldNotRead).length;
    check(S, "reupload.oneAttemptPerQuestion", attempts().length === wsGraded, `${attempts().length} vs ${wsGraded}`);
  });

  it("W1 — a re-upload that comes back CLEAN removes that question's entry (cloud + device); the mistake back re-writes it; a legacy random-id entry is never touched", async () => {
    const S = "worksheet-flip:p4-bs1-worksheet";
    const fx = FIX("p4-bs1-worksheet");
    const ws = paperFrom(fx, "ws-g3-flip");
    const upload = { imageBase64: "AAAA", imageMimeType: "application/pdf" };
    // A pre-SCORECARD-MI-1 entry (random id) for the same student, in the cloud and on the device.
    const LEGACY_ID = "1727000000000-abc123";
    const legacyPath = `learnerProfiles/${UID}/mistakeLogs/${LEGACY_ID}`;
    const legacy = { id: LEGACY_ID, timestamp: "2026-09-01T00:00:00.000Z", questionText: "old", topic: "Real Numbers", subject: "maths", totalMarks: 3, marksLost: 1, mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, stepDetails: [] };
    H.store.set(legacyPath, clone(legacy));
    window.localStorage.setItem(`lazytopper.mistakeLogs.v1:${UID}`, JSON.stringify([legacy]));
    const stable = () => miEntries().filter((e) => e.path !== legacyPath);
    const deviceIds = () => (JSON.parse(window.localStorage.getItem(`lazytopper.mistakeLogs.v1:${UID}`) || "[]") as Array<{ id: string }>).map((e) => e.id);

    H.gradeWorksheet.mockResolvedValue(clone(fx.body));
    await gradeWorksheetAndRecord(USER as never, ws, upload);
    const fs: Facts[] = fx.body.results.map((r: Any) => facts(r));
    const want = fs.filter((f) => !f.couldNotRead && f.lost > 0 && !f.notAttempted).length;
    const firstPaths = stable().map((e) => e.path).sort();
    check(S, "flip.first.entries", firstPaths.length === want, `${firstPaths.length} vs ${want}`);

    // RE-UPLOAD: one losing question now earns full marks.
    const ti = fs.findIndex((f) => !f.couldNotRead && f.lost > 0 && !f.notAttempted);
    const cleanBody = clone(fx.body);
    cleanBody.results[ti].marksAwarded = Number(cleanBody.results[ti].totalMarks);
    H.gradeWorksheet.mockResolvedValue(cleanBody);
    await gradeWorksheetAndRecord(USER as never, ws, upload);
    const afterClean = stable().map((e) => e.path).sort();
    const removed = firstPaths.filter((p) => !afterClean.includes(p));
    check(S, "flip.clean.entryRemoved", afterClean.length === want - 1 && removed.length === 1, `${afterClean.length} vs ${want - 1}`);
    check(S, "flip.clean.deviceCopyRemoved", !deviceIds().includes(removed[0]?.split("/").pop() ?? "?"), JSON.stringify(deviceIds()).slice(0, 120));
    check(S, "flip.clean.legacyUntouched", H.store.has(legacyPath) && deviceIds().includes(LEGACY_ID), "");

    // RE-UPLOAD again: the mistake is back → the SAME entry is written again.
    H.gradeWorksheet.mockResolvedValue(clone(fx.body));
    await gradeWorksheetAndRecord(USER as never, ws, upload);
    const afterBack = stable().map((e) => e.path).sort();
    check(S, "flip.mistakeAgain.entryBack", JSON.stringify(afterBack) === JSON.stringify(firstPaths), `${afterBack.length} vs ${firstPaths.length}`);
    const backEntry = stable().find((e) => e.path === removed[0]);
    check(S, "flip.mistakeAgain.counts=shown", !!backEntry && TYPES.every((t) => (Number(backEntry.mistakeCounts?.[t]) || 0) === fs[ti].shown[t]), JSON.stringify(backEntry?.mistakeCounts));
    check(S, "flip.end.legacyUntouched", H.store.has(legacyPath), "");
  });

  it("W1 — the store refuses to remove a LEGACY random-id entry, even when told it is known", async () => {
    const LEGACY_ID = "1727000000001-zz9zz9";
    const legacyPath = `learnerProfiles/${UID}/mistakeLogs/${LEGACY_ID}`;
    H.store.set(legacyPath, { id: LEGACY_ID, timestamp: "2026-09-01T00:00:00.000Z" });
    window.localStorage.setItem(`lazytopper.mistakeLogs.v1:${UID}`, JSON.stringify([{ id: LEGACY_ID, timestamp: "2026-09-01T00:00:00.000Z" }]));
    expect(await removeStableMistakeLog(UID, LEGACY_ID, { known: true })).toBe(false);
    expect(H.store.has(legacyPath)).toBe(true);
    expect(window.localStorage.getItem(`lazytopper.mistakeLogs.v1:${UID}`)).toContain(LEGACY_ID);
    // CONTROL — a stable identity id IS removed.
    const STABLE_ID = "worksheet::ws-x::g3-nonbank-1";
    H.store.set(`learnerProfiles/${UID}/mistakeLogs/${STABLE_ID}`, { id: STABLE_ID });
    expect(await removeStableMistakeLog(UID, STABLE_ID, { known: true })).toBe(true);
    expect(H.store.has(`learnerProfiles/${UID}/mistakeLogs/${STABLE_ID}`)).toBe(false);
  });

  it("chapter test re-upload REPLACES each question's MI entry", async () => {
    const S = "chapter-test:p4-cm2-multi";
    const fx = FIX("p4-cm2-multi");
    const paper = paperFrom(fx, "ct-g3-cm2");
    const subjective = paper.questions;
    const objective = scoreObjectiveSection([], {});
    const run = async (body: WorksheetGradeResponse) => {
      H.gradeWorksheet.mockResolvedValue(clone(body));
      return gradeChapterTestUpload({ user: USER as never, paper, code: "CT-G3", subject: "maths", topicKey: "polynomials", objective, subjectiveQuestions: subjective, upload: { imageBase64: "AAAA", imageMimeType: "application/pdf" } });
    };
    await run(fx.body);
    const fs: Facts[] = fx.body.results.map((r: Any) => facts(r));
    const want = fs.filter((f) => !f.couldNotRead && f.lost > 0 && !f.notAttempted).length;
    check(S, "mi.oneEntryPerLosingQuestion", miEntries().length === want, `${miEntries().length} vs ${want}`);
    const regraded = clone(fx.body);
    const t = regraded.results.find((r: Any) => facts(r).lost > 0);
    t.marksAwarded = Math.max(0, Number(t.marksAwarded) - 0.5);
    await run(regraded);
    check(S, "reupload.oneMiEntryPerQuestion", miEntries().length === want, `${miEntries().length} vs ${want}`);
    // H1 (formerly HELD) — the re-upload REPLACED the attempts: one per graded subjective question.
    const ctGraded = fx.body.results.filter((r: Any) => !r.couldNotRead).length;
    check(S, "reupload.oneAttemptPerQuestion", attempts().length === ctGraded, `${attempts().length} vs ${ctGraded}`);
  });
});

/* ── SOLUTION CHECKER re-check — the front-door replay of its exact context ── */
describe("G3 · SolutionChecker re-check (front-door replay with the context SolutionChecker sends)", () => {
  it("the SAME answer re-checked replaces ONE entry; a NEW answer is a new entry (A2)", async () => {
    const S = "solution-checker:p3-m07a-miscopy-typed";
    const fx = FIX("p3-m07a-miscopy-typed");
    const ctx = (answer: string) => ({
      subject: fx.request.subject,
      topic: fx.request.topic,
      question: fx.request.question,
      questionId: "bank-q-g3",
      surface: "solution-checker",
      answerKey: `t:${hashAttemptString(answer)}`,
    });
    await recordMistake(USER as never, clone(fx.body), ctx("first answer"));
    const again = clone(fx.body);
    again.marksAwarded = Math.max(0, Number(again.marksAwarded) - 0.5);
    await recordMistake(USER as never, again, ctx("first answer"));
    check(S, "recheck.sameAnswer.oneEntry", miEntries().length === 1, `${miEntries().length} entries`);
    await recordMistake(USER as never, clone(fx.body), ctx("a different answer"));
    check(S, "recheck.newAnswer.newEntry", miEntries().length === 2, `${miEntries().length} entries`);
    // H1 (formerly HELD) — the attempt twin, with the SAME context SolutionChecker sends: the same
    // answer re-checked to a different score replaces ONE attempt; a new answer is a new attempt.
    const att = (answer: string, body: Any) =>
      recordAttempt(USER as never, { ...ctx(answer), marksScored: body.marksAwarded, marksAvailable: body.totalMarks, mode: "graded", grade: body });
    att("first answer", clone(fx.body));
    att("first answer", again);
    check(S, "recheck.sameAnswer.oneAttempt", attempts().length === 1 && attempts()[0].marksScored === again.marksAwarded, `${attempts().length} attempts`);
    att("a different answer", clone(fx.body));
    check(S, "recheck.newAnswer.newAttempt", attempts().length === 2, `${attempts().length} attempts`);
  });
});

/* ── THE GATE ──────────────────────────────────────────────────────────────── */
describe("G3 · the gate", () => {
  it("every non-marks check passed on 100% of own-surface renderings; the marks checks are a reported baseline", () => {
    const gated = LEDGER.filter((c) => !c.marks);
    const marks = LEDGER.filter((c) => c.marks);
    // LIVENESS — a gate that saw nothing cannot have checked anything.
    expect(gated.length).toBeGreaterThan(40);
    expect(marks.length).toBeGreaterThan(5);
    const failed = gated.filter((c) => !c.pass);
    const pct = (xs: Check[]) => (xs.length ? Math.round((xs.filter((c) => c.pass).length / xs.length) * 1000) / 10 : 0);
    const inMarks = marks.filter((c) => c.id === "fourType.inMarks");
    const everyLost = marks.filter((c) => c.id.endsWith("everyLostMarkHasAType"));
    console.info(
      `[G3] non-marks checks ${gated.length - failed.length}/${gated.length} (${pct(gated)}%) · ` +
        `marks baseline: fourType.inMarks ${pct(inMarks)}% (${inMarks.filter((c) => c.pass).length}/${inMarks.length}), ` +
        `everyLostMarkHasAType ${pct(everyLost)}% (${everyLost.filter((c) => c.pass).length}/${everyLost.length})`,
    );
    expect(failed.map((c) => `${c.surface} ${c.id}: ${c.detail}`)).toEqual([]);
  });
});
