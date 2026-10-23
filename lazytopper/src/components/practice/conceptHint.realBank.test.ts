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
import { HPQ_NO_BANK_CONCEPT } from "../../lib/practice/hpqConceptAliases";
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
  {
    slug: "arithmetic-progression",
    prefix: "Common difference",
    reason: "'test for an AP' rows are the reviewed concept-gap labels (Identifying an AP …): no concept holds them",
  },
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

  it("★ F3: for every card with practiseKeywords, ≥ min(available, 5) of the first 5 contain a card keyword", async () => {
    const hub = ENTRIES.filter((e) => e.surface === "hub" && (cardOf(e)?.practiseKeywords?.length ?? 0) > 0);
    expect(hub.length).toBeGreaterThanOrEqual(70);
    const misses: string[] = [];
    let hits = 0;
    let possible = 0;
    let trunkLikeHits = 0;
    for (const e of hub) {
      await new Promise((r) => setTimeout(r, 0));
      const kws = cardOf(e)!.practiseKeywords!;
      const { displayed, onConcept } = await pageSet(e, "lane");
      const avail = servedPool(e).filter(
        (q) =>
          onConcept.has(String(q.id)) &&
          hasKw(q, kws) &&
          (!e.range || (Number(q.marks) >= e.range.min && Number(q.marks) <= e.range.max)),
      ).length;
      const want = Math.min(avail, 5);
      const got = displayed.slice(0, 5).filter((q) => hasKw(q, kws)).length;
      hits += got;
      possible += want;
      if (got < want) misses.push(`${e.name}: ${got}/${want}`);
      // The #1308 order (no keyword tier), measured for the report.
      const old = await pageSet({ ...e, focus: e.focus }, "lane", { noKeyword: true });
      trunkLikeHits += old.displayed.slice(0, 5).filter((q) => hasKw(q, kws)).length;
    }
    console.info(
      `[QP-CONCEPT-2] hub keyword hits in the first 5: #1308 order ${trunkLikeHits}/${possible} -> lane ${hits}/${possible} over ${hub.length} cards`,
    );
    expect(misses).toEqual([]);
  }, 900_000);

  it("★ F3: sibling cards that share one concept bucket no longer get the SAME first 5", async () => {
    const hub = ENTRIES.filter((e) => e.surface === "hub");
    const byBucket = new Map<string, Entry[]>();
    for (const e of hub) {
      const c = cardOf(e);
      if (!c?.practiseConceptKeys?.length || !c.practiseKeywords?.length) continue;
      const k = `${e.slug}|${c.practiseConceptKeys.join("+")}`;
      byBucket.set(k, [...(byBucket.get(k) ?? []), e]);
    }
    const same: string[] = [];
    for (const [k, es] of byBucket) {
      if (es.length < 2) continue;
      const firsts = new Map<string, string>();
      for (const e of es) {
        const ids = (await pageSet(e, "lane")).displayed.slice(0, 5).map((q) => String(q.id)).join(",");
        const twin = firsts.get(ids);
        if (twin) same.push(`${k}: "${twin}" == "${e.focus}"`);
        firsts.set(ids, e.focus ?? "");
      }
    }
    expect(same).toEqual([]);
  }, 600_000);

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
    expect(conceptEndNote("Standard form", 0)).toBe("We don't have questions on Standard form yet — these are from the same chapter.");
  }, 120_000);
});
