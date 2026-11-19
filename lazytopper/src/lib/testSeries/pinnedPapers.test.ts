/**
 * TS-PIN-1 - Test Series papers are BUILT FROM THEIR PINNED QUESTION IDS.
 *
 * 1. BYTE-IDENTITY PROOF: for each of the 66 manifest entries, the pinned build equals today's seeded draw (the pre-TS-PIN-1 page
 *    behaviour) in full - question ids, order, sections, qNumbers, marks, CBQ facts, blueprint rows, unit marks, everything the
 *    renderers / grader requests / scorecard read.
 *    ACKNOWLEDGED_DRIFT: a deliberate bank change (retiring rows, new rows) moves the SEEDED draw but must never move a pinned paper;
 *    the lane that makes such a change lists the moved keys here, with the reason. Any other drift fails.
 * 2. ADMISSION PARITY: each pinned paper's written questions hash to the server manifest's textHashes (what the server admits).
 * 3. A pinned id the served bank no longer serves is kept from the RAW bank; an id absent from both is left out and reported, never swapped.
 * 4. Kill switch VITE_TS_PIN_DISABLED -> today's seeded draw.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { drawChapterTest, subjectiveQuestions } from "../../components/chaptertest/chapterTestBlueprint";
import { fullMockSubjectiveQuestions } from "../../components/fullmock/fullMockBlueprint";
import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { BANK_RETIRE_1_WITHHELD_SET } from "../../data/bankFix/bankRetire1Withholds";
import { canonicalQuestionText, type SeriesPaperManifestEntry } from "./paperManifest";
import { buildPinnedChapterTest, buildSeriesChapterTest, unservedChapterIds } from "./pinnedChapterTest";
import { buildPinnedFullMock, unservedMockIds } from "./pinnedFullMock";
import { allPinnedSpecs, pinnedSpecOf } from "./pinnedSpec";
import { loadRawBankRowsById } from "./rawBankRows";
import { buildSeriesFullMock, drawSeriesFullMock } from "./seriesFullMock";
import { SERIES_BASE_MOCKS_PER_SUBJECT } from "./seriesCounts";
import { chapterTestSeriesSeed, seriesChapterTests, seriesFullMocks, seriesTotals } from "./testSeries";

/** Keys whose SEEDED draw is allowed to differ from the pinned paper (the bank changed on purpose). Empty at TS-PIN-1.
 *  BANK-RETIRE-1 (19 Nov 2026, owner ruling: retire, not repair): 515 generated AI-pack rows left the served bank, so every chapter's candidate
 *  pool is smaller and the seeded draw of all 26 chapter tests and 15 of the 40 full-length tests moved (13 at the 515, +2 with the four owner-approved withholds). The pinned papers did NOT move (their
 *  ids are in seriesPaperIds.json; the four papers that hold a retired id - TS-CT-M07, M09, M11, M12 - resolve it from the raw bank, proved below). */
const ACKNOWLEDGED_DRIFT: readonly string[] = [
  "TS-CT-M01", "TS-CT-M02", "TS-CT-M03", "TS-CT-M04", "TS-CT-M05", "TS-CT-M06", "TS-CT-M07", "TS-CT-M08", "TS-CT-M09", "TS-CT-M10", "TS-CT-M11", "TS-CT-M12", "TS-CT-M13", "TS-CT-S01", "TS-CT-S02", "TS-CT-S03", "TS-CT-S04", "TS-CT-S05", "TS-CT-S06", "TS-CT-S07", "TS-CT-S08", "TS-CT-S09", "TS-CT-S10", "TS-CT-S11", "TS-CT-S12", "TS-CT-S13",
  "TS-FM-M1", "TS-FM-M4", "TS-FM-M5", "TS-FM-M6", "TS-FM-M8", "TS-FM-M9", "TS-FM-M10", "TS-FM-M11", "TS-FM-M12", "TS-FM-M14", "TS-FM-M18", "TS-FM-M15", "TS-FM-M17", "TS-FM-M20", "TS-FM-S3",
  // STEPMARK-2 batch 1 (19 Nov 2026): hand-sourced Maths ch 1-4 rows gained [N mark] step prefixes; the seeded draw only takes step-marked rows, so these seeded Maths draws moved too. The pins did not.
  "TS-FM-M2", "TS-FM-M3", "TS-FM-M7", "TS-FM-M13", "TS-FM-M16", "TS-FM-M19",
];

/** TS-MORE-1: 180 papers make these loops long; yield to the event loop each paper so the vitest worker keeps answering its heartbeat on a loaded CI runner. */
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const STAMP = "2026-01-01T00:00:00.000Z";
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const entries = JSON.parse(readFileSync(resolve(__dirname, "../../../server/data/testSeriesPapers.json"), "utf8")) as SeriesPaperManifestEntry[];

beforeAll(async () => {
  await ensureAllBankChapters();
}, 120_000);
afterEach(() => vi.unstubAllEnvs());

describe("TS-PIN-1 byte-identity: pinned build == today's seeded draw, for every series paper", () => {
  it("covers every paper: the original 66 plus the TS-MORE-1 papers (130 chapter tests + 50 full-length tests)", () => {
    expect(seriesTotals().total).toBe(180);
    expect(entries.length).toBe(180);
    for (const e of entries) expect(pinnedSpecOf(e.key), e.key).not.toBeNull();
  });

  it("chapter tests: the pinned paper deep-equals drawChapterTest({ fixedSeed }) (ids, order, sections, qNumbers, marks, CBQ, blueprint)", async () => {
    const drifted: string[] = [];
    let compared = 0;
    let newPapers = 0;
    for (const t of seriesChapterTests()) {
      await tick();
      const key = `TS-${t.code}`;
      if (t.paper > 1) {
        // TS-MORE-1 papers 2..5 are pin-only (no seeded twin to compare): each keeps every pinned id, in order, none missing.
        const nspec = pinnedSpecOf(key)!;
        const nargs = { subject: t.subject, topicKey: t.topicKey, topicLabel: t.label, worksheetId: `ct-ts1p${t.paper}-${t.topicKey}--x`, createdAt: STAMP };
        const nun = unservedChapterIds(nspec, t.subject, t.topicKey);
        const np = buildPinnedChapterTest(nargs, nspec, nun.length ? await loadRawBankRowsById(nun) : new Map());
        expect(np.missingIds, key).toEqual([]);
        expect(np.drawn.paper.questions.map((q) => q.id), key).toEqual(nspec.ids);
        newPapers += 1;
        continue;
      }
      const args = { subject: t.subject, topicKey: t.topicKey, topicLabel: t.label, worksheetId: `ct-ts1-${t.topicKey}--x`, code: "CT-#01", name: `${t.label} · Chapter Test`, createdAt: STAMP };
      const draw = drawChapterTest({ ...args, fixedSeed: chapterTestSeriesSeed(t.topicKey) });
      // BANK-RETIRE-1: a pinned id the served bank no longer serves is resolved from the RAW bank, exactly as the page entry does.
      const spec = pinnedSpecOf(key)!;
      const unserved = unservedChapterIds(spec, t.subject, t.topicKey);
      const pinned = buildPinnedChapterTest(args, spec, unserved.length ? await loadRawBankRowsById(unserved) : new Map());
      expect(pinned.missingIds, key).toEqual([]);
      expect(pinned.drawn.paper.questions.map((q) => q.id), `${key} keeps every pinned id, in order`).toEqual(spec.ids);
      if (JSON.stringify(draw.paper.questions.map((q) => q.id)) !== JSON.stringify(pinned.drawn.paper.questions.map((q) => q.id))) {
        drifted.push(key);
        continue;
      }
      expect(pinned.drawn, key).toEqual(draw);
      expect(JSON.stringify(pinned.drawn), `${key} byte-identical JSON`).toBe(JSON.stringify(draw));
      compared += 1;
    }
    expect(drifted.filter((k) => !ACKNOWLEDGED_DRIFT.includes(k)), "a seeded draw moved without being acknowledged").toEqual([]);
    expect(compared + drifted.length).toBe(26);
    expect(newPapers).toBe(seriesChapterTests().length - 26);
  }, 120_000);

  it("full-length tests: the pinned paper deep-equals drawSeriesFullMock (the seeded draw) for the original 40 (papers 21-25 are pin-only)", async () => {
    const drifted: string[] = [];
    let compared = 0;
    let newMocks = 0;
    for (const m of seriesFullMocks()) {
      await tick();
      const key = `TS-${m.code}`;
      if (m.n > SERIES_BASE_MOCKS_PER_SUBJECT) {
        // TS-MORE-1 papers 21..25 are pin-only: each keeps every pinned id, in order, none missing.
        const nspec = pinnedSpecOf(key)!;
        const nid = { worksheetId: `fm-ts1-${m.code}--x`, code: "FM-#01", name: `${m.subject} Full Mock`, createdAt: STAMP };
        const nun = unservedMockIds(nspec, m.subject);
        const np = buildPinnedFullMock(m.subject, nspec, nid, nun.length ? await loadRawBankRowsById(nun) : new Map());
        expect(np.missingIds, key).toEqual([]);
        expect(np.drawn.paper.questions.map((q) => q.id), key).toEqual(nspec.ids);
        newMocks += 1;
        continue;
      }
      const identity = { worksheetId: `fm-ts1-${m.code}--x`, code: "FM-#01", name: `${m.subject} Full Mock`, createdAt: STAMP };
      const draw = drawSeriesFullMock(m.subject, m.n, identity);
      expect(draw, `${key} seeded draw`).not.toBeNull();
      const spec = pinnedSpecOf(key)!;
      const unserved = unservedMockIds(spec, m.subject);
      const pinned = buildPinnedFullMock(m.subject, spec, identity, unserved.length ? await loadRawBankRowsById(unserved) : new Map());
      expect(pinned.missingIds, key).toEqual([]);
      expect(pinned.drawn.paper.questions.map((q) => q.id), `${key} keeps every pinned id, in order`).toEqual(spec.ids);
      if (JSON.stringify(draw!.paper.questions.map((q) => q.id)) !== JSON.stringify(pinned.drawn.paper.questions.map((q) => q.id))) {
        drifted.push(key);
        continue;
      }
      expect(pinned.drawn, key).toEqual(draw);
      expect(JSON.stringify(pinned.drawn), `${key} byte-identical JSON`).toBe(JSON.stringify(draw));
      compared += 1;
    }
    expect(drifted.filter((k) => !ACKNOWLEDGED_DRIFT.includes(k)), "a seeded draw moved without being acknowledged").toEqual([]);
    expect(compared + drifted.length).toBe(40);
    expect(newMocks).toBe(seriesFullMocks().length - 40);
  }, 300_000);
});

describe("TS-PIN-1 admission parity: a pinned paper's written questions are exactly what the server manifest admits", () => {
  it("every written question's canonical-text hash equals the manifest's textHash (all 180 papers)", async () => {
    for (const e of entries) {
      await tick();
      const spec = pinnedSpecOf(e.key)!;
      let written: Array<{ id: string; text: string }>;
      if (e.kind === "chapter") {
        const t = seriesChapterTests().find((x) => `TS-${x.code}` === e.key)!;
        const unserved = unservedChapterIds(spec, t.subject, t.topicKey);
        const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map();
        const p = buildPinnedChapterTest({ subject: t.subject, topicKey: t.topicKey, topicLabel: t.label, worksheetId: "w", createdAt: STAMP }, spec, raw).drawn.paper;
        written = subjectiveQuestions(p).map((q) => ({ id: String(q.id), text: q.questionText }));
      } else {
        const unserved = unservedMockIds(spec, e.subject);
        const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map();
        const p = buildPinnedFullMock(e.subject, spec, { worksheetId: "w", code: "c", name: "n", createdAt: STAMP }, raw).drawn.paper;
        written = fullMockSubjectiveQuestions(p).map((q) => ({ id: String(q.id), text: q.questionText }));
      }
      expect(written.map((w) => w.id), e.key).toEqual(e.sectionBEQuestionIds);
      for (const w of written) expect(sha256(canonicalQuestionText(w.text)), `${e.key} ${w.id}`).toBe(e.textHashes[w.id]);
    }
  }, 300_000);
});

describe("TS-PIN-1 missing pinned ids: keep from the RAW bank; only if truly absent, leave out and say so (never swap)", () => {
  const t = seriesChapterTests().find((x) => x.topicKey === "real-numbers")!;
  const key = `TS-${t.code}`;
  const args = { subject: t.subject, topicKey: t.topicKey, topicLabel: t.label, worksheetId: "w", createdAt: STAMP };
  const base = () => pinnedSpecOf(key)!;
  const withheldRn = () => [...WITHHELD_QUESTION_IDS].find((id) => /^RN-|-RN-/.test(id))!;

  it("a pinned row the served bank no longer serves (withheld) is found in the raw bank, so the paper keeps its own question", async () => {
    const id = withheldRn();
    expect(id).toBeTruthy();
    const spec = { ids: [...base().ids.slice(0, -1), id], sections: base().sections };
    expect(unservedChapterIds(spec, "Maths", "real-numbers")).toEqual([id]);
    const raw = await loadRawBankRowsById([id]);
    expect(raw.has(id)).toBe(true);
    const out = buildPinnedChapterTest(args, spec, raw);
    expect(out.missingIds).toEqual([]);
    expect(out.drawn.paper.questions.map((q) => q.id)).toEqual(spec.ids);
    expect(out.drawn.paper.questions.at(-1)?.questionText).toBe(raw.get(id)!.questionText);
  }, 120_000);

  it("an id absent from the served AND raw bank is LEFT OUT and reported: no substitute, other questions untouched, numbering contiguous", () => {
    const spec = { ids: [...base().ids.slice(0, 5), "ZZ-NOT-A-QUESTION", ...base().ids.slice(5)], sections: `${base().sections.slice(0, 5)}B${base().sections.slice(5)}` };
    const out = buildPinnedChapterTest(args, spec, new Map());
    expect(out.missingIds).toEqual(["ZZ-NOT-A-QUESTION"]);
    expect(out.drawn.paper.questions.map((q) => q.id)).toEqual(base().ids);
    expect(out.drawn.paper.questions.map((q) => q.qNumber)).toEqual(base().ids.map((_, i) => i + 1));
    expect(out.drawn.paper.questions.length).toBe(spec.ids.length - 1);
  });

  it("Full-Length: same behaviour (withheld row kept from the raw bank; truly absent id left out and reported)", async () => {
    const m = seriesFullMocks().find((x) => x.subject === "Maths" && x.n === 1)!;
    const mk = `TS-${m.code}`;
    const spec = pinnedSpecOf(mk)!;
    const id = withheldRn();
    const swapped = { ids: [...spec.ids.slice(0, 1), id, ...spec.ids.slice(2)], sections: spec.sections };
    expect(unservedMockIds(swapped, "Maths")).toContain(id);
    const raw = await loadRawBankRowsById([id]);
    const kept = buildPinnedFullMock("Maths", swapped, { worksheetId: "w", code: "c", name: "n", createdAt: STAMP }, raw);
    expect(kept.missingIds).toEqual([]);
    expect(kept.drawn.paper.questions[1].id).toBe(id);
    const gone = buildPinnedFullMock("Maths", { ids: [...spec.ids, "ZZ-NOT-A-QUESTION"], sections: `${spec.sections}E` }, { worksheetId: "w", code: "c", name: "n", createdAt: STAMP });
    expect(gone.missingIds).toEqual(["ZZ-NOT-A-QUESTION"]);
    expect(gone.drawn.paper.questions.map((q) => q.id)).toEqual(spec.ids);
  }, 120_000);
});

describe("BANK-RETIRE-1: a retired row on a pinned series paper is still served FROM THE RAW BANK, with its stored steps", () => {
  const rawById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q] as const));
  const servedIds = new Set(canonicalQuestionBank.map((q) => q.id));
  const holders = Object.entries(allPinnedSpecs()).flatMap(([key, spec]) => {
    const ids = spec.ids.filter((id) => BANK_RETIRE_1_WITHHELD_SET.has(id));
    return ids.length ? [{ key, spec, ids }] : [];
  });

  it("non-vacuous: pinned series papers do hold retired ids, and none of those ids is served", () => {
    expect(holders.length).toBeGreaterThan(0);
    for (const h of holders) for (const id of h.ids) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(servedIds.has(id), id).toBe(false);
      expect(rawById.has(id), id).toBe(true);
    }
  });

  it("the page entries return the pinned paper whole: every id present, none missing, steps and answer identical to the stored row", async () => {
    for (const { key, spec, ids } of holders) {
      let questions;
      let missing: string[];
      if (key.startsWith("TS-CT-")) {
        const t = seriesChapterTests().find((x) => `TS-${x.code}` === key)!;
        const r = await buildSeriesChapterTest(key, { subject: t.subject, topicKey: t.topicKey, topicLabel: t.label, worksheetId: "w", createdAt: STAMP });
        questions = r!.drawn.paper.questions;
        missing = r!.missingIds;
      } else {
        const m = seriesFullMocks().find((x) => `TS-${x.code}` === key)!;
        const r = await buildSeriesFullMock(m.subject, m.n, { worksheetId: "w", code: "FM-#01", name: "n", createdAt: STAMP });
        questions = r!.drawn.paper.questions;
        missing = r!.missingIds;
      }
      expect(missing, key).toEqual([]);
      expect(questions.map((q) => q.id), key).toEqual(spec.ids);
      for (const id of ids) {
        const got = questions.find((q) => q.id === id)!;
        const raw = rawById.get(id)!;
        expect(got.solutionSteps, `${key} ${id} steps`).toEqual(raw.solutionSteps);
        expect(got.finalAnswer, `${key} ${id} finalAnswer`).toEqual(raw.finalAnswer);
        expect(got.questionText, `${key} ${id} text`).toBe(raw.questionText);
      }
    }
  }, 300_000);
});

describe("TS-PIN-1 page entries and the kill switch", () => {
  const t = seriesChapterTests().find((x) => x.topicKey === "polynomials")!;
  const args = { subject: t.subject, topicKey: t.topicKey, topicLabel: t.label, worksheetId: "w", createdAt: STAMP };
  const m = seriesFullMocks().find((x) => x.subject === "Science" && x.n === 3)!;
  const identity = { worksheetId: "w", code: "FM-#01", name: "Science Full Mock", createdAt: STAMP };

  it("default: both entries return the pinned paper", async () => {
    const ct = await buildSeriesChapterTest(`TS-${t.code}`, args);
    expect(ct?.drawn.paper.questions.map((q) => q.id)).toEqual(allPinnedSpecs()[`TS-${t.code}`].ids);
    const fm = await buildSeriesFullMock(m.subject, m.n, identity);
    expect(fm?.drawn.paper.questions.map((q) => q.id)).toEqual(allPinnedSpecs()[`TS-${m.code}`].ids);
  }, 120_000);

  it("VITE_TS_PIN_DISABLED: the chapter entry yields null (the page draws as before) and the mock is today's seeded draw, identical", async () => {
    vi.stubEnv("VITE_TS_PIN_DISABLED", "1");
    expect(await buildSeriesChapterTest(`TS-${t.code}`, args)).toBeNull();
    const fm = await buildSeriesFullMock(m.subject, m.n, identity);
    expect(fm?.missingIds).toEqual([]);
    expect(JSON.stringify(fm?.drawn)).toBe(JSON.stringify(drawSeriesFullMock(m.subject, m.n, identity)));
  }, 120_000);

  it("an unknown paper key has no spec, so the page falls back to the seeded draw", async () => {
    expect(await buildSeriesChapterTest("TS-CT-NOPE", args)).toBeNull();
  });
});
