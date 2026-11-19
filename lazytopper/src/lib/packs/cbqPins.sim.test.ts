/**
 * CBQ-PIN-1 simulation: 5 extra rows become newly eligible CBQ rows (every CBQ row is step-marked today, so the simulation flags + step-marks 5 ordinary rows) and 3 pinned rows leave the served bank.
 * Existing sets must not change (the hidden rows stay from the raw bank) and exactly 1 new set (the 5 rows) is appended with a new code.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

const hidden = vi.hoisted(() => new Set<string>());
const stepMark = vi.hoisted(() => new Set<string>());
vi.mock("../../data/bankChapters/loader", async (orig) => {
  const m = await orig<typeof import("../../data/bankChapters/loader")>();
  const tweak = <T extends { id: string; marks: number | string; solutionSteps?: string[] }>(rows: T[]): T[] =>
    rows
      .filter((q) => !hidden.has(q.id))
      .map((q) => (stepMark.has(q.id) ? { ...q, competencyVerified: true as const, solutionSteps: [`[${Number(q.marks) || 1} mark] worked step`] } : q));
  return {
    ...m,
    getBankRows: (slugs: Iterable<string>) => tweak(m.getBankRows(slugs) as never) as never,
    getBankRowsForSubject: (s: string) => tweak(m.getBankRowsForSubject(s) as never) as never,
  };
});

import { ensureAllBankChapters, getBankRows } from "../../data/bankChapters/loader";
import { isCbq } from "../cbq/cbqClassification";
import { cbqSets } from "./cbqSets";
import { cbqPackRows, isCbqPackRow } from "./packContent";
import { allCbqPins, cbqSetsFor, partSizes } from "./cbqPins";
import { packPaperCode } from "./packPaperCode";
import { PACK_CHAPTER_SLUGS } from "../../services/packs";

beforeAll(async () => {
  await ensureAllBankChapters();
}, 120_000);

describe("CBQ-PIN-1 simulation", () => {
  it("5 newly step-marked rows + 3 hidden pinned rows: pinned sets unchanged, ONE new set appended with a new code", async () => {
    // find a chapter with >= 5 CBQ rows that are ineligible only because they are not step-marked
    let slug = "";
    let extra: string[] = [];
    const asEligible = <T extends { marks: number | string }>(q: T) => ({ ...q, competencyVerified: true as const, solutionSteps: [`[${Number(q.marks) || 1} mark] worked step`] });
    for (const s of PACK_CHAPTER_SLUGS) {
      const pinned = new Set((allCbqPins()[s]?.sets ?? []).flat());
      const cands = getBankRows([s])
        .filter((q) => !isCbq(q) && !pinned.has(q.id) && Number(q.marks) >= 2 && isCbqPackRow(asEligible(q) as never))
        .map((q) => q.id);
      if (cands.length >= 5) {
        slug = s;
        extra = cands.slice(0, 5);
        break;
      }
    }
    stepMark.clear();
    expect(slug, "a chapter with 5 convertible CBQ rows").not.toBe("");
    const pin = allCbqPins()[slug];
    const before = pin.sets.map((s) => [...s]);
    // hide 3 pinned rows from the served bank
    const gone = [pin.sets[0][0], pin.sets[1][0], pin.sets[2][0]];
    gone.forEach((id) => hidden.add(id));
    extra.forEach((id) => stepMark.add(id));

    // the problem: positional dealing now yields different sets
    const dealt = cbqSets(cbqPackRows(slug)).map((s) => s.map((q) => q.id));
    expect(dealt).not.toEqual(before);
    // the pins: the existing sets are exactly as sold, hidden rows kept from the raw bank
    const got = await cbqSetsFor(slug);
    expect(got.sets.map((s) => s.rows.map((q) => q.id))).toEqual(before);
    for (const id of gone) expect(got.sets.flatMap((s) => s.rows.map((q) => q.id))).toContain(id);

    // the generator's append rule: exactly ONE new set holding the 5 new rows, numbered after the last
    const eligible = cbqPackRows(slug);
    expect(extra.every((id) => eligible.some((q) => q.id === id))).toBe(true);
    const have = new Set(before.flat());
    const fresh = eligible.filter((q) => !have.has(q.id));
    expect(fresh.map((q) => q.id).sort()).toEqual([...extra].sort());
    const newSets = cbqSets(fresh);
    expect(newSets.length).toBe(1);
    expect(newSets[0].length).toBe(5);
    const newK = before.length + 1;
    expect(packPaperCode({ kind: "cbq", chapter: slug, set: newK })).not.toBe(packPaperCode({ kind: "cbq", chapter: slug, set: before.length }));
    expect(partSizes(newSets.length)).toEqual([1]);
    hidden.clear();
    stepMark.clear();
  }, 600_000);
});
