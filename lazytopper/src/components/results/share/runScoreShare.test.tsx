import { describe, it, expect, vi, afterEach } from "vitest";
import { runScoreShare } from "./runScoreShare";
import type { ScorecardVariant } from "../scorecardVariants";

/** SHARE-SCORE-1 - `score_share` {surface, method} fires only when a share went out. */
const { trackScoreShare, toBlob } = vi.hoisted(() => ({
  trackScoreShare: vi.fn(),
  toBlob: vi.fn(async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" })),
}));
vi.mock("../../../analytics/analytics", () => ({ trackScoreShare }));
vi.mock("html-to-image", () => ({ toBlob }));

afterEach(() => {
  trackScoreShare.mockClear();
  toBlob.mockClear();
});

function variant(over: Partial<ScorecardVariant> = {}): ScorecardVariant {
  return {
    surface: "check-improve",
    title: "Check & Improve paper",
    subtitle: "Triangles · CI-M-TR-01 · graded just now",
    score: { kind: "marks", awarded: 12, total: 20 },
    actions: [],
    ...over,
  };
}

describe("runScoreShare - score_share analytics", () => {
  it("desktop link: fires {check_improve, whatsapp_link} and renders the 1080x1350 PNG", async () => {
    const r = await runScoreShare(variant(), { method: "whatsapp_link", linkOpened: true, dateLabel: "17 Oct 2026" });
    expect(r.outcome).toBe("downloaded");
    expect(trackScoreShare).toHaveBeenCalledTimes(1);
    expect(trackScoreShare).toHaveBeenCalledWith("check_improve", "whatsapp_link");
    expect(toBlob).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1350, pixelRatio: 1 }));
  });

  it("desktop link with a blocked popup (window.open returned null): no event, PNG still saved", async () => {
    const r = await runScoreShare(variant(), { method: "whatsapp_link", linkOpened: false, dateLabel: "x" });
    expect(r.outcome).toBe("downloaded");
    expect(trackScoreShare).not.toHaveBeenCalled();
    const r2 = await runScoreShare(variant(), { method: "whatsapp_link", dateLabel: "x" });
    expect(r2.outcome).toBe("downloaded");
    expect(trackScoreShare).not.toHaveBeenCalled();
  });

  it("native: fires {quick_practice, native} only once the sheet completes", async () => {
    const share = vi.fn(async () => {});
    const r = await runScoreShare(variant({ surface: "quick-practice" }), { method: "native", nav: { share }, dateLabel: "x" });
    expect(r.outcome).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], text: expect.stringContaining("I scored 12/20") });
    expect(trackScoreShare).toHaveBeenCalledWith("quick_practice", "native");
  });

  it("native cancel or lost activation: no event", async () => {
    const abort = vi.fn(async () => { throw new DOMException("x", "AbortError"); });
    await runScoreShare(variant(), { method: "native", nav: { share: abort }, dateLabel: "x" });
    const late = vi.fn(async () => { throw new DOMException("x", "NotAllowedError"); });
    const r = await runScoreShare(variant(), { method: "native", nav: { share: late }, dateLabel: "x" });
    expect(r.outcome).toBe("needs-tap");
    expect(r.file).toBeInstanceOf(File);
    expect(trackScoreShare).not.toHaveBeenCalled();
  });

  it("a non-shareable scorecard sends nothing and draws nothing", async () => {
    const r = await runScoreShare(variant({ allPending: { title: "t", detail: "d" } }), { method: "whatsapp_link", dateLabel: "x" });
    expect(r.outcome).toBe("failed");
    expect(trackScoreShare).not.toHaveBeenCalled();
    expect(toBlob).not.toHaveBeenCalled();
  });
});
