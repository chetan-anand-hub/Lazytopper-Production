/**
 * CBQ-PIN-1 - the CBQ Pack's sets are pinned (packCbqSetIds.json); new eligible rows become NEW sets appended after the last one.
 * Append-only generator: LT_WRITE_CBQ_PINS=1 vitest run src/lib/packs/cbqPins.test.ts (appends only; never alters a pinned set).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { PACK_CHAPTER_SLUGS, packIdOf } from "../../services/packs";
import { buildPackFiles, cbqParts, type BuildContext } from "./buildPackFiles";
import { cbqSets } from "./cbqSets";
import { PACK_LEDGER_HELD_IDS, cbqPackRows } from "./packContent";
import { allCbqPins, cbqSetsFor, partSizes, type CbqChapterPins } from "./cbqPins";

const FILE = resolve(__dirname, "packCbqSetIds.json");

/** The append-only merge: pinned sets stay as they are; eligible rows in no pinned set become new sets (cbqSets over them) + new parts. */
export function appendCbqPins(committed: Record<string, CbqChapterPins>, eligible: Record<string, Array<{ id: string; questionText: string }>>) {
  const out: Record<string, CbqChapterPins> = {};
  const added: Record<string, number> = {};
  for (const slug of Object.keys({ ...committed, ...eligible })) {
    const cur = committed[slug] ?? { sets: [], parts: [] };
    const have = new Set(cur.sets.flat());
    const fresh = (eligible[slug] ?? []).filter((q) => !have.has(String(q.id)));
    const newSets = cbqSets(fresh).map((s) => s.map((q) => String(q.id)));
    out[slug] = { sets: [...cur.sets, ...newSets], parts: [...cur.parts, ...partSizes(newSets.length)] };
    if (newSets.length) added[slug] = newSets.length;
  }
  return { pins: out, added };
}

const eligibleAll = () => Object.fromEntries(PACK_CHAPTER_SLUGS.map((s) => [s, cbqPackRows(s)]));

beforeAll(async () => {
  await ensureAllBankChapters();
}, 120_000);
afterEach(() => vi.unstubAllEnvs());

describe("CBQ-PIN-1 pins", () => {
  it("CREATE / EXTEND PINS (LT_WRITE_CBQ_PINS=1 only): appends new sets, never alters a pinned one", () => {
    if (process.env.LT_WRITE_CBQ_PINS !== "1") return;
    const committed = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, CbqChapterPins>;
    const { pins, added } = appendCbqPins(committed, eligibleAll());
    writeFileSync(FILE, `${JSON.stringify(pins)}\n`);
    // eslint-disable-next-line no-console
    console.log(`CBQ-PIN-1 generator: new sets ${JSON.stringify(added)}`);
  });

  it("BYTE-IDENTITY: the pins are exactly today's dealing (ids, order, set numbers) and today's part split", () => {
    const pins = allCbqPins();
    for (const slug of PACK_CHAPTER_SLUGS) {
      const today = cbqSets(cbqPackRows(slug)).map((s) => s.map((q) => q.id));
      if ([...(pins[slug]?.sets ?? [])].flat().some((id) => PACK_LEDGER_HELD_IDS.has(id))) {
        // CBQ-PACK-HOLDS: a ledger-held id stays in the (append-only) pin but is never printed. The pin is today's dealing WITH the held ids,
        // so a re-deal over the eligible rows differs; what must hold is that the pin minus the held ids is exactly the eligible rows, and
        // that every pinned set number and the part split are unchanged (the codes stay).
        const pinned = (pins[slug]?.sets ?? []).map((ids) => ids.filter((id) => !PACK_LEDGER_HELD_IDS.has(id)));
        expect(pinned.flat().sort(), `${slug} pin minus holds = eligible rows`).toEqual(today.flat().sort());
        expect(pins[slug].parts, `${slug} parts`).toEqual(partSizes(pins[slug].sets.length));
        continue;
      }
      expect(pins[slug]?.sets ?? [], slug).toEqual(today);
      expect(pins[slug]?.parts ?? [], `${slug} parts`).toEqual(cbqParts(today).map((p) => p.length));
    }
  });

  it("COMPLETE PACK guard: every eligible CBQ row is in exactly one pinned set (else run LT_WRITE_CBQ_PINS=1 in the same PR as the bank edit)", () => {
    const pins = allCbqPins();
    for (const slug of PACK_CHAPTER_SLUGS) {
      const flat = (pins[slug]?.sets ?? []).flat();
      expect(new Set(flat).size, `${slug} no id twice`).toBe(flat.length);
      const missing = cbqPackRows(slug).filter((q) => !flat.includes(q.id)).map((q) => q.id);
      expect(missing, `${slug}: eligible rows in no pinned set`).toEqual([]);
    }
  });

  it("append-only merge: pinned sets untouched, new rows form new sets after the last, parts appended", () => {
    const mk = (id: string) => ({ id, questionText: id });
    const committed = { c: { sets: [["a", "b"], ["c"]], parts: [2] } };
    const { pins, added } = appendCbqPins(committed, { c: ["a", "b", "c", "n1", "n2"].map(mk) });
    expect(pins.c.sets).toEqual([["a", "b"], ["c"], ["n1", "n2"]]);
    expect(pins.c.parts).toEqual([2, 1]);
    expect(added).toEqual({ c: 1 });
  });

  it("the whole CBQ packs build identically with the pins on and with VITE_CBQ_PIN_DISABLED (files, codes, sets, covers), except the chapters that hold a ledger-held row", async () => {
    // CBQ-PACK-HOLDS: a held id stays in the pin and is never printed, so those chapters' pinned sets differ from the kill-switch re-deal by design.
    const heldChapters = PACK_CHAPTER_SLUGS.filter((slug) => allCbqPins()[slug]?.sets.flat().some((id) => PACK_LEDGER_HELD_IDS.has(id)));
    expect(heldChapters.length).toBeGreaterThan(0);
    const run = async () => {
      const sink: Array<{ at: string; v: unknown }> = [];
      let at = "";
      for (const s of ["maths", "science"] as const) {
        const ctx: BuildContext = {
          licensee: { name: "T", email: "t@example.in" },
          owned: [],
          nowIso: () => "2026-11-05T00:00:00.000Z",
          exportPdf: async (ws, m, code) => (sink.push({ at, v: { ws, m, code } }), "x.pdf"),
          exportSetsPdf: async (sets, m, opts) => (sink.push({ at, v: { sets, m, opts } }), "x.pdf"),
        };
        const files = await buildPackFiles({ packId: packIdOf("pack_cbq", s), sku: "pack_cbq", target: s }, ctx);
        sink.push({ at: "list", v: files.map((f) => [f.id, f.label, f.filename, f.codes, f.code]) });
        for (const f of files) {
          at = f.id;
          await f.build();
        }
      }
      return sink;
    };
    const keep = (e: { at: string }) => !heldChapters.some((slug) => e.at.includes(`|${slug}|`));
    const pinned = await run();
    vi.stubEnv("VITE_CBQ_PIN_DISABLED", "1");
    const legacy = await run();
    expect(JSON.stringify(pinned).length).toBeGreaterThan(500_000);
    expect(JSON.stringify(pinned.filter(keep)) === JSON.stringify(legacy.filter(keep))).toBe(true);
  }, 600_000);

  it("pinned sets still cover at least the claimed CBQ floors (per chapter and per subject), so the pack copy stays true", async () => {
    let total = { maths: 0, science: 0 };
    for (const [i, slug] of PACK_CHAPTER_SLUGS.entries()) {
      const { sets } = await cbqSetsFor(slug);
      const n = sets.reduce((a, s) => a + s.rows.length, 0);
      expect(n, slug).toBeGreaterThanOrEqual(100);
      total[i < 13 ? "maths" : "science"] += n;
    }
    expect(total.maths).toBeGreaterThanOrEqual(1400);
    expect(total.science).toBeGreaterThanOrEqual(1400);
  });
});
