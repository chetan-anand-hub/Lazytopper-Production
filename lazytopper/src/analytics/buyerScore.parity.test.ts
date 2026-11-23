// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { classifySource, hourBlock, istHour, landingGroup, scoreOf, tierOf } from "./buyerScore";
import POINTS from "../config/buyerScorePoints.json";

/**
 * BUYER-SCORE-1 - the client (src/analytics/buyerScore.ts) and the admin server (server/services/buyerScore.cjs) are two ports
 * of the same rules over ONE points table. This fails if they ever disagree.
 */
const req = createRequire(import.meta.url);
const srv = req("../../server/services/buyerScore.cjs") as {
  classifySource: (s: unknown) => string;
  landingGroup: (l: unknown) => string;
  hourBlock: (h: number) => string;
  istHour: (ms: number) => number;
  tierOf: (p: number) => string;
  buyerScoreForRow: (s: unknown, ms: number | null) => { points: number; tier: string } | null;
  isDisabled: (env: Record<string, string>) => boolean;
};

const touches = [
  {},
  { gclid: true },
  { gclid: true, ref: "www.google.com" },
  { gclid: true, ref: "example.org" },
  { fbclid: true },
  { fbclid: true, gclid: true },
  { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_pdf_packs" },
  { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_test_series" },
  { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_board_pass" },
  { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_signups_v2" },
  { utm_source: "google", utm_medium: "cpc", utm_campaign: "x" },
  { utm_source: "youtube" },
  { ref: "m.youtube.com" },
  { ref: "www.google.com" },
  { ref: "www.bing.com" },
  { ref: "duckduckgo.com" },
  { utm_source: "whatsapp" },
  { ref: "chatgpt.com" },
  { utm_source: "instagram" },
  { utm_source: "newsletter" },
  { ref: "example.org" },
  { utm_source: "FaceBook" },
];
const landings = ["", "/", "/pricing", "/board-pass", "/for-parents", "/packs", "/cbq-packs", "/question-bank-class-10", "/mock-test-class-10", "/test-series", "/practice-hub", "/check-improve", "/notes/x", "/cbse/class-10", "/tutor/a", "/login", "/welcome", "/browse", "/highly-probable"];

describe("client and server ports agree", () => {
  it("classifySource", () => {
    for (const t of touches) expect(srv.classifySource(t)).toBe(classifySource(t));
  });
  it("landingGroup", () => {
    for (const l of landings) expect(srv.landingGroup(l)).toBe(landingGroup(l));
  });
  it("hour blocks and IST hours", () => {
    for (let h = 0; h < 24; h++) expect(srv.hourBlock(h)).toBe(hourBlock(h));
    for (const ms of [0, 1_700_000_000_000, Date.parse("2026-11-20T18:29:59Z"), Date.parse("2026-11-20T18:30:00Z")]) {
      expect(srv.istHour(ms)).toBe(istHour(ms));
    }
  });
  it("tiers follow the one JSON table", () => {
    expect(POINTS.tiers).toEqual({ hot: 12, warm: 8 });
    for (let p = -3; p < 30; p++) expect(srv.tierOf(p)).toBe(tierOf(p));
  });
  it("full row score = client score without behaviour, for every touch x landing x hour", () => {
    for (const t of touches) {
      for (const l of landings) {
        for (const h of [0, 7, 10, 15, 19, 22]) {
          const ms = Date.UTC(2026, 10, 20, 0, 0, 0) - 19_800_000 + h * 3_600_000; // h o'clock IST
          const row = srv.buyerScoreForRow({ ...t, landing: l }, ms);
          const want = scoreOf({ sourceClass: classifySource(t), landingGroup: landingGroup(l), hour: h });
          expect(row).toEqual({ points: want, tier: tierOf(want) });
        }
      }
    }
  });
  it("kill switch parses like the other switches", () => {
    expect(srv.isDisabled({ BUYER_SCORE_ADMIN_DISABLED: "1" })).toBe(true);
    expect(srv.isDisabled({ BUYER_SCORE_ADMIN_DISABLED: "true" })).toBe(true);
    expect(srv.isDisabled({})).toBe(false);
    expect(srv.isDisabled({ BUYER_SCORE_ADMIN_DISABLED: "0" })).toBe(false);
  });
  it("no source recorded -> null, never a guess", () => {
    expect(srv.buyerScoreForRow(null, 1)).toBeNull();
  });
});
