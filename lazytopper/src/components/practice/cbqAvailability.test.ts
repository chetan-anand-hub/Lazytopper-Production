// CBQ-ENTRY-1 (P6) + CBQ-1 PR-1 — which chapters have real CBQs, and how many per mark
// value, from the ASSEMBLED bank.
//
// Real loader, real served pool, real bank. CBQ-1 PR-1: a CBQ is decided by the ONE
// classifier, `isCbq` — every mark value 1-5 (closes FU-CBQ-CHOOSER-ALL-MARKS).
//
// ★ NO HARDCODED CBQ COUNTS. Every expectation below is DERIVED from the bank through
// `isCbq`, so the content lane tagging more rows `competencyVerified: true` moves no pin.
// The classifier forced to "nothing is a CBQ" is the CONTROL: it proves the classifier —
// not a section, a format, or the legacy flag — decides.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const flags = vi.hoisted(() => ({ noCbq: false }));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../lib/cbq/cbqClassification", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/cbq/cbqClassification")>();
  const isCbq: typeof real.isCbq = (q) => (flags.noCbq ? false : real.isCbq(q));
  return {
    ...real,
    isCbq,
    filterCbqs: <T extends Parameters<typeof real.isCbq>[0]>(rows: readonly T[]) => rows.filter((q) => isCbq(q)),
    countCbqsByMarks: (rows: Parameters<typeof real.countCbqsByMarks>[0]) =>
      real.countCbqsByMarks(flags.noCbq ? [] : rows),
  };
});

import {
  CBQ_CHAPTER_SUBJECTS,
  chapterCbqCounts,
  chapterHasCbqs,
  chaptersWithCbqs,
  computeCbqChapterMap,
  practiceTopicLabel,
  renderCbqChaptersFile,
} from "./cbqAvailability";
import { CBQ_CHAPTERS } from "./cbqChapters.generated";
import { cbqChapterComingSoon } from "./cbqChapterManifest";
import { buildCbqPracticePool, type SubjectKey } from "./practiceQuestionBuilder";
import { __resetBankChaptersForTest, ensureBankSubject, isBankChapterLoaded } from "../../data/bankChapters/loader";
import { PredictionCore } from "../../data/predictionCore";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import { CBQ_MARK_VALUES, cbqMarks, countCbqsByMarks, isCbq } from "../../lib/cbq/cbqClassification";

beforeEach(() => {
  __resetBankChaptersForTest();
  flags.noCbq = false;
});

/** The chapter's served rows that the one classifier calls CBQs — the derived oracle. */
function servedCbqs(subject: SubjectKey, slug: string) {
  const label = practiceTopicLabel(subject, slug);
  return PredictionCore.getLikelyQuestionsForConcept(label)
    .filter((q) => String(q.subject ?? "").toLowerCase() === subject.toLowerCase())
    .filter((q) => isCbq(q));
}

describe("CBQ-ENTRY-1 (P6) + CBQ-1 PR-1 — chapters with real CBQs", () => {
  it("derives the bank label the way Practice does for a ?topic= slug", () => {
    expect(practiceTopicLabel("Maths", "triangles")).toBe("Triangles");
    expect(practiceTopicLabel("Maths", "pair-of-linear-equations")).toBe("Pair of Linear Equations in Two Variables");
    expect(practiceTopicLabel("Science", "how-do-organisms-reproduce")).toBe("Reproduction");
  });

  for (const subject of ["Maths", "Science"] as const) {
    it(`★ ${subject}: the chooser's chapters and per-mark counts equal the bank's isCbq rows (derived, every mark 1-5)`, async () => {
      const slugs = desktopTopicsBySubject(subject).map((t) => t.slug);
      const found = await chaptersWithCbqs(subject, slugs);
      expect(isBankChapterLoaded(slugs[0])).toBe(true);
      const expected = new Set(slugs.filter((s) => servedCbqs(subject, s).length > 0));
      expect([...found].sort()).toEqual([...expected].sort());
      // Precondition: the bank holds CBQs in this subject, or the equality is vacuous.
      expect(expected.size).toBeGreaterThan(0);
      for (const slug of slugs) {
        const oracle = countCbqsByMarks(servedCbqs(subject, slug));
        const counts = chapterCbqCounts(subject, slug);
        expect(counts, slug).toEqual(oracle);
        // Every mark value is counted — nothing is limited to the 4-mark case study.
        for (const m of CBQ_MARK_VALUES) expect(counts.byMarks[m], `${slug} ${m}m`).toBe(oracle.byMarks[m]);
      }
    }, 240000);
  }

  it("★ the served CBQ pool holds ONLY isCbq rows, and is mixed-marks when the chapter has several mark values", async () => {
    await ensureBankSubject("Science");
    await ensureBankSubject("Maths");
    let mixedChecked = 0;
    for (const subject of ["Maths", "Science"] as const) {
      for (const { slug } of desktopTopicsBySubject(subject)) {
        const pool = buildCbqPracticePool({ subjectKey: subject, topicKey: practiceTopicLabel(subject, slug) });
        for (const q of pool) expect(isCbq(q), `${slug} ${q.id}`).toBe(true);
        const distinct = new Set(servedCbqs(subject, slug).map((q) => cbqMarks(q)).filter((m) => m !== null));
        if (distinct.size >= 2) {
          // The head of the pool spans mark values (interleaved), so a 5-question set is mixed.
          const head = new Set(pool.slice(0, Math.min(5, pool.length)).map((q) => cbqMarks(q)));
          expect(head.size, slug).toBeGreaterThanOrEqual(2);
          mixedChecked += 1;
        }
      }
    }
    // Precondition on the subject: the bank DOES hold multi-mark CBQ chapters, or the
    // mixed-marks assertion above checked nothing.
    expect(mixedChecked).toBeGreaterThan(0);
  }, 240000);

  it("CONTROL — with the classifier saying 'no CBQs', no chapter has CBQs (isCbq decides)", async () => {
    flags.noCbq = true;
    const maths = desktopTopicsBySubject("Maths").map((t) => t.slug);
    expect((await chaptersWithCbqs("Maths", maths)).size).toBe(0);
    for (const slug of maths) expect(chapterCbqCounts("Maths", slug).total).toBe(0);
  }, 240000);

  it("a slug with no bank chapter has none", async () => {
    await chaptersWithCbqs("Maths", []);
    expect(chapterHasCbqs("Maths", "not-a-chapter")).toBe(false);
    expect(chapterHasCbqs("Maths", "generic")).toBe(false);
  }, 60000);
});

/**
 * SPEED-HUB-1 — the chooser's precomputed manifest can never drift from the bank.
 *
 * CbqChapterPicker marks "coming soon" from cbqChapters.generated.ts (no bank download). This
 * guard recomputes the manifest with the SAME runtime function (`chaptersWithCbqs`) over the
 * REAL bank and asserts the committed file is byte-identical to its rendering. A bank change
 * that gives a chapter its first CBQ (or takes its last away) fails here until
 * `node scripts/generateCbqChapters.mjs --write` is re-run (it runs THIS block with
 * CBQ_CHAPTERS_WRITE=1).
 */
const MANIFEST = resolve(__dirname, "cbqChapters.generated.ts");

describe("SPEED-HUB-1 · cbqChapters.generated.ts equals the runtime computation", () => {
  it("★★ the committed file is exactly the rendering of the live-bank computation", async () => {
    const map = await computeCbqChapterMap();
    const text = renderCbqChaptersFile(map);
    if (process.env.CBQ_CHAPTERS_WRITE === "1") writeFileSync(MANIFEST, text, "utf8");
    const committed = readFileSync(MANIFEST, "utf8").replace(/\r\n/g, "\n");
    expect(committed, "STALE: run `node scripts/generateCbqChapters.mjs --write`").toBe(text);
    // Independently of the renderer: every listed chapter's entry is exactly chapterHasCbqs.
    for (const subject of CBQ_CHAPTER_SUBJECTS) {
      const slugs = desktopTopicsBySubject(subject).map((t) => t.slug);
      expect(Object.keys(map[subject])).toEqual(slugs);
      for (const slug of slugs) expect(map[subject][slug], `${subject}/${slug}`).toBe(chapterHasCbqs(subject, slug));
    }
  }, 240_000);

  // Skipped in write mode only: the imported module is the file as it was BEFORE the write.
  it.skipIf(process.env.CBQ_CHAPTERS_WRITE === "1")("the imported manifest carries every chapter the chooser lists, and the reader follows it", () => {
    for (const subject of CBQ_CHAPTER_SUBJECTS) {
      const entry = CBQ_CHAPTERS[subject] as Record<string, boolean>;
      const slugs = desktopTopicsBySubject(subject).map((t) => t.slug);
      expect(Object.keys(entry)).toEqual(slugs);
      // Precondition: the manifest is not vacuous — some chapter in each subject has CBQs.
      expect(Object.values(entry).some(Boolean), subject).toBe(true);
      for (const slug of slugs) expect(cbqChapterComingSoon(subject, slug), slug).toBe(entry[slug] === false);
    }
    // A slug the manifest does not know is NOT marked (the landing gates it itself).
    expect(cbqChapterComingSoon("Maths", "not-a-chapter")).toBe(false);
  });

  it("CONTROL — the renderer writes a chapter without CBQs as false (so the chooser would mark it)", () => {
    const text = renderCbqChaptersFile({ Maths: { triangles: true, circles: false }, Science: { electricity: true } });
    expect(text).toContain('"circles": false,');
    expect(text).toContain('"triangles": true,');
  });

  it("★ the chooser reads only the manifest: no import() and no bank-reaching static import", () => {
    const src = readFileSync(resolve(__dirname, "CbqChapterPicker.tsx"), "utf8");
    expect(src).not.toMatch(/\bimport\s*\(/);
    const specs = [...src.matchAll(/^import[^;]*?from\s+"([^"]+)"/gms)].map((m) => m[1]);
    expect(specs).toContain("./cbqChapterManifest");
    for (const bad of ["./cbqAvailability", "./practiceQuestionBuilder", "loader", "predictionCore", "bankChapters"]) {
      expect(specs.some((sp) => sp.includes(bad)), bad).toBe(false);
    }
    const manifestSrc = readFileSync(resolve(__dirname, "cbqChapterManifest.ts"), "utf8");
    const manifestSpecs = [...manifestSrc.matchAll(/^import[^;]*?from\s+"([^"]+)"/gms)].map((m) => m[1]);
    expect(manifestSpecs.sort()).toEqual(["../../lib/desktop/navigation", "./cbqChapters.generated"]);
  });
});
