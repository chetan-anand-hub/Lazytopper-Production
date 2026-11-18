/**
 * TEST-SERIES-1 — the committed Test Series paper manifest (server/data/testSeriesPapers.json) must equal a fresh generation from
 * the bank, so a bank edit that moves a numbered paper can never silently desync the server's allow-list.
 * Regenerate: `pnpm --filter lazytopper run gen:test-series-manifest` (runs THIS file with LT_WRITE_TEST_SERIES_MANIFEST=1).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeriesPaperManifest, serializeSeriesMockIds, serializeSeriesPaperManifest } from "./paperManifest";
import { seriesTotals } from "./testSeries";

const FILE = resolve(__dirname, "../../../server/data/testSeriesPapers.json");
const CLIENT_FILE = resolve(__dirname, "seriesMockIds.generated.json");

describe("Test Series paper manifest", () => {
  it("the committed files (server manifest + the client's mock-id copy) are byte-identical to a fresh generation", async () => {
    const { entries, mockIds } = await buildSeriesPaperManifest();
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
});
