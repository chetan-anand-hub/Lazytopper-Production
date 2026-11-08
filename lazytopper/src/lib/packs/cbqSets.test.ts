/** BRIDGE-CODES-1 round 2 - CBQ Pack chapters as gradable sets of ~10-15; every question once; a case never split. */
import { describe, expect, it } from "vitest";
import { CBQ_SET_MAX, cbqSets, cbqUnits } from "./cbqSets";
import { cbqPackRows, loadChapter } from "./packContent";
import { PACK_CHAPTER_SLUGS } from "../../services/packs";

const CASE = "A school is planning a solar-powered science fair. The organisers measured the length of each table and the power needed by every stall before the day began.";
const row = (id: string, text = `Question ${id}: find the value asked.`) => ({ id, questionText: text });

describe("cbqSets (pure)", () => {
  it("no rows -> no sets; up to 15 rows -> one set", () => {
    expect(cbqSets([])).toEqual([]);
    const r = Array.from({ length: 15 }, (_, i) => row(`q${i}`));
    expect(cbqSets(r)).toEqual([r]);
  });

  it("every row exactly once, sets balanced, each in printing order, deterministic", () => {
    const r = Array.from({ length: 101 }, (_, i) => row(`q${String(i).padStart(3, "0")}`));
    const sets = cbqSets(r);
    expect(sets).toHaveLength(Math.ceil(101 / CBQ_SET_MAX));
    expect(sets.flat().map((x) => x.id).sort()).toEqual(r.map((x) => x.id));
    const sizes = sets.map((s) => s.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    for (const s of sets) expect(s.map((x) => x.id)).toEqual([...s.map((x) => x.id)].sort());
    expect(cbqSets(r)).toEqual(sets);
  });

  it("rows sharing one case passage stay together in one set, contiguous", () => {
    const r = [
      ...Array.from({ length: 14 }, (_, i) => row(`a${i}`)),
      row("c1", `${CASE} (i) Find the total length.`),
      row("c2", `${CASE}   (ii) Find the power.`),
      row("c3", `${CASE} (iii) Which stall needs most?`),
      ...Array.from({ length: 14 }, (_, i) => row(`b${i}`)),
    ];
    expect(cbqUnits(r).find((u) => u[0].id === "c1")!.map((x) => x.id)).toEqual(["c1", "c2", "c3"]);
    const sets = cbqSets(r);
    const holder = sets.filter((s) => s.some((x) => x.id.startsWith("c")));
    expect(holder).toHaveLength(1);
    const ids = holder[0].map((x) => x.id);
    expect(ids.slice(ids.indexOf("c1"), ids.indexOf("c1") + 3)).toEqual(["c1", "c2", "c3"]);
  });
});

describe("cbqSets on the real CBQ pack chapters", () => {
  it("every chapter: sets of ~10-15, every CBQ exactly once, known shared-passage cases never split", async () => {
    const table: string[] = [];
    for (const slug of PACK_CHAPTER_SLUGS) {
      await loadChapter(slug);
      const rows = cbqPackRows(slug);
      const sets = cbqSets(rows);
      expect(sets.flat().map((x) => x.id).sort(), slug).toEqual(rows.map((x) => x.id).sort());
      for (const s of sets) {
        expect(s.length, slug).toBeGreaterThanOrEqual(10);
        expect(s.length, slug).toBeLessThanOrEqual(CBQ_SET_MAX + 2);
      }
      table.push(`${slug}: ${rows.length} Q -> ${sets.length} sets [${sets.map((s) => `${s.length}Q/${s.reduce((m, q) => m + (Number(q.marks) || 0), 0)}m`).join(", ")}]`);
    }
    for (const group of [
      ["CFPQ-S-ABS-008", "CFPQ-S-ABS-009", "CFPQ-S-ABS-010"],
      ["CFPQ-S-MNM-001", "CFPQ-S-MNM-002", "CFPQ-S-MNM-003"],
      ["CFPQ-S-ELEC-003", "CFPQ-S-ELEC-005"],
    ]) {
      const slug = PACK_CHAPTER_SLUGS.find((s) => cbqPackRows(s).some((q) => q.id === group[0]))!;
      const sets = cbqSets(cbqPackRows(slug));
      expect(sets.filter((s) => s.some((q) => group.includes(q.id))), group[0]).toHaveLength(1);
    }
    if (process.env.CBQ_SETS_TABLE === "1") console.log(`CBQSETS\n${table.join("\n")}`);
  }, 300000);
});

describe("cbqParts (owner 8 Nov 22:45: deliver in parts of 2 sets)", () => {
  it("splits sets in order into ceil(n/2) near-equal parts of at most 2, every set once", async () => {
    const { cbqParts, CBQ_SETS_PER_PART } = await import("./buildPackFiles");
    expect(CBQ_SETS_PER_PART).toBe(2);
    expect(cbqParts([])).toEqual([]);
    const mk = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    expect(cbqParts(mk(9))).toEqual([[1, 2], [3, 4], [5, 6], [7, 8], [9]]);
    expect(cbqParts(mk(8))).toEqual([[1, 2], [3, 4], [5, 6], [7, 8]]);
    expect(cbqParts(mk(7))).toEqual([[1, 2], [3, 4], [5, 6], [7]]);
    for (let n = 1; n <= 12; n += 1) {
      const p = cbqParts(mk(n));
      expect(p.flat()).toEqual(mk(n));
      expect(p.length).toBe(Math.ceil(n / 2));
      for (const x of p) expect(x.length).toBeLessThanOrEqual(2);
    }
  }, 120000);
});
