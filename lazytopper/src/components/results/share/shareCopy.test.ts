import { describe, it, expect } from "vitest";
import { BYTE_TIPS, ZIGGY_LINES, shareCopyRows } from "./shareCopy";
import { POSES_BY_KIND } from "../../guide/rig";

/** SHARE-CARD-1 - the copy table's owner rules, over EVERY row. */
const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}{]/u.test(w));

describe("share copy table", () => {
  it("every mascot line and label is 14 words or fewer", () => {
    for (const r of shareCopyRows()) expect([r.key, words(r.text).length <= 14]).toEqual([r.key, true]);
  });
  it("never shaming, and never the ½ glyph", () => {
    const SHAMING = /\b(fail\w*|bad|poor|weak|stupid|dumb|lazy|shame\w*|worst|careless|useless|disappoint\w*)\b/i;
    for (const r of shareCopyRows()) {
      expect([r.key, SHAMING.test(r.text)]).toEqual([r.key, false]);
      expect(r.text).not.toContain("½");
    }
  });
  it("Ziggy and Byte poses are real rig poses written for that character", () => {
    for (const v of Object.values(ZIGGY_LINES)) expect(POSES_BY_KIND.ziggy).toContain(v.pose);
    for (const v of Object.values(BYTE_TIPS)) expect(POSES_BY_KIND.byte).toContain(v.pose);
  });
  it("ASCII only (no mojibake risk on the image)", () => {
    for (const r of shareCopyRows()) expect([r.key, /^[\x20-\x7e]*$/.test(r.text)]).toEqual([r.key, true]);
  });
});
