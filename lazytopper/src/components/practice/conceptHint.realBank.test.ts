// QP-CONCEPT-1 — a concept entry serves the concept, over the REAL bank, for every chapter.
//
// Three entries send a CONCEPT to Quick Practice and got the chapter instead:
//   - Tutor "Practise this"   /practice/10/<S>?topic=<slug>&focus=<c>&subtopicHint=<c>&count=<n>
//   - HPQ "More like this"    /practice/10/<S>?topic=<HPQ topic>&subtopicHint=<sub>&count=10
//   - Topic Hub card (no conceptKeys)  ?topic=<slug>&focus=<card>&subtopicHint=<oneLineUse>&marksMin&marksMax
// On trunk the hint only REORDERED the engine's count-sized draw, so a concept the draw missed was never
// served (pinned below: the Real Numbers "Irrationality" card served 0 irrationality proofs of 10).
//
// `pageSet` replays the page's own build for these URLs (marks "all" -> the board-blueprint branch, one
// builder call per section + takeBlueprintShare, then the full-pool merge and selectInRangeFromPool, all
// imported from the page / builder). mode "trunk" is trunk's path byte-for-byte (no concept tiers, the
// whole-chapter merge only for a marks range); mode "lane" is this lane's.
//
// INVARIANT (lane): on-concept rows delivered = min(available on-concept rows in the band, count).
// RED on trunk: the same invariant over mode "trunk" fails (asserted below as a measured baseline), and
// PracticePage.conceptHint.test.tsx fails on trunk's real page.
// CLOCK + RANDOM: Date pinned; Math.random is a fixed LCG reset before every set (same seed both modes).

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-07T06:00:00.000Z"));
});

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import { mergeWithServedPool, selectInRangeFromPool } from "../../pages/PracticePage";
import { buildChapterServedPool, buildPracticeQuestionsWithAiTopup, type SubjectKey } from "./practiceQuestionBuilder";
import { takeBlueprintShare } from "./blueprintTake";
import { practiceTopicLabel } from "./cbqAvailability";
import { loadConceptHintTiers } from "./conceptHintTiers";
import { HPQ_ALIAS_KEYWORDS, HPQ_NO_BANK_CONCEPT } from "../../lib/practice/hpqConceptAliases";
import { BANK_CHAPTER_SLUGS, BANK_CHAPTER_SUBJECT, ensureAllBankChapters } from "../../data/bankChapters/loader";
import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";
import { conceptForSubtopic, EXAM_TRENDS_CONCEPTS } from "../../data/concepts/conceptLabelMap";
import { TRACKING_CONCEPTS } from "../../data/concepts/trackingConcepts";
import { getHighlyProbableQuestions } from "../../data/highlyProbableQuestions";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { buildActionableDesktopTopicHubContent } from "../../lib/desktop/topicHubContent";
import { buildDesktopConceptPracticePath } from "../../lib/desktop/navigation";
import { buildQuickPracticeRoundTripHref } from "../../pages/tutor/tutorRoundTrip";
import type { PracticeQuestion } from "../../data/predictionDataService";
import * as fs from "node:fs";

type Mode = "trunk" | "lane";
type Range = { min: number; max: number } | null;
interface Entry {
  surface: "tutor" | "hpq" | "hub";
  slug: string;
  subjectKey: SubjectKey;
  focus?: string;
  hint?: string;
  count: number;
  range: Range;
  name: string;
}

const BLUEPRINT = [
  { section: "A" as const, share: 0.3 },
  { section: "B" as const, share: 0.2 },
  { section: "C" as const, share: 0.2 },
  { section: "D" as const, share: 0.2 },
  { section: "E" as const, share: 0.1 },
];
const OFFSET = 7;

function resetRandom() {
  let seed = 20261023;
  vi.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648));
}

/** Read an entry off the URL the surface really builds (the page reads the same params). */
function entryFromUrl(surface: Entry["surface"], url: string, name: string): Entry {
  const u = new URL(url, "https://x.test");
  const subjectKey = (u.pathname.split("/")[3] === "Science" ? "Science" : "Maths") as SubjectKey;
  const slug = resolveCanonicalSlug(u.searchParams.get("topic") ?? "");
  const min = Number(u.searchParams.get("marksMin"));
  const max = Number(u.searchParams.get("marksMax"));
  return {
    surface,
    slug,
    subjectKey,
    focus: u.searchParams.get("focus") ?? undefined,
    hint: u.searchParams.get("subtopicHint") ?? undefined,
    count: Number(u.searchParams.get("count") ?? 10),
    range: min > 0 && max > 0 ? { min, max } : null,
    name,
  };
}

async function pageSet(
  e: Entry,
  mode: Mode,
  opts: { offset?: number; seen?: ReadonlySet<string>; noKeyword?: boolean } = {},
): Promise<{ displayed: PracticeQuestion[]; onConcept: Set<string>; keyword: Set<string>; tiers?: Array<Set<string>> }> {
  resetRandom();
  const topicLabel = practiceTopicLabel(e.subjectKey, e.slug);
  const sectionResults = await Promise.all(
    BLUEPRINT.map(({ section, share }) =>
      buildPracticeQuestionsWithAiTopup({
        grade: "10",
        subjectKey: e.subjectKey,
        topicLabel,
        packTopicKey: "",
        count: Math.max(1, Math.round(e.count * share)),
        difficulty: "All",
        subtopicHint: e.hint,
        sectionFilter: section,
        seenQuestionIds: opts.seen,
      }),
    ),
  );
  let next = takeBlueprintShare(
    BLUEPRINT.map(({ section, share }, i) => ({ section, share, questions: sectionResults[i] ?? [] })),
    e.count,
    (q) => String(q.questionText || "").trim().toLowerCase().slice(0, 80),
  );
  const served = servedPool(e);
  const hinted = mode === "lane" && (!!e.hint || !!e.focus);
  let headSize: number | undefined;
  if (e.range || hinted) {
    headSize = next.length;
    next = mergeWithServedPool(next, served);
  }
  // The on-concept rows, by the lane's resolver over the WHOLE pool (the metric for both modes).
  const metric = await loadConceptHintTiers(mergeWithServedPool(next, served), topicLabel, [e.focus, e.hint]);
  const tiers = hinted ? await loadConceptHintTiers(next, topicLabel, [e.focus, e.hint]) : null;
  // QP-CONCEPT-2: the page's tiers are [keyword, onConcept, related] (`keyword` is absent on #1308).
  const pageTiers = tiers
    ? [
        opts.noKeyword ? new Set<string>() : (tiers as { keyword?: Set<string> }).keyword ?? new Set<string>(),
        tiers.onConcept,
        tiers.related,
      ]
    : undefined;
  const sel = selectInRangeFromPool(
    next, "all", "all", "all", "all", e.range, e.count, opts.seen, opts.offset ?? OFFSET, headSize, pageTiers,
  );
  return {
    displayed: sel.displayed,
    onConcept: metric.onConcept,
    keyword: (metric as { keyword?: Set<string> }).keyword ?? new Set<string>(),
    tiers: pageTiers,
  };
}

const servedCache = new Map<string, PracticeQuestion[]>();
function servedPool(e: Entry): PracticeQuestion[] {
  const key = `${e.subjectKey}|${e.slug}`;
  if (!servedCache.has(key)) {
    servedCache.set(key, buildChapterServedPool({ subjectKey: e.subjectKey, topicKey: practiceTopicLabel(e.subjectKey, e.slug) }));
  }
  return servedCache.get(key)!;
}

function availableOnConcept(e: Entry, onConcept: Set<string>): number {
  return servedPool(e).filter(
    (q) => onConcept.has(String(q.id)) && (!e.range || (Number(q.marks) >= e.range.min && Number(q.marks) <= e.range.max)),
  ).length;
}

const ENTRIES: Entry[] = [];

beforeAll(async () => {
  await ensureAllBankChapters();
  for (const slug of BANK_CHAPTER_SLUGS) {
    const subjectKey = BANK_CHAPTER_SUBJECT[slug] as SubjectKey;
    const hub = buildActionableDesktopTopicHubContent(slug)?.boardEssentials ?? [];
    // Tutor: a concept the student opens the tutor on — every Topic Hub card name (the hub's
    // "Stuck? Ask") and every Exam Trends / tracking concept name (Me, Weak Area) — at count 3 and 10.
    const concepts = [
      ...hub.map((c) => c.name),
      ...((EXAM_TRENDS_CONCEPTS as Record<string, readonly string[]>)[slug] ?? []),
      ...((TRACKING_CONCEPTS as Record<string, readonly string[]>)[slug] ?? []),
    ];
    for (const c of new Set(concepts)) {
      for (const count of [3, 10]) {
        const url = buildQuickPracticeRoundTripHref({
          returnTo: "/tutor",
          subject: subjectKey === "Science" ? "science" : "maths",
          topicKey: slug,
          concept: c,
          count,
        });
        ENTRIES.push(entryFromUrl("tutor", url, `${slug} · ${c} · ${count}`));
      }
    }
    // Topic Hub: every card WITHOUT conceptKeys (a card with keys serves its exact id set).
    for (const c of hub.filter((x) => !x.conceptKeys || x.conceptKeys.length === 0)) {
      const url = buildDesktopConceptPracticePath({
        subject: subjectKey,
        topic: slug,
        focus: c.name,
        subtopicHint: c.oneLineUse || c.name,
        markBand: c.marks,
      });
      ENTRIES.push(entryFromUrl("hub", url, `${slug} · ${c.name}`));
    }
  }
  // HPQ: every "More like this" (topic = the HPQ bucket, hint = subtopic || concept || topic, count 10).
  for (const subject of ["Maths", "Science"] as const) {
    for (const b of getHighlyProbableQuestions(subject)) {
      for (const q of b.questions) {
        const p = new URLSearchParams({ topic: b.topic, subtopicHint: q.subtopic || q.concept || b.topic, count: "10" });
        ENTRIES.push(entryFromUrl("hpq", `/practice/10/${subject}?${p}`, `${b.topic} · ${q.id}`));
      }
    }
  }
}, 600_000);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

interface Tally {
  sets: number;
  delivered: number;
  possible: number;
  zero: number;
  zeroOfPossible: number;
  short: string[];
  /** QP-CONCEPT-2 — entries whose concept resolved to 0 rows and are NOT a listed exception. */
  noConcept: string[];
}

// QP-CONCEPT-2 (F1) — no `want > 0` escape: an entry with 0 on-concept rows FAILS the sweep unless it is
// listed here (Topic Hub / Tutor card names) or in HPQ_NO_BANK_CONCEPT (HPQ labels), each with its reason.
const CARDS_WITH_NO_BANK_CONCEPT: ReadonlyArray<{ slug: string; prefix: string; reason: string }> = [
  {
    slug: "quadratic-equations",
    prefix: "Standard form",
    reason: "its bank label 'Standard Form' is a reviewed concept-gap (UNMAPPED_LABELS_REVIEWED): no concept holds it",
  },
  // QP-CONCEPT-3: AP "Common difference … (test for an AP)" is no longer an exception — it maps to nth Term
  // with the same keywords as HPQ "Basics of AP" (the bank files "Common Difference" under nth Term).
];
const isListedException = (e: Entry): boolean =>
  (e.surface !== "hpq" &&
    CARDS_WITH_NO_BANK_CONCEPT.some((x) => x.slug === e.slug && (e.focus ?? "").startsWith(x.prefix))) ||
  (e.surface === "hpq" &&
    Object.prototype.hasOwnProperty.call(HPQ_NO_BANK_CONCEPT[e.slug] ?? {}, (e.hint ?? "").trim()));

async function sweep(mode: Mode, surface: Entry["surface"]): Promise<Tally> {
  const t: Tally = { sets: 0, delivered: 0, possible: 0, zero: 0, zeroOfPossible: 0, short: [], noConcept: [] };
  for (const e of ENTRIES.filter((x) => x.surface === surface)) {
    // Yield to the event loop between sets: a long synchronous sweep starves vitest's worker RPC.
    await new Promise((r) => setTimeout(r, 0));
    const { displayed, onConcept } = await pageSet(e, mode);
    const delivered = displayed.filter((q) => onConcept.has(String(q.id))).length;
    const want = Math.min(availableOnConcept(e, onConcept), e.count);
    t.sets += 1;
    t.delivered += delivered;
    t.possible += want;
    t.zeroOfPossible += 1;
    if (delivered === 0) t.zero += 1;
    if (want === 0 && !isListedException(e)) t.noConcept.push(`${e.name} (hint "${e.focus ?? e.hint}")`);
    if (delivered !== want) t.short.push(`${e.name}: ${delivered}/${want}`);
  }
  return t;
}

const fmt = (t: Tally) =>
  `${t.sets} sets · on-concept ${t.delivered}/${t.possible} (avg ${(t.delivered / t.sets).toFixed(2)} of ${(t.possible / t.sets).toFixed(2)}) · ${t.zero}/${t.zeroOfPossible} sets serve 0`;

describe("QP-CONCEPT-1 · real-bank sweep — every chapter's Tutor, HPQ and Topic Hub concepts", () => {
  for (const surface of ["tutor", "hpq", "hub"] as const) {
    it(`★ ${surface}: on-concept delivered = min(available, count) for EVERY entry (trunk fell short)`, async () => {
      const lane = await sweep("lane", surface);
      const trunk = await sweep("trunk", surface);
      console.info(`[QP-CONCEPT-1] ${surface} trunk: ${fmt(trunk)}`);
      console.info(`[QP-CONCEPT-1] ${surface} lane : ${fmt(lane)}`);
      expect(lane.sets).toBeGreaterThan(50);
      expect(lane.short, "lane sets short of the concept").toEqual([]);
      console.info(`[QP-CONCEPT-2] ${surface} entries with no concept rows (unlisted): ${lane.noConcept.length}`);
      expect(lane.noConcept, "entries that resolve to 0 on-concept rows and are not a listed exception").toEqual([]);
      expect(lane.delivered).toBe(lane.possible);
      // The measured trunk baseline: the same invariant FAILS there.
      expect(trunk.short.length, "trunk is short on many sets").toBeGreaterThan(lane.sets / 4);
      expect(trunk.delivered).toBeLessThan(trunk.possible);
    }, 900_000);
  }

  it("★ pinned: Topic Hub 'Irrationality of √2, √3, √5 by contradiction' serves irrationality proofs in 2–3 marks", async () => {
    const url =
      "/practice/10/Maths?topic=real-numbers&focus=Irrationality+of+%E2%88%9A2%2C+%E2%88%9A3%2C+%E2%88%9A5+by+contradiction" +
      "&subtopicHint=Prove+a+surd+is+irrational+using+the+coprime+assumption+and+FTA.&marksMin=2&marksMax=3&source=topicHub";
    const e = entryFromUrl("hub", url, "pinned");
    expect(e.range).toEqual({ min: 2, max: 3 });
    const conceptOf = (q: PracticeQuestion) => conceptForSubtopic("real-numbers", String(q.subtopic ?? "").trim());

    const trunk = await pageSet(e, "trunk");
    expect(trunk.displayed.length).toBe(10);
    // Trunk serves the band's draw + served order, the concept wherever it happens to fall (live, signed
    // in, 23 Oct: 0 of 10; this seeded replay: 5 of 10). Either way short of the 10 the band holds.
    const trunkOn = trunk.displayed.filter((q) => conceptOf(q) === "Irrationality Proofs").length;
    expect(availableOnConcept(e, trunk.onConcept)).toBeGreaterThanOrEqual(10);
    expect(trunkOn, "trunk: HCF / FTA rows in the set").toBeLessThan(10);

    const lane = await pageSet(e, "lane");
    expect(lane.displayed.length).toBe(10);
    for (const q of lane.displayed) {
      expect(conceptOf(q), String(q.id)).toBe("Irrationality Proofs");
      expect(Number(q.marks)).toBeGreaterThanOrEqual(2);
      expect(Number(q.marks)).toBeLessThanOrEqual(3);
    }
  }, 120_000);

  it("seen-first: a second visit serves the concept's UNSEEN rows first, still all on-concept", async () => {
    const e = ENTRIES.find((x) => x.surface === "tutor" && x.slug === "real-numbers" && x.focus === "Irrationality Proofs" && x.count === 10)!;
    const first = await pageSet(e, "lane");
    expect(availableOnConcept(e, first.onConcept)).toBeGreaterThanOrEqual(20);
    const seen = new Set(first.displayed.map((q) => String(q.id)));
    const second = await pageSet(e, "lane", { seen });
    expect(second.displayed.length).toBe(10);
    expect(second.displayed.every((q) => second.onConcept.has(String(q.id)))).toBe(true);
    expect(second.displayed.filter((q) => seen.has(String(q.id))), "no seen row while unseen ones remain").toEqual([]);
  }, 120_000);

  it("Refresh (offset + 1) moves the set, still all on-concept", async () => {
    const e = ENTRIES.find((x) => x.surface === "tutor" && x.slug === "trigonometry" && x.focus === "Trig Identities/Proofs" && x.count === 10)!;
    const a = await pageSet(e, "lane", { offset: OFFSET });
    const b = await pageSet(e, "lane", { offset: OFFSET + 1 });
    const ids = (s: { displayed: PracticeQuestion[] }) => s.displayed.map((q) => String(q.id));
    expect(ids(b)).not.toEqual(ids(a));
    expect(b.displayed.every((q) => b.onConcept.has(String(q.id)))).toBe(true);
    expect(a.displayed.every((q) => a.onConcept.has(String(q.id)))).toBe(true);
  }, 120_000);

  it("CONTROL: the default board set (no concept) is unchanged — lane == trunk for every chapter", async () => {
    for (const slug of BANK_CHAPTER_SLUGS) {
      const subjectKey = BANK_CHAPTER_SUBJECT[slug] as SubjectKey;
      const e: Entry = { surface: "tutor", slug, subjectKey, count: 10, range: null, name: slug };
      const ids = async (m: Mode) => (await pageSet(e, m)).displayed.map((q) => String(q.id));
      expect(await ids("lane"), slug).toEqual(await ids("trunk"));
    }
  }, 300_000);

  it("HPQ focusBankIds was dead: no HPQ question id is a bank id (so the lane drops it)", () => {
    const bankIds = new Set([...bankIndexEntries()].map(([id]) => id));
    const hpqIds = ["Maths", "Science"].flatMap((s) =>
      getHighlyProbableQuestions(s as "Maths" | "Science").flatMap((b) => b.questions.map((q) => q.id)),
    );
    expect(hpqIds.length).toBe(126);
    expect(hpqIds.filter((id) => bankIds.has(id))).toEqual([]);
  });
});

// ── QP-CONCEPT-2 ─────────────────────────────────────────────────────────────────────────────────────
// RED on trunk c0aeee1a (#1308): F1 — 40 HPQ labels resolve to no concept (the raw-label fallback);
// F3 — the cards' keywords do not lead (run this file with trunk's conceptHintTiers.ts + PracticePage.tsx
// and this lane's data: the keyword hit-rate and sibling-distinctness tests fail).

describe("QP-CONCEPT-2 · every HPQ entry resolves; every Topic Hub card serves its own keywords first", () => {
  it("★ F1: all 126 HPQ entries resolve to a concept (or are listed in HPQ_NO_BANK_CONCEPT with a reason)", async () => {
    const hpq = ENTRIES.filter((e) => e.surface === "hpq");
    expect(hpq.length).toBe(126);
    const unresolved: string[] = [];
    for (const e of hpq) {
      const { onConcept } = await pageSet(e, "lane");
      if (availableOnConcept(e, onConcept) === 0 && !isListedException(e)) unresolved.push(`${e.name} "${e.hint}"`);
    }
    console.info(`[QP-CONCEPT-2] HPQ resolved: ${hpq.length - unresolved.length}/${hpq.length}`);
    expect(unresolved).toEqual([]);
  }, 600_000);

  /** The card a hub entry came from, and its keywords (read from the data, not the product helper). */
  const cardOf = (e: Entry) =>
    (buildActionableDesktopTopicHubContent(e.slug)?.boardEssentials ?? []).find((c) => c.name === e.focus);
  const hasKw = (q: PracticeQuestion, kws: readonly string[]) => {
    const text = `${String(q.subtopic ?? "")}\n${String(q.questionText ?? "")}`.toLowerCase();
    return kws.some((k) => text.includes(k.toLowerCase()));
  };

  // ── QP-CONCEPT-3 · the keyword target is NOT self-derived ────────────────────────────────────────
  // #1310's test counted hits against each card's OWN keywords, so a broad keyword ("radius", "lens",
  // "plants") passed itself. Now: (a) every card's keywords must cover ≥ min(5, on-concept rows in its
  // band), and ≥ 4 of its first 5 (or all, when fewer exist) carry one (a SELF check: it proves the
  // keywords lead, not that they are right); (b) whether they are RIGHT is the JUDGED fixture below.
  const inBand = (e: Entry, q: PracticeQuestion) => !e.range || (Number(q.marks) >= e.range.min && Number(q.marks) <= e.range.max);
  // QP-CONCEPT-4 — JUDGED ON-TOPIC fixture, independent of every keyword list. For each item, EVERY row of its
  // keyword tier (the rows that can lead its set) was READ on 2026-10-23 (trunk 0ace8c36 + this lane) and judged:
  // `accept` = on-topic, `reject` = off-topic with the reason. The ids are hand-judged data, never derived from a
  // keyword at test time. A first-5 row outside `accept` counts as off-topic. If this fails, the bank, the seed or
  // the engine changed: re-dump (QP_FIRST5_DUMP), re-read the new rows and re-judge by hand.
  const JUDGED: ReadonlyArray<{
    surface: "hub" | "hpq";
    slug: string;
    match: string;
    reject: Readonly<Record<string, string>>;
    accept: readonly string[];
  }> = [
    { surface: "hub", slug: "circles", match: "Tangent ⟂ radius",
      reject: {"CBE-M-CIRC-B-003":"tangent–chord angle (alternate segment), not tangent ⟂ radius","CI2-036":"chord–tangent angle to central angle"},
      accept: ["LTG-M-CIRC-219", "LTG-M-CIRC-227", "PYQ-M-CIRC-002", "LTG-M-CIRC-226", "LTG-M-CIRC-102", "LTG-M-CIRC-209", "CBE-M-CIRC-A-001", "CBE-M-CIRC-A-002", "LTG-M-CIRC-250", "CBE-M-CIRC-C-002", "CBE-M-TRI-B-004", "CBE-M-CIRC-B-002", "LTG-M-CIRC-241", "LTG-M-CIRC-231", "LTG-M-CIRC-217", "2026-CIRC-SA-01b", "CI2-015", "CIR-E05", "CI2-005", "CI2-010", "CIR-E01", "CI2-044", "CI2-027", "CI2-020", "CI2-002", "CI2-041", "CI2-001", "CI2-024"] },
    { surface: "hub", slug: "trigonometry", match: "Trigonometric ratios of an acute angle",
      reject: {},
      accept: ["TRIG-N-NCERT-8-SA-003", "TRIG-N-NCERT-8-SA-005", "CBE-M-TRIG-B-001", "CBE-M-TRIG-B-002", "CBE-M-TRIG-C-001", "LTG-M-TRIG-240", "LTG-M-TRIG-257", "TRIG-N-NCERT-8-SA-001", "LTG-M-TRIG-239", "2026-TRIG-P1-B-001", "2026-TRIG-P1-B-002", "2026-TRIG-P1-B-003", "2026-TRIG-P1-B-004", "2026-TRIG-P1-B-005", "TG3-010", "TG3-029", "TRIG2-E07"] },
    { surface: "hub", slug: "light-reflection-and-refraction", match: "Mirror formula",
      reject: {},
      accept: ["FND-L-SPX-008", "LTG-S-LIGHT-230", "GDR-L-NUM-052", "GDR-L-NUM-079", "GDR-L-NUM-090", "GDR-L-NUM-091", "GDR-L-NUM-093", "PYQ-S-2025-LIGHT-010", "PYQ-S-2025-LIGHT-011", "PYQ-S-2025-LIGHT-017", "CFPQ-S-LGHT-012", "GDR-L-EQ-27", "GDR-L-NUM-056", "GDR-L-NUM-075", "GDR-L-NUM-076", "GDR-L-NUM-078", "GDR-L-NUM-081", "GDR-L-NUM-083", "GDR-L-NUM-084", "GDR-L-NUM-085", "GDR-L-NUM-086", "GDR-L-NUM-088", "GDR-L-NUM-092", "GDR-L-NUM-094", "GDR-L-CBJ-015", "GDR-L-CBJ-017", "GDR-L-CBJ-033", "GDR-L-CBJ-035", "GDR-L-CBJ-037", "GDR-L-CBJ-041", "GDR-L-CBJ-043", "FND-L-SPX-014", "FND-L-SPX-040", "GDR-L-NUM-051", "GDR-L-NUM-077", "LTG-S-LIGHT-229", "LTG-S-LIGHT-232", "FND-L-SPQ-002", "2026-LIGHT-SA-03", "GDR-L-CBJ-012", "LT2-007", "LT2-031", "LT-M01"] },
    { surface: "hub", slug: "light-reflection-and-refraction", match: "Lens formula",
      reject: {},
      accept: ["LTG-S-LIGHT-291", "CBE-S-LGHT-C-004", "GDR-L-NUM-026", "GDR-L-NUM-013", "GDR-L-NUM-035", "APQ-S-LIGHT-007", "PYQ-S-2026-LIGHT-013", "PYQ-S-2026-LIGHT-017", "PYQ-S-2025-LIGHT-016", "FND-L-SPX-019", "FND-L-SPX-023", "FND-L-SPX-033", "FND-L-SPQ-003", "FND-L-SPQ-011", "FND-L-SPQ-015", "FND-L-SPQ-018", "FND-L-SPQ-021", "FND-L-BD-06", "SQP-S-2025-LGHT-033", "GDR-L-NUM-001", "GDR-L-NUM-002", "GDR-L-NUM-003", "GDR-L-NUM-004", "GDR-L-NUM-005", "GDR-L-NUM-006", "GDR-L-NUM-008", "GDR-L-NUM-009", "GDR-L-NUM-010", "GDR-L-NUM-011", "GDR-L-NUM-012", "GDR-L-NUM-014", "GDR-L-NUM-015", "GDR-L-NUM-023", "GDR-L-NUM-027", "GDR-L-NUM-028", "GDR-L-NUM-030", "GDR-L-NUM-042", "GDR-L-NUM-054", "GDR-L-NUM-064", "GDR-L-CBJ-020", "GDR-L-CBJ-031", "GDR-L-CBJ-036", "GDR-L-CBJ-038", "GDR-L-CBJ-040", "LTG-S-LIGHT-290", "LTG-S-LIGHT-292", "CBE-S-LGHT-C-001", "CFPQ-S-LGHT-013", "CBE-S-LGHT-B-005", "CBE-S-LGHT-B-006", "LTG-S-LIGHT-268", "LTG-S-LIGHT-271", "2026-LIGHT-SA-10", "FND-L-SPX-032", "GDR-L-CBJ-013", "LT2-016", "LT2-038"] },
    { surface: "hpq", slug: "light-reflection-and-refraction", match: "Lens Formula & Diagrams",
      reject: {"LTG-S-LIGHT-297":"power of lenses in contact","CASE-SCI-LIGHT-001":"myopia / hypermetropia lens power","PYQ-S-2025-LIGHT-020":"glass slab / prism refraction","LT2-018":"power of a lens (A–R)","LT2-048":"power of a lens","LT2-017":"concave lens image nature, no formula","LTG-S-LIGHT-299":"spectacle powers in contact"},
      accept: ["LTG-S-LIGHT-273", "LTG-S-LIGHT-276", "LTG-S-LIGHT-296", "FND-L-SPQ-022", "SQP-S-2025-LGHT-038", "LTG-S-LIGHT-277", "LTG-S-LIGHT-102", "LTG-S-LIGHT-274", "LTG-S-LIGHT-294", "LTG-S-LIGHT-291", "CBE-S-LGHT-C-004", "FND-L-QB-158", "CFPQ-S-LGHT-014", "FND-L-QB-133", "FND-L-QB-142", "FND-L-QB-161", "FND-L-QB-163", "LTG-S-LIGHT-284", "FND-L-WS4-209", "FND-L-WS4-210", "FND-L-QB-184", "GDR-L-NUM-026", "GDR-L-NUM-013", "GDR-L-NUM-035", "LIGHT-EXMPLR-9-LA-009", "FND-L-SPQ-020", "APQ-S-LIGHT-007", "PYQ-S-2026-LIGHT-013", "PYQ-S-2026-LIGHT-017", "PYQ-S-2025-LIGHT-016", "FND-L-SPX-019", "FND-L-SPX-023", "FND-L-SPX-033", "FND-L-SPQ-003", "FND-L-SPQ-011", "FND-L-SPQ-015", "FND-L-SPQ-018", "FND-L-SPQ-021", "FND-L-BD-06", "SQP-S-2025-LGHT-033", "GDR-L-NUM-001", "GDR-L-NUM-002", "GDR-L-NUM-003", "GDR-L-NUM-004", "GDR-L-NUM-005", "GDR-L-NUM-006", "GDR-L-NUM-008", "GDR-L-NUM-009", "GDR-L-NUM-010", "GDR-L-NUM-011", "GDR-L-NUM-012", "GDR-L-NUM-014", "GDR-L-NUM-015", "GDR-L-NUM-023", "GDR-L-NUM-027", "GDR-L-NUM-028", "GDR-L-NUM-030", "GDR-L-NUM-042", "GDR-L-NUM-054", "GDR-L-NUM-064", "GDR-L-CBJ-020", "GDR-L-CBJ-031", "GDR-L-CBJ-036", "GDR-L-CBJ-038", "GDR-L-CBJ-040", "LTG-S-LIGHT-290", "LTG-S-LIGHT-292", "FND-L-SPQ-008", "GDR-L-NUM-007", "GDR-L-NUM-024", "GDR-L-NUM-029", "GDR-L-NUM-031", "GDR-L-NUM-058", "GDR-L-NUM-060", "GDR-L-CBJ-029", "CBE-S-LGHT-C-001", "CFPQ-S-LGHT-013", "LIGHT-EXMPLR-9-LA-006", "LTG-S-LIGHT-298", "CBE-S-LGHT-B-005", "CBE-S-LGHT-B-006", "LTG-S-LIGHT-268", "LTG-S-LIGHT-271", "2026-LIGHT-SA-10", "FND-L-SPX-032", "GDR-L-CBJ-013", "LT2-041", "LT2-037", "LT2-015", "LT2-016", "LT2-038", "LT2-024", "LT2-014", "LT2-036", "LT2-044"] },
    { surface: "hpq", slug: "light-reflection-and-refraction", match: "Mirror Formula & Diagrams",
      reject: {"SQP-S-2025-LGHT-030":"statements on concave / convex images, no formula","PYQ-S-2025-LIGHT-020":"glass slab / prism refraction","LT2-009":"convex-mirror image nature (A–R), no formula"},
      accept: ["LTG-S-LIGHT-236", "LTG-S-LIGHT-233", "LTG-S-LIGHT-237", "LTG-S-LIGHT-101", "SQP-S-2025-LGHT-032", "FND-L-SPX-008", "FND-L-QB-069", "LTG-S-LIGHT-223", "FND-L-QB-037", "FND-L-QB-139", "FND-L-QB-147", "FND-L-QB-155", "FND-L-QB-165", "FND-L-SPM-009", "FND-L-SPM-018", "FND-L-WS4-107", "FND-L-WS4-108", "FND-L-WS4-109", "LTG-S-LIGHT-221", "FND-L-WSF-10", "FND-L-WS4-208", "FND-L-WS4-310", "FND-L-WSF-11", "LIGHT-EXMPLR-9-MCQ-002", "FND-L-WS4-309", "LTG-S-LIGHT-224", "LTG-S-LIGHT-230", "GDR-L-NUM-052", "GDR-L-NUM-079", "GDR-L-NUM-090", "GDR-L-NUM-091", "GDR-L-NUM-093", "FND-L-SPQ-030", "FND-L-QB-111", "FND-L-SPM-025", "PYQ-S-2025-LIGHT-010", "PYQ-S-2025-LIGHT-011", "PYQ-S-2025-LIGHT-017", "CFPQ-S-LGHT-012", "GDR-L-EQ-27", "GDR-L-NUM-056", "GDR-L-NUM-075", "GDR-L-NUM-076", "GDR-L-NUM-078", "GDR-L-NUM-081", "GDR-L-NUM-083", "GDR-L-NUM-084", "GDR-L-NUM-085", "GDR-L-NUM-086", "GDR-L-NUM-088", "GDR-L-NUM-092", "GDR-L-NUM-094", "GDR-L-CBJ-015", "GDR-L-CBJ-017", "GDR-L-CBJ-033", "GDR-L-CBJ-035", "GDR-L-CBJ-037", "GDR-L-CBJ-041", "GDR-L-CBJ-043", "FND-L-SPQ-012", "GDR-L-CBJ-042", "FND-L-SPX-014", "FND-L-SPX-040", "GDR-L-NUM-051", "GDR-L-NUM-077", "LIGHT-EXMPLR-9-LA-007", "LTG-S-LIGHT-107", "LTG-S-LIGHT-238", "LTG-S-LIGHT-229", "LTG-S-LIGHT-232", "LTG-S-LIGHT-239", "FND-L-SPQ-002", "GDR-L-CBJ-034", "2026-LIGHT-SA-03", "GDR-L-CBJ-012", "LT2-030", "LT2-008", "LT2-007", "LT2-031", "LT2-021", "LT-M01", "LT-E10", "LT2-061"] },
    { surface: "hpq", slug: "chemical-reactions-and-equations", match: "Oxidation/Reduction",
      reject: {"LTG-S-CHEMRXN-295":"respiration as exothermic","BX-CHEM-E-016":"respiration as exothermic","BX-CHEM-D-035":"combustion vs respiration","CR2-052":"respiration exothermic (A–R)","CR-D03":"all five reaction types","CR-M05":"compost as exothermic","CR-H01":"five unrelated terms","CR-H05":"decomposition vs combination","CR-E07":"corrosion is called rusting (recall)","CR-H07":"mixed displacement / photolysis"},
      accept: ["BX-CHEM-E-056", "CHEM-EXMPLR-1-MCQ-002", "BX-CHEM-E-054", "LTG-S-CHEMRXN-253", "LTG-S-CHEMRXN-254", "BX-CHEM-E-064", "BX-CHEM-E-062", "LTG-S-CHEMRXN-310", "SP-S-2023-CHEM-A-003", "LTG-S-CHEMRXN-246", "BX-CHEM-E-047", "BX-CHEM-EX-A-004", "BX-CHEM-EX-A-010", "BX-CHEM-EX-A-022", "BX-CHEM-EX-A-025", "BX-CHEM-EX-A-026", "CHEM-NCERT-1-MCQ-001", "CHEM-EXMPLR-1-MCQ-003", "CHEM-EXMPLR-1-MCQ-006", "SQP-S-2023-CHEM-A-001", "SP-S-2023-CHEM-A-002", "BX-CHEM-EX-A-016", "CBE-S-CHEM-A-011", "PYQ-S-CHEM-005", "PYQ-S-2024-CHEMRXN-003", "LTG-S-CHEMRXN-241", "BX-CHEM-EX-A-014", "LTG-S-CHEMRXN-244", "CHEM-NCERT-1-SA-004", "CHEM-EXMPLR-1-SA-003", "CHEM-EXMPLR-1-SA-010", "LTG-S-CHEMRXN-248", "LTG-S-CHEMRXN-250", "BX-CHEM-D-017", "SCQ-S-CHEM-027", "PYQ-S-2026-CHEMRXN-008", "LTG-S-CHEMRXN-303", "BX-CHEM-EX-A-029", "CBE-S-CHEM-A-006", "BX-CHEM-D-008", "BX-CHEM-D-016", "BX-CHEM-D-027", "LTG-S-CHEMRXN-258", "LTG-S-CHEMRXN-252", "BX-CHEM-EX-A-002", "BX-CHEM-EX-A-006", "CHEM-NCERT-1-LONG-002", "CHEM-NCERT-1-VSA-006", "CR2-040", "CR2-020", "MNM2-045", "CR-AR05", "CR-AR06", "CR2-042", "CR2-033", "CR2-048", "CR-M15", "CR2-007", "CR-M02", "CR-M13", "CR2-013", "CR2-006", "CR-M08", "CR2-038", "CR2-029", "CR2-045", "CR2-024", "CR-H03", "CR-E04", "CR-E17", "CR2-051", "CR2-049"] },
    { surface: "hpq", slug: "life-processes", match: "Cell organelles",
      reject: {"LTG-S-LIFE-258":"yeast aerobic / anaerobic samples, not an organelle question"},
      accept: ["LPX-A-005", "LPSE-019", "LIFE-EXMPLR-5-SA-001", "LIFE-EXMPLR-5-SA-026", "LP2-038", "LP2-009", "LP2-059", "LPSE-017"] },
  ];
  const judgedEntry = (j: (typeof JUDGED)[number]) =>
    ENTRIES.find(
      (x) =>
        x.surface === j.surface &&
        x.slug === j.slug &&
        (j.surface === "hub" ? (x.focus ?? "").startsWith(j.match) : (x.hint ?? "").trim() === j.match),
    );
  const first5Lines: string[] = [];
  const dumpFirst5 = (title: string, shown: PracticeQuestion[], kws: readonly string[], n = 5) => {
    first5Lines.push(`## ${title}  (keyword hits ${shown.slice(0, 5).filter((q) => hasKw(q, kws)).length}/5)`);
    shown.slice(0, n).forEach((q, i) =>
      first5Lines.push(`   ${i + 1}. ${hasKw(q, kws) ? "+" : "-"} ${q.id} [${q.subtopic}] ${String(q.questionText).replace(/\s+/g, " ").slice(0, 220)}`),
    );
  };

  it("★ F3: every card's keywords cover its band and lead (≥ 4 of the first 5)", async () => {
    const hub = ENTRIES.filter((e) => e.surface === "hub" && (cardOf(e)?.practiseKeywords?.length ?? 0) > 0);
    expect(hub.length).toBeGreaterThanOrEqual(80);
    const misses: string[] = [];
    let hits = 0;
    let slots = 0;
    for (const e of hub) {
      await new Promise((r) => setTimeout(r, 0));
      const kws = cardOf(e)!.practiseKeywords!;
      const { displayed, onConcept } = await pageSet(e, "lane");
      const band = servedPool(e).filter((q) => onConcept.has(String(q.id)) && inBand(e, q));
      const kwRows = band.filter((q) => hasKw(q, kws)).length;
      if (kwRows < Math.min(5, band.length)) misses.push(`${e.name}: keywords cover ${kwRows} of ${band.length} band rows`);
      const got = displayed.slice(0, 5).filter((q) => hasKw(q, kws)).length;
      if (got < Math.min(4, kwRows)) misses.push(`${e.name}: ${got}/5 lead`);
      hits += got;
      slots += Math.min(5, displayed.length);
      dumpFirst5(`HUB ${e.slug} · ${e.focus}`, displayed, kws);
    }
    console.info(`[QP-CONCEPT-3] hub: first-5 keyword hits ${hits}/${slots} over ${hub.length} cards`);
    expect(misses).toEqual([]);
  }, 900_000);

  it("★ F3: every HPQ alias with keywords has keyword rows, and they lead (≥ 4 of the first 5)", async () => {
    const misses: string[] = [];
    let hits = 0;
    let n = 0;
    for (const [slug, labels] of Object.entries(HPQ_ALIAS_KEYWORDS)) {
      for (const [label, kws] of Object.entries(labels)) {
        const e = ENTRIES.find((x) => x.surface === "hpq" && x.slug === slug && (x.hint ?? "").trim() === label);
        expect(e, `${slug} · ${label}`).toBeDefined();
        const { displayed, onConcept } = await pageSet(e!, "lane");
        const kwRows = servedPool(e!).filter((q) => onConcept.has(String(q.id)) && hasKw(q, kws)).length;
        if (kwRows < 5) misses.push(`${label}: only ${kwRows} keyword rows`);
        const got = displayed.slice(0, 5).filter((q) => hasKw(q, kws)).length;
        if (got < Math.min(4, kwRows)) misses.push(`${label}: ${got}/5 lead`);
        hits += got;
        n += 1;
        dumpFirst5(`HPQ ${slug} · ${label}`, displayed, kws);
      }
    }
    // The HPQ labels with no bank concept (honest note) — dumped so the reader sees what is served.
    for (const [slug, labels] of Object.entries(HPQ_NO_BANK_CONCEPT)) {
      for (const label of Object.keys(labels)) {
        const e = ENTRIES.find((x) => x.surface === "hpq" && x.slug === slug && (x.hint ?? "").trim() === label)!;
        dumpFirst5(`HPQ ${slug} · ${label} (no bank concept: honest note shown)`, (await pageSet(e, "lane")).displayed, []);
      }
    }
    console.info(`[QP-CONCEPT-4] HPQ alias keyword hits in the first 5: ${hits}/${n * 5} over ${n} aliases`);
    expect(misses).toEqual([]);
  }, 600_000);

  it("★ QP-CONCEPT-4: JUDGED ON-TOPIC — ≥ 4 of the first 5 are accepted questions at rotation offsets 0, 3, 7 and 11", async () => {
    const misses: string[] = [];
    const counts: string[] = [];
    for (const j of JUDGED) {
      const e = judgedEntry(j);
      expect(e, `${j.slug} · ${j.match}`).toBeDefined();
      const per: number[] = [];
      for (const offset of [0, 3, 7, 11]) {
        const { displayed } = await pageSet(e!, "lane", { offset });
        const first5 = displayed.slice(0, 5);
        const ok = first5.filter((q) => j.accept.includes(String(q.id))).length;
        per.push(ok);
        if (ok < 4) {
          const off = first5.filter((q) => !j.accept.includes(String(q.id))).map((q) => `${q.id}${j.reject[String(q.id)] ? ` (rejected: ${j.reject[String(q.id)]})` : " (not yet judged)"}`);
          misses.push(`${j.surface} ${j.match} @offset ${offset}: ${ok}/5 on-topic; off: ${off.join(", ")} — re-judge by reading; bank, seed or engine changed`);
        }
        if (offset === 7) dumpFirst5(`JUDGED ${j.surface} ${j.slug} · ${j.match} (offset 7, first 10)`, displayed, [], 10);
      }
      counts.push(`${j.match} ${per.join("/")}`);
    }
    console.info(`[QP-CONCEPT-4] judged on-topic in the first 5 (offsets 0/3/7/11): ${counts.join(" · ")}`);
    const dump = process.env.QP_FIRST5_DUMP;
    if (dump) fs.writeFileSync(dump, first5Lines.join("\n"), "utf8");
    expect(misses).toEqual([]);
  }, 900_000);

  it("QP-CONCEPT-4: 'Cell organelles' is mapped (the bank has organelle questions) and its keyword rows lead", async () => {
    expect(HPQ_NO_BANK_CONCEPT["life-processes"]?.["Cell organelles"]).toBeUndefined();
    const e = ENTRIES.find((x) => x.surface === "hpq" && (x.hint ?? "") === "Cell organelles")!;
    const t = await loadConceptHintTiers(servedPool(e), practiceTopicLabel(e.subjectKey, e.slug), [e.focus, e.hint]);
    for (const id of ["LP2-009", "LP2-038", "LP2-059", "LPSE-017", "LIFE-EXMPLR-5-SA-026", "LPX-A-005"]) {
      expect(t.keyword.has(id), id).toBe(true);
    }
  }, 120_000);

  it("★ F3: sibling cards in one concept bucket share at most 2 of their first 5", async () => {
    const hub = ENTRIES.filter((e) => e.surface === "hub");
    const byBucket = new Map<string, Entry[]>();
    for (const e of hub) {
      const c = cardOf(e);
      if (!c?.practiseConceptKeys?.length || !c.practiseKeywords?.length) continue;
      const k = `${e.slug}|${c.practiseConceptKeys.join("+")}`;
      byBucket.set(k, [...(byBucket.get(k) ?? []), e]);
    }
    const close: string[] = [];
    for (const [k, es] of byBucket) {
      if (es.length < 2) continue;
      const firsts: Array<[string, Set<string>]> = [];
      for (const e of es) firsts.push([e.focus ?? "", new Set((await pageSet(e, "lane")).displayed.slice(0, 5).map((q) => String(q.id)))]);
      for (let i = 0; i < firsts.length; i++)
        for (let j = i + 1; j < firsts.length; j++) {
          const shared = [...firsts[i][1]].filter((id) => firsts[j][1].has(id)).length;
          if (shared > 2) close.push(`${k}: "${firsts[i][0]}" ~ "${firsts[j][0]}" share ${shared}/5`);
        }
    }
    expect(close).toEqual([]);
  }, 600_000);

  it("F4: the honest note names the concept an HPQ entry's questions come from", async () => {
    const e = ENTRIES.find((x) => x.surface === "hpq" && (x.hint ?? "") === "Lens Formula & Diagrams")!;
    const t = await loadConceptHintTiers(servedPool(e), practiceTopicLabel(e.subjectKey, e.slug), [e.focus, e.hint]);
    expect((t as { conceptName?: string }).conceptName).toBe("Mirror / Lens Formula & Ray Diagrams");
  }, 120_000);

  it("F2: the honest note — how many rows lead, and its words", async () => {
    const { conceptRowsShown, conceptEndNote } = await import("./conceptHintTiers");
    const e = entryFromUrl(
      "tutor",
      buildQuickPracticeRoundTripHref({ returnTo: "/tutor", subject: "science", topicKey: "life-processes", concept: "Excretion in Plants", count: 10 }),
      "excretion in plants",
    );
    const { displayed, onConcept, tiers } = await pageSet(e, "lane");
    const avail = availableOnConcept(e, onConcept);
    expect(avail).toBeGreaterThan(0);
    expect(avail).toBeLessThan(10);
    const shown = conceptRowsShown(displayed, tiers);
    expect(shown).toBeGreaterThanOrEqual(avail);
    expect(shown).toBeLessThan(displayed.length);
    expect(conceptEndNote("Excretion in Plants", shown)).toBe(
      "That's every question we have on Excretion in Plants for now — the rest are from the same chapter.",
    );
    expect(conceptEndNote("Standard form", 0)).toBe(
      "We don't have questions on Standard form yet — these are from the same chapter.",
    );
  }, 120_000);
});
