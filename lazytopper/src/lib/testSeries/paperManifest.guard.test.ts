/**
 * TEST-SERIES-1 — the committed Test Series paper manifest (server/data/testSeriesPapers.json) must equal a fresh generation from
 * the bank, so a bank edit that moves a numbered paper can never silently desync the server's allow-list.
 * Regenerate: `pnpm --filter lazytopper run gen:test-series-manifest` (runs THIS file with LT_WRITE_TEST_SERIES_MANIFEST=1).
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeriesPaperManifest, canonicalQuestionText, serializeSeriesMockIds, serializeSeriesPaperManifest } from "./paperManifest";
import { seriesTotals } from "./testSeries";

const FILE = resolve(__dirname, "../../../server/data/testSeriesPapers.json");
const CLIENT_FILE = resolve(__dirname, "seriesMockIds.generated.json");
/** TS-PACK-1: the canonical-text hash, sha256 hex (the server's canonicalQuestionTextHash hashes the same canonical text). */
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const serverChecks = createRequire(import.meta.url)("../../../server/services/testSeriesChecks.cjs") as {
  canonicalQuestionText: (t: unknown) => string;
  canonicalQuestionTextHash: (t: unknown) => string;
  loadManifest: (file: string, logger: { error: (m: string) => void }) => { count: number; dropped: number };
};

describe("Test Series paper manifest", () => {
  it("the committed files (server manifest + the client's mock-id copy) are byte-identical to a fresh generation", async () => {
    const { entries, mockIds } = await buildSeriesPaperManifest(sha256);
    const fresh = serializeSeriesPaperManifest(entries);
    const freshClient = serializeSeriesMockIds(mockIds);
    if (process.env.LT_WRITE_TEST_SERIES_MANIFEST === "1") {
      mkdirSync(dirname(FILE), { recursive: true });
      writeFileSync(FILE, fresh);
      writeFileSync(CLIENT_FILE, freshClient);
    }
    expect(existsSync(FILE), "server/data/testSeriesPapers.json is committed").toBe(true);
    expect(readFileSync(FILE, "utf8"), "stale manifest: run `pnpm --filter lazytopper run gen:test-series-manifest`").toBe(fresh);
    expect(readFileSync(CLIENT_FILE, "utf8"), "stale client copy: run `pnpm --filter lazytopper run gen:test-series-manifest`").toBe(freshClient);
  }, 600_000);

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
