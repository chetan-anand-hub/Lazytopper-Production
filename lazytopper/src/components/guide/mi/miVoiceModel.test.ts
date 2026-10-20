import { describe, it, expect } from "vitest";
import { MI_VOICE_STATES, miVoiceFor, type MiVoiceInput } from "./miVoiceModel";
import { POSES_BY_KIND } from "../rig";

/**
 * MI-VOICE-1 — the fixed templates. Table-driven: every line's numbers are the input's own
 * strings (the card's printed figures), and nothing else.
 */
const NUMBERS = /\d+(?:\.\d+)?/g;

const TABLE: Array<{ input: MiVoiceInput; state: string | null; kind?: string; pose?: string; line?: string; bag?: number }> = [
  { input: { kind: "loading" }, state: null },
  { input: { kind: "signed-out" }, state: null },
  { input: { kind: "error" }, state: null },
  { input: { kind: "no-data" }, state: "no_data", kind: "ziggy", pose: "detective", line: "No clues yet. Check one answer and I'll start looking." },
  { input: { kind: "with-data", namesWeakness: false, topLoss: null }, state: "thin", kind: "ziggy", pose: "detective", line: "I need a few more clues before I can spot a pattern." },
  // Below the gate a topLoss can never reach the character (the card names none either).
  { input: { kind: "with-data", namesWeakness: false, topLoss: { group: "careless", amount: "9 marks" } }, state: "thin", kind: "ziggy", pose: "detective", line: "I need a few more clues before I can spot a pattern." },
  { input: { kind: "untyped", lost: 12, lostText: "12" }, state: "untyped", kind: "ziggy", pose: "bag", line: "12 marks waiting for me.", bag: 12 },
  { input: { kind: "untyped", lost: 1, lostText: "1" }, state: "untyped", kind: "ziggy", pose: "bag", line: "1 mark waiting for me.", bag: 1 },
  { input: { kind: "untyped", lost: 3.5, lostText: "3.5" }, state: "untyped", kind: "ziggy", pose: "bag", line: "3.5 marks waiting for me." },
  { input: { kind: "untyped", lost: 0, lostText: "0" }, state: null },
  { input: { kind: "with-data", namesWeakness: true, topLoss: { group: "careless", amount: "1.5 marks" } }, state: "careless", kind: "ziggy", pose: "oops", line: "Oops! These were slips, not the method. 1.5 marks to win back." },
  { input: { kind: "with-data", namesWeakness: true, topLoss: { group: "knowledge", amount: "4 marks" } }, state: "knowledge", kind: "ziggy", pose: "confused", line: "4 marks went where I didn't get the idea yet." },
  { input: { kind: "with-data", namesWeakness: true, topLoss: { group: "technique", amount: "3 mistakes" } }, state: "technique", kind: "byte", pose: "technique", line: "On these, the working was right. 3 mistakes went on what the examiner checks." },
  { input: { kind: "with-data", namesWeakness: true, topLoss: null }, state: null },
];

/** The strings the card prints for this input (the only allowed source of a number). */
function printed(input: MiVoiceInput): string {
  if (input.kind === "untyped") return input.lostText;
  if (input.kind === "with-data" && input.namesWeakness && input.topLoss) return input.topLoss.amount;
  return "";
}

describe("MI-VOICE-1 · miVoiceFor — state → character, pose, line", () => {
  for (const row of TABLE) {
    it(`${JSON.stringify(row.input)} → ${row.state ?? "nothing"}`, () => {
      const v = miVoiceFor(row.input);
      if (row.state === null) {
        expect(v).toBeNull();
        return;
      }
      expect(v).not.toBeNull();
      expect(v!.state).toBe(row.state);
      expect(v!.kind).toBe(row.kind);
      expect(v!.pose).toBe(row.pose);
      expect(v!.line).toBe(row.line);
      expect(v!.bagLabel).toBe(row.bag);
      // ★ every number in the line is one the card printed
      const src = printed(row.input);
      for (const n of v!.line.match(NUMBERS) ?? []) expect(src.match(NUMBERS) ?? []).toContain(n);
      // the pose belongs to that character in the rig
      expect(POSES_BY_KIND[v!.kind]).toContain(v!.pose);
    });
  }

  it("every analytics state is reachable from the table", () => {
    const reached = new Set(TABLE.map((r) => r.state).filter(Boolean));
    for (const s of MI_VOICE_STATES) expect(reached.has(s)).toBe(true);
  });
});
