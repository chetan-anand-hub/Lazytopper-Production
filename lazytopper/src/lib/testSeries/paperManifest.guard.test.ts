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
import { seriesTotals } from "./testSeries";
import { RAW_CANONICAL_QUESTION_BANK } from "../../data/canonicalQuestionBank";
import { predictedQuestions } from "../../data/predictedQuestions";
import { sciencePredictedQuestions } from "../../data/predictedQuestionsScience";
import { CT_BLUEPRINT } from "../../components/chaptertest/chapterTestBlueprint";
import { FM_BLUEPRINT } from "../../components/fullmock/fullMockBlueprint";

const FILE = resolve(__dirname, "../../../server/data/testSeriesPapers.json");
const CLIENT_FILE = resolve(__dirname, "seriesPaperIds.json");
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
    const fresh = await buildSeriesPaperManifest(sha256);
    const merged = appendNewSeriesPapers(readEntries(), existsSync(CLIENT_FILE) ? readIds() : {}, fresh);
    writeFileSync(FILE, serializeSeriesPaperManifest(merged.entries));
    writeFileSync(CLIENT_FILE, serializeSeriesPaperIds(merged.paperIds));
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

  it("TS-PACK-1: every written id carries a canonical-text hash, and the SERVER loads all of them (66 papers, none dropped)", () => {
    const entries = JSON.parse(readFileSync(FILE, "utf8")) as Array<{ key: string; sectionBEQuestionIds: string[]; textHashes?: Record<string, string> }>;
    for (const e of entries) {
      expect(Object.keys(e.textHashes ?? {}).sort(), e.key).toEqual([...e.sectionBEQuestionIds].sort());
      for (const h of Object.values(e.textHashes ?? {})) expect(h, e.key).toMatch(/^[0-9a-f]{64}$/);
    }
    const errors: string[] = [];
    const loaded = serverChecks.loadManifest(FILE, { error: (m) => errors.push(m) });
    expect(loaded.count).toBe(seriesTotals().total);
    expect(loaded.count).toBe(66);
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
