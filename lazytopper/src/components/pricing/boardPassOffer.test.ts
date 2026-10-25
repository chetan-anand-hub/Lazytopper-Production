import { describe, expect, it } from "vitest";
import { boardPassOffer, boardPassShortLine } from "./boardPassOffer";
import { ACTIVITY_EVENTS } from "../../services/activityClient";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("boardPassOffer", () => {
  it("leads with the Board Pass, priced from config, monthly second", () => {
    const o = boardPassOffer(new Date("2026-10-26T06:00:00Z"));
    expect(o.title).toBe("Board Pass");
    expect(o.priceDisplay).toMatch(/^₹/);
    expect(o.detail).toMatch(/^Pay once till your boards \(/);
    expect(o.monthlyLine).toMatch(/^₹\d+ for a month$/);
    expect(boardPassShortLine(o)).toBe(`Board Pass ${o.priceDisplay} till boards`);
  });
});

describe("ASK-FIX-1 analytics names", () => {
  const names = ["trial_end_screen_shown", "trial_end_screen_pay", "trial_end_screen_parent", "trial_end_screen_basic", "scorecard_upgrade_shown", "scorecard_upgrade_click"];
  it("are on the client allow-list and mirrored on the server's", () => {
    const server = readFileSync(resolve(__dirname, "../../../server/routes/studentActivity.cjs"), "utf8");
    for (const n of names) {
      expect(ACTIVITY_EVENTS as readonly string[]).toContain(n);
      expect(server).toContain(`'${n}'`);
    }
  });
});
