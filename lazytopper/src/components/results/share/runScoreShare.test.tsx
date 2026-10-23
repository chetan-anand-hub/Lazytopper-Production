import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { makeShareImage, runShareChannel, type ShareImage } from "./runScoreShare";
import { FX_FOUR_TYPES, FX_OBJECTIVE_ONLY, FX_PENDING } from "../../../test/shareFixtures";

/** SHARE-CARD-1 - drawing sizes, the four channels and `scorecard_share` {surface,size,channel}. */
const { trackScorecardShare, toBlob } = vi.hoisted(() => ({
  trackScorecardShare: vi.fn(),
  toBlob: vi.fn(async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" })),
}));
vi.mock("../../../analytics/analytics", () => ({ trackScorecardShare }));
vi.mock("html-to-image", () => ({ toBlob }));

let click: ReturnType<typeof vi.spyOn>;
const origCreate = URL.createObjectURL;
const origRevoke = URL.revokeObjectURL;
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:lt");
  URL.revokeObjectURL = vi.fn();
  click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  trackScorecardShare.mockClear();
  toBlob.mockClear();
  click.mockRestore();
  URL.createObjectURL = origCreate;
  URL.revokeObjectURL = origRevoke;
});

const img = async (size: "story" | "square" = "story", v = FX_FOUR_TYPES): Promise<ShareImage> =>
  (await makeShareImage(v, { size, showMascots: true, firstName: null, dateLabel: "23 Oct 2026" }))!;

describe("makeShareImage - sizes", () => {
  it("story 1080 x 1920 and square 1080 x 1080, named per size", async () => {
    const s = await img("story");
    expect(toBlob).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1920, pixelRatio: 1 }));
    expect(s.file.name).toBe("lazytopper-result-story.png");
    const q = await img("square");
    expect(toBlob).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1080 }));
    expect(q.file.name).toBe("lazytopper-result-square.png");
  });
  it("the share text carries the public UTM link, never a private result", async () => {
    const s = await img("story", FX_OBJECTIVE_ONLY);
    expect(s.text).toContain("https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=quick_practice");
    expect(s.text).not.toMatch(/\/u\/|report|QP-/);
  });
});

describe("runShareChannel", () => {
  it("native: the OS sheet with the PNG + text; event only once it completes", async () => {
    const share = vi.fn(async () => {});
    const out = await runShareChannel("native", { surface: "worksheet", image: await img(), nav: { canShare: () => true, share } });
    expect(out).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], text: expect.stringContaining("utm_source=share") });
    expect(trackScorecardShare).toHaveBeenCalledWith("worksheet", "story", "native");
  });
  it("native cancel: no event, nothing saved", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("x", "AbortError");
    });
    const out = await runShareChannel("native", { surface: "worksheet", image: await img(), nav: { canShare: () => true, share } });
    expect(out).toBe("cancelled");
    expect(trackScorecardShare).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });
  it("fallback: a sheet that fails (not a cancel) saves the PNG", async () => {
    const share = vi.fn(async () => {
      throw new Error("target crashed");
    });
    const out = await runShareChannel("native", { surface: "full-mock", image: await img("square"), nav: { canShare: () => true, share } });
    expect(out).toBe("downloaded");
    expect(click).toHaveBeenCalledTimes(1);
    expect(trackScorecardShare).toHaveBeenCalledWith("full_mock", "square", "download");
  });
  it("whatsapp: wa.me with the text + link, PNG saved to attach", async () => {
    const win = { opener: {} as unknown };
    const open = vi.fn(() => win);
    const out = await runShareChannel("whatsapp", { surface: "check-improve", image: await img("story", FX_PENDING), open });
    expect(out).toBe("opened");
    const url = (open.mock.calls[0] as unknown as [string])[0];
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("utm_campaign=check_improve");
    expect(click).toHaveBeenCalledTimes(1);
    expect(trackScorecardShare).toHaveBeenCalledWith("check_improve", "story", "whatsapp");
  });
  it("whatsapp with a blocked popup: the PNG is still saved, counted as a download", async () => {
    const out = await runShareChannel("whatsapp", { surface: "worksheet", image: await img(), open: () => null });
    expect(out).toBe("downloaded");
    expect(trackScorecardShare).toHaveBeenCalledWith("worksheet", "story", "download");
  });
  it("instagram without file sharing (desktop): the STORY image is saved, logged honestly as a download", async () => {
    const out = await runShareChannel("instagram", { surface: "chapter-test", image: await img("story") });
    expect(out).toBe("downloaded");
    expect(click).toHaveBeenCalledTimes(1);
    expect(trackScorecardShare).toHaveBeenCalledWith("chapter_test", "story", "download");
  });
  it("instagram on a phone (files shareable): the story PNG through the sheet, logged as instagram", async () => {
    const share = vi.fn(async () => {});
    const out = await runShareChannel("instagram", { surface: "chapter-test", image: await img("story"), nav: { canShare: () => true, share } });
    expect(out).toBe("shared");
    expect(trackScorecardShare).toHaveBeenCalledWith("chapter_test", "story", "instagram");
  });
  it("whatsapp on a phone (files shareable): the PNG itself through the sheet - no wa.me, no download", async () => {
    const share = vi.fn(async () => {});
    const open = vi.fn(() => ({ opener: {} as unknown }));
    const out = await runShareChannel("whatsapp", { surface: "worksheet", image: await img(), nav: { canShare: () => true, share }, open });
    expect(out).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], text: expect.stringContaining("utm_source=share") });
    expect(open).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(trackScorecardShare).toHaveBeenCalledWith("worksheet", "story", "whatsapp");
  });
  it("download: the PNG saved", async () => {
    await runShareChannel("download", { surface: "quick-practice", image: await img("square") });
    expect(trackScorecardShare).toHaveBeenCalledWith("quick_practice", "square", "download");
  });
});
