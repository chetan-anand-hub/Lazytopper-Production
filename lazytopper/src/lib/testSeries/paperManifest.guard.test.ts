/**
 * TS-PIN-1 - the committed Test Series paper manifest (server/data/testSeriesPapers.json) and its client copy of the ids
 * (seriesPaperIds.json) are the SOURCE of the numbered papers: the pages build each paper FROM them, and the server admits written
 * checks only for them. They are NOT regenerated from the bank any more (a bank edit must never move a paper). This guard asserts:
 * every pinned id exists in the raw bank, the papers keep their blueprint counts, keys / worksheet-id prefixes are unique, the two
 * files agree, and the generator is APPEND-ONLY (it can create new papers; it cannot change an existing one).
 * Create NEW papers: `pnpm --filter lazytopper run gen:test-series-manifest` (appends missing entries to both files, nothing else).
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendNewSeriesPapers,
  buildSeriesPaperManifest,
  canonicalQuestionText,
  serializeSeriesPaperIds,
  serializeSeriesPaperManifest,
  type SeriesPaperIds,
  type SeriesPaperManifestEntry,
} from "./paperManifest";
import { SERIES_MAX_MOCKS_PER_SUBJECT, SERIES_MAX_PAPERS_PER_CHAPTER, seriesChapterTests, seriesFullMocks, seriesTotals } from "./testSeries";
import { unservedChapterIds } from "./pinnedChapterTest";
import { unservedMockIds } from "./pinnedFullMock";
import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { PACK_SYLLABUS_EXCLUDED } from "../packs/packContent";
import { questionKey } from "../../utils/questionKey";
import { embeddedRetiredRows } from "./rawBankRows";
import { predictedQuestions } from "../../data/predictedQuestions";
import { sciencePredictedQuestions } from "../../data/predictedQuestionsScience";
import { CT_BLUEPRINT } from "../../components/chaptertest/chapterTestBlueprint";
import { FM_BLUEPRINT } from "../../components/fullmock/fullMockBlueprint";

const FILE = resolve(__dirname, "../../../server/data/testSeriesPapers.json");
const CLIENT_FILE = resolve(__dirname, "seriesPaperIds.json");
/** TS-MORE-1: the retired / withheld rows some pinned papers still hold, embedded so those papers never fetch the raw bank. */
const RETIRED_FILE = resolve(__dirname, "seriesRetiredRows.json");

/** The pinned ids the paper builders find UNSERVED (they then look in the raw bank / the embedded rows). Needs every chapter loaded. */
function unservedPinnedIds(ids: SeriesPaperIds): string[] {
  const out = new Set<string>();
  for (const t of seriesChapterTests()) {
    const spec = ids[`TS-${t.code}`];
    if (spec) for (const id of unservedChapterIds(spec, t.subject, t.topicKey)) out.add(id);
  }
  for (const m of seriesFullMocks()) {
    const spec = ids[`TS-${m.code}`];
    if (spec) for (const id of unservedMockIds(spec, m.subject)) out.add(id);
  }
  return [...out].sort();
}
const rawRowJson = (id: string) => {
  const row = RAW_CANONICAL_QUESTION_BANK.find((q) => String(q.id) === id);
  return row ? (JSON.parse(JSON.stringify(row)) as unknown) : undefined;
};
/** TS-PACK-1: the canonical-text hash, sha256 hex (the server's canonicalQuestionTextHash hashes the same canonical text). */
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const serverChecks = createRequire(import.meta.url)("../../../server/services/testSeriesChecks.cjs") as {
  canonicalQuestionText: (t: unknown) => string;
  canonicalQuestionTextHash: (t: unknown) => string;
  loadManifest: (file: string, logger: { error: (m: string) => void }) => { count: number; dropped: number };
};
const readEntries = () => JSON.parse(readFileSync(FILE, "utf8")) as SeriesPaperManifestEntry[];
const readIds = () => JSON.parse(readFileSync(CLIENT_FILE, "utf8")) as SeriesPaperIds;

describe("Test Series paper manifest", () => {
  it("CREATE NEW PAPERS (LT_WRITE_TEST_SERIES_MANIFEST=1 only): appends entries for keys the files do not have; never changes an existing one", async () => {
    if (process.env.LT_WRITE_TEST_SERIES_MANIFEST !== "1") return;
    const committedIds = existsSync(CLIENT_FILE) ? readIds() : {};
    const fresh = await buildSeriesPaperManifest(sha256, committedIds);
    const merged = appendNewSeriesPapers(readEntries(), committedIds, fresh);
    writeFileSync(FILE, serializeSeriesPaperManifest(merged.entries));
    writeFileSync(CLIENT_FILE, serializeSeriesPaperIds(merged.paperIds));
    // TS-MORE-1: the embedded retired rows (a cache of raw rows, regenerated whole; the pins above are what is append-only).
    await ensureAllBankChapters();
    const rows: Record<string, unknown> = {};
    for (const id of unservedPinnedIds(merged.paperIds)) {
      const row = rawRowJson(id);
      if (row) rows[id] = row;
    }
    writeFileSync(RETIRED_FILE, `${JSON.stringify(rows, null, 2)}\n`);
    // eslint-disable-next-line no-console
    console.log(`TS-PIN-1 generator: added ${merged.added.length} [${merged.added.join(", ")}]; existing papers whose seeded draw has drifted (kept as committed): ${merged.drifted.length}`);
  }, 600_000);

  it("the generator is APPEND-ONLY: an existing entry is never altered, even when a fresh draw differs; a new key is appended", () => {
    const mk = (key: string, ids: string[]): SeriesPaperManifestEntry => ({
      key, subject: "Maths", kind: "chapter", number: 1, paperCode: key, topicKey: "t", worksheetIdPrefix: `p-${key}`,
      questionIds: ids, sectionBEQuestionIds: ids.slice(1), textHashes: {},
    });
    const committed = [mk("K1", ["a", "b"])];
    const committedIds: SeriesPaperIds = { K1: { ids: ["a", "b"], sections: "AB" } };
    const fresh = {
      entries: [mk("K1", ["x", "y"]), mk("K2", ["c", "d"])],
      paperIds: { K1: { ids: ["x", "y"], sections: "AB" }, K2: { ids: ["c", "d"], sections: "AB" } } as SeriesPaperIds,
    };
    const out = appendNewSeriesPapers(committed, committedIds, fresh);
    expect(out.entries[0]).toBe(committed[0]);
    expect(out.paperIds.K1).toEqual({ ids: ["a", "b"], sections: "AB" });
    expect(out.entries.map((e) => e.key)).toEqual(["K1", "K2"]);
    expect(out.added).toEqual(["K2"]);
    expect(out.drifted).toEqual(["K1"]);
  });

  it("every pinned id EXISTS in the raw bank (canonical raw rows; predicted rows for Full-Length papers)", () => {
    const rawIds = new Set(RAW_CANONICAL_QUESTION_BANK.map((q) => String(q.id)));
    const predictedIds = new Set([...predictedQuestions, ...sciencePredictedQuestions].map((q) => String(q.id)));
    const missing: string[] = [];
    for (const e of readEntries()) {
      for (const id of e.questionIds) {
        if (!rawIds.has(id) && !(e.kind === "mock" && predictedIds.has(id))) missing.push(`${e.key}:${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("the papers keep their blueprint counts (Full-Length: A20 B5 C6 D4 E3; Chapter Tests: never more than the blueprint, sections in order)", () => {
    const ids = readIds();
    for (const e of readEntries()) {
      const sections = ids[e.key]?.sections ?? "";
      const count = (c: string) => [...sections].filter((x) => x === c).length;
      if (e.kind === "mock") {
        for (const spec of FM_BLUEPRINT) expect(count(spec.section), `${e.key} section ${spec.section}`).toBe(spec.targetCount);
      } else {
        for (const spec of CT_BLUEPRINT) expect(count(spec.section), `${e.key} section ${spec.section}`).toBeLessThanOrEqual(spec.targetCount);
      }
      expect([...sections].join(""), `${e.key} sections run in board order`).toBe([...sections].sort().join(""));
    }
  });

  it("the client ids file agrees with the server manifest: same keys, same ids in the same order, a section letter per id", () => {
    const ids = readIds();
    const entries = readEntries();
    expect(Object.keys(ids).sort()).toEqual(entries.map((e) => e.key).sort());
    for (const e of entries) {
      const c = ids[e.key];
      expect(c.ids, e.key).toEqual(e.questionIds);
      expect(c.sections.length, e.key).toBe(c.ids.length);
      const written = c.ids.filter((_, i) => c.sections[i] !== "A");
      expect(written, `${e.key} written (B-E) ids`).toEqual(e.sectionBEQuestionIds);
    }
  });

  it("one entry per numbered paper; every paper has questions and its written ids are a subset", () => {
    // (the file holds every paper TS-MORE-1 can offer: 130 chapter papers + 50 full-length papers = seriesTotals().total unflagged)
    const entries = JSON.parse(readFileSync(FILE, "utf8")) as Array<{
      key: string;
      kind: string;
      worksheetIdPrefix: string;
      questionIds: string[];
      sectionBEQuestionIds: string[];
    }>;
    expect(entries.length).toBe(seriesTotals().total);
    expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
    expect(new Set(entries.map((e) => e.worksheetIdPrefix)).size).toBe(entries.length);
    for (const e of entries) {
      expect(e.questionIds.length, e.key).toBeGreaterThan(0);
      expect(e.sectionBEQuestionIds.length, e.key).toBeGreaterThan(0);
      expect(new Set(e.questionIds).size, `${e.key} has no duplicate id`).toBe(e.questionIds.length);
      expect(e.sectionBEQuestionIds.every((id) => e.questionIds.includes(id)), e.key).toBe(true);
    }
  });

  it("TS-PACK-1: every written id carries a canonical-text hash, and the SERVER loads all of them (180 papers, none dropped)", () => {
    const entries = JSON.parse(readFileSync(FILE, "utf8")) as Array<{ key: string; sectionBEQuestionIds: string[]; textHashes?: Record<string, string> }>;
    for (const e of entries) {
      expect(Object.keys(e.textHashes ?? {}).sort(), e.key).toEqual([...e.sectionBEQuestionIds].sort());
      for (const h of Object.values(e.textHashes ?? {})) expect(h, e.key).toMatch(/^[0-9a-f]{64}$/);
    }
    const errors: string[] = [];
    const loaded = serverChecks.loadManifest(FILE, { error: (m) => errors.push(m) });
    expect(loaded.count).toBe(seriesTotals().total);
    expect(loaded.count).toBe(180);
    expect(loaded.dropped).toBe(0);
    expect(errors).toEqual([]);
  });

  it("TS-PACK-1: the client's canonical text and the server's are the SAME function (parity)", () => {
    for (const t of ["Prove that √2 is irrational.", "  a\n\tb   c ", "Caf\u0065\u0301", "", "x²  −  3x + 2 = 0"]) {
      expect(canonicalQuestionText(t)).toBe(serverChecks.canonicalQuestionText(t));
      expect(sha256(canonicalQuestionText(t))).toBe(serverChecks.canonicalQuestionTextHash(t));
    }
  });
});

/* ── TS-MORE-1: 180 papers ─────────────────────────────────────────────────────── */

/** sha256 of the ORIGINAL 66 papers exactly as TS-PIN-1 committed them (JSON.stringify of the first 66 entries / the 66 client specs). */
const ORIGINAL_SERVER_ENTRIES_SHA256 = "85a03f7ffe72e71cdc91e48c924f002c54ee15c22826f20bbe26b81554676d81";
const ORIGINAL_CLIENT_SPECS_SHA256 = "442ea582b09df6a8f4c43c770b53fff7f5e1593934aa061e1e57f7550e54c73d";

describe("TS-MORE-1: the pins are APPEND-ONLY - the original 66 papers are byte-for-byte what TS-PIN-1 committed", () => {
  it("the first 66 server entries and the 66 original client specs hash to the committed digests; the new papers come after them", () => {
    const entries = readEntries();
    expect(sha256(JSON.stringify(entries.slice(0, 66)))).toBe(ORIGINAL_SERVER_ENTRIES_SHA256);
    const ids = readIds();
    const original = Object.fromEntries(entries.slice(0, 66).map((e) => [e.key, ids[e.key]]));
    expect(sha256(JSON.stringify(original))).toBe(ORIGINAL_CLIENT_SPECS_SHA256);
    expect(entries.length).toBe(180);
  });
  it("paper 1 keeps its code, key and worksheet prefix; papers 2..5 use `CT-M01-2` and `ct-ts1p2-<topic>--`", () => {
    const byKey = new Map(readEntries().map((e) => [e.key, e] as const));
    expect(byKey.get("TS-CT-M01")?.worksheetIdPrefix).toBe("ct-ts1-real-numbers--");
    expect(byKey.get("TS-CT-M01-3")?.worksheetIdPrefix).toBe("ct-ts1p3-real-numbers--");
    expect(byKey.get("TS-FM-M24")?.worksheetIdPrefix).toBe("fm-ts1-m24--");
  });
  it("no worksheet-id prefix is a prefix of another (the server admits by startsWith)", () => {
    const prefixes = readEntries().map((e) => e.worksheetIdPrefix);
    for (const a of prefixes) for (const b of prefixes) if (a !== b) expect(b.startsWith(a), `${a} / ${b}`).toBe(false);
  });
});

describe("TS-MORE-1: no question repeats across a chapter's 5 papers, nor across a subject's 25 full-length papers (any section)", () => {
  const ids = readIds();
  const rawById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [String(q.id), q] as const));
  const servedIds = new Set(canonicalQuestionBank.map((q) => String(q.id)));

  it("chapter tests: 5 papers per chapter, every new paper a FULL blueprint (A6 B4 C3 D2), no id and no question text repeated in any section", () => {
    const chapters = seriesChapterTests().filter((t) => t.paper === 1);
    expect(chapters.length).toBe(26);
    for (const c of chapters) {
      const seenId = new Map<string, number>();
      const seenKey = new Map<string, number>();
      for (let k = 1; k <= SERIES_MAX_PAPERS_PER_CHAPTER; k += 1) {
        const key = k === 1 ? `TS-${c.code}` : `TS-${c.code}-${k}`;
        const spec = ids[key];
        expect(spec, key).toBeTruthy();
        const count = (l: string) => [...spec.sections].filter((x) => x === l).length;
        for (const row of CT_BLUEPRINT) expect(count(row.section), `${key} section ${row.section}`).toBe(row.targetCount);
        spec.ids.forEach((id) => {
          expect(seenId.has(id), `${key} repeats ${id} from paper ${seenId.get(id)}`).toBe(false);
          seenId.set(id, k);
          const raw = rawById.get(id);
          if (raw) {
            const qk = questionKey(raw);
            expect(seenKey.has(qk), `${key} ${id} is the same question as one on paper ${seenKey.get(qk)}`).toBe(false);
            seenKey.set(qk, k);
          }
        });
      }
    }
  });

  it("full-length tests: 25 papers per subject, each the full blueprint (A20 B5 C6 D4 E3), no id repeated in ANY section (A included)", () => {
    for (const subject of ["M", "S"]) {
      const seen = new Map<string, number>();
      for (let n = 1; n <= SERIES_MAX_MOCKS_PER_SUBJECT; n += 1) {
        const spec = ids[`TS-FM-${subject}${n}`];
        expect(spec, `FM-${subject}${n}`).toBeTruthy();
        const count = (l: string) => [...spec.sections].filter((x) => x === l).length;
        for (const row of FM_BLUEPRINT) expect(count(row.section), `FM-${subject}${n} section ${row.section}`).toBe(row.targetCount);
        for (const id of spec.ids) {
          expect(seen.has(id), `FM-${subject}${n} repeats ${id} from FM-${subject}${seen.get(id)}`).toBe(false);
          seen.set(id, n);
        }
      }
    }
  });

  it("every question on a NEW paper comes from the CURRENT served bank and is not a syllabus-excluded row", () => {
    for (const e of readEntries().slice(66)) {
      for (const id of e.questionIds) {
        expect(PACK_SYLLABUS_EXCLUDED.has(id), `${e.key} ${id} is syllabus-excluded`).toBe(false);
        // Full-length papers also draw predicted rows (not in the canonical bank); chapter papers are canonical only.
        if (e.kind === "chapter") expect(servedIds.has(id), `${e.key} ${id} is not served`).toBe(true);
      }
    }
  });
});

describe("TS-MORE-1: the retired rows some original papers still hold are EMBEDDED (no raw-bank chunk on those papers)", () => {
  it("every pinned id the served bank does not serve has an embedded row, and each embedded row EQUALS its raw bank row", async () => {
    await ensureAllBankChapters();
    const embedded = embeddedRetiredRows();
    const unserved = unservedPinnedIds(readIds());
    expect(unserved.length, "non-vacuous: today's pins hold retired rows").toBeGreaterThan(0);
    expect(Object.keys(embedded).sort()).toEqual(unserved);
    for (const id of unserved) expect(embedded[id], `${id} embedded row differs from the raw bank row (regenerate: gen:test-series-manifest)`).toEqual(rawRowJson(id));
  }, 120_000);
});
