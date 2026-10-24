/**
 * MOMENTS-3 §E / §3 — THE COPY LINT. Every exported character line obeys the personality guide's
 * line rules (H1-H4 and "How they talk"): one idea of at most 22 words (companion lines 18), at most
 * one Hinglish word, at most one "!", no emoji, no "½", and no selling or clingy wording. The lint
 * reads the exported copy tables themselves, so a new line that breaks a rule fails here.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPANION_COPY, MILESTONE_COPY } from "./companion/companionChunk";
import { MOMENT_COPY } from "./moments/momentsChunk";
import { SCORE_GUIDE_LINES } from "./scoreGuideModel";
import { AHA_COPY } from "./ahaModel";
import { MISTAKE_TYPE_LABEL } from "../../lib/mistakeDisplay";
import { GUIDE_COPY } from "./guideChunk";
import { ENTRY_COPY, TRENDS_COPY } from "./pages/pageGuidesChunk";
import { M7_COPY } from "./pages/m7Copy";
import { GUIDE_LINES } from "./intentMap";
import { FILTER_HELP_COPY, FILTER_COMBINE_LINE } from "./filterHelp/filterHelpChunk";
import { PUBLIC_PEEK_COPY } from "./public/publicPeekModel";
import { SAVE_NUDGE_COPY, WRONG_TAP_COPY } from "./saveNudge/saveNudge";
import { MI_VOICE_COPY } from "./mi/miVoiceModel";
import { MUMMY_COPY } from "./mummy/mummyModel";
import { ziggyReactionFor } from "./ziggyModel";
import { CI_DEMO_COPY, CI_DEMO_ORDER, CI_DEMO_SAMPLES } from "../ciDemo/ciDemoSamples";

export const HINGLISH = ["chalo", "yaar", "bas", "josh", "ek", "arre", "accha", "achha", "theek", "mast", "bahut", "jaldi", "chal", "bilkul", "chalega"];
const SELLING = /\b(premium(?!'s)|upgrade|unlock|discount|offer|buy|pay now|subscribe|limited time|hurry)\b/i;
const CLINGY = /missed you|miss you|best friend|don't leave|do not leave|sad you left|break your streak|broke your streak/i;
const EMOJI = /\p{Extended_Pictographic}/u;

export function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
export function hinglishCount(s: string): number {
  const toks = s.toLowerCase().match(/[a-z']+/g) ?? [];
  return toks.filter((t) => HINGLISH.includes(t)).length;
}
/** The rule violations of one line (empty = clean). `limit` 22, or 18 for a companion line. */
export function lineProblems(raw: string, limit = 22): string[] {
  const s = raw.replace(/\{\w+\}/g, "1");
  const out: string[] = [];
  if (words(s) > limit) out.push(`${words(s)} words (max ${limit})`);
  if ((s.match(/!/g) ?? []).length > 1) out.push("more than one !");
  if (EMOJI.test(s)) out.push("emoji");
  if (s.includes("½")) out.push("½ glyph");
  if (hinglishCount(s) > 1) out.push("more than one Hinglish word");
  if (SELLING.test(s)) out.push("selling word");
  if (CLINGY.test(s)) out.push("clingy / guilt wording");
  return out;
}

function strings(o: unknown, into: string[] = []): string[] {
  if (typeof o === "string") into.push(o);
  else if (Array.isArray(o)) for (const v of o) strings(v, into);
  else if (o && typeof o === "object") for (const v of Object.values(o as object)) strings(v, into);
  return into;
}
const lines = (o: unknown, skip: RegExp = /^$/): string[] => strings(o).filter((s) => !skip.test(s));

// Labels, buttons and admin pills are not character lines.
const UI = /^(Close|Skip|Admin preview|Got it|Fix one thing|Warm up: 5 questions|Close Byte|Close the guide|Byte's guide|For you|Back to all options|Open Byte's guide|Hide Byte for now|Close filter help|What the filters mean|Byte explains this page)$/;

describe("copy lint — every character line obeys the guide", () => {
  const companion = lines({ ...COMPANION_COPY, ...MILESTONE_COPY }, UI);
  it.each(companion)("companion (<= 18 words): %s", (l) => {
    expect(lineProblems(l, 18)).toEqual([]);
  });

  const others: Array<[string, string[]]> = [
    ["moments", lines(MOMENT_COPY, UI)],
    ["guide", lines(GUIDE_COPY, UI).filter((l) => !/^Great pick! Opening/.test(l))],
    ["scorecard", lines(SCORE_GUIDE_LINES.ziggy).concat(lines(SCORE_GUIDE_LINES.byte)).map((l) => l.replace(/\{lead\}/g, "Biggest loss").replace(/\{loss\}/g, "2 marks"))],
    ["aha", [AHA_COPY.ziggy.replace("{name}", MISTAKE_TYPE_LABEL.calculation), AHA_COPY.byte]],
    ["entry", lines(ENTRY_COPY)],
    ["trends", [TRENDS_COPY.intro, TRENDS_COPY.tip, ...TRENDS_COPY.items.map((i) => i.line)]],
    ["m7", lines(M7_COPY.trialHit).concat([M7_COPY.resetMidnight, M7_COPY.resetAt.replace("{when}", "9 pm"), M7_COPY.still, M7_COPY.dialogDone.replace("{n}", "5"), M7_COPY.dialogDoneOne, M7_COPY.dialogDoneUnknown, M7_COPY.premiumHit.replace("{window}", "daily")])],
    ["byte opening", [GUIDE_LINES.default, GUIDE_LINES.cbq, GUIDE_LINES.chapter("Triangles"), GUIDE_LINES.important, GUIDE_LINES.papers]],
    ["filters", [FILTER_HELP_COPY.byteIntro, FILTER_HELP_COPY.emptyZiggy, FILTER_COMBINE_LINE]],
    ["peek", [PUBLIC_PEEK_COPY.notesLine, PUBLIC_PEEK_COPY.hubLine("Triangles"), PUBLIC_PEEK_COPY.quickFailed]],
    ["save nudge", [SAVE_NUDGE_COPY.ziggy, SAVE_NUDGE_COPY.plain, WRONG_TAP_COPY.ziggy]],
    ["mi voice", [MI_VOICE_COPY.noData, MI_VOICE_COPY.thin, MI_VOICE_COPY.untyped("2", 2), MI_VOICE_COPY.careless("2 marks"), MI_VOICE_COPY.knowledge("2 marks"), MI_VOICE_COPY.technique("2 marks")]],
    ["mummy", [MUMMY_COPY.tapLine]],
    // CI-SOFT-1 — the sample-marking card: its fixed lines, and every step line and summary Byte says.
    [
      "ci demo (CI-SOFT-1)",
      [
        CI_DEMO_COPY.l1,
        CI_DEMO_COPY.l2,
        CI_DEMO_COPY.l4,
        CI_DEMO_COPY.l9,
        ...CI_DEMO_ORDER.flatMap((k) => [...CI_DEMO_SAMPLES[k].steps.map((st) => st.say), CI_DEMO_SAMPLES[k].summary]),
      ],
    ],
    [
      "Byte's option lines (intentMap point:)",
      Array.from(readFileSync("src/components/guide/intentMap.ts", "utf8").matchAll(/point: "([^"]+)"/g)).map((m) => m[1]),
    ],
    [
      "ziggy first result",
      [
        ziggyReactionFor({ kind: "marks", awarded: 10, total: 10 } as never),
        ziggyReactionFor({ kind: "marks", awarded: 6, total: 10 } as never),
        ziggyReactionFor({ kind: "marks", awarded: 2, total: 10 } as never),
      ].flatMap((r) => (r ? [r.line, ...(r.after ? [r.after.line] : [])] : [])),
    ],
  ];
  for (const [name, list] of others) {
    it(`${name}: ${list.length} lines`, () => {
      expect(list.length).toBeGreaterThan(0);
      const bad = list.map((l) => [l, lineProblems(l)] as const).filter(([, p]) => p.length > 0);
      expect(bad).toEqual([]);
    });
  }

  it("the lint itself is alive (control)", () => {
    expect(lineProblems("Wow! Great! Chalo yaar", 22).length).toBeGreaterThan(0);
    expect(lineProblems("one two three", 2)).toEqual(["3 words (max 2)"]);
    expect(lineProblems("Nice work 🎉")).toEqual(["emoji"]);
    expect(lineProblems("Upgrade to Premium")).toEqual(["selling word"]);
    expect(lineProblems("Missed you!")).toEqual(["clingy / guilt wording"]);
  });
});
