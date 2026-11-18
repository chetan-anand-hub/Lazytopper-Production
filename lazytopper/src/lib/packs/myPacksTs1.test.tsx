/**
 * MYPACKS-TS-1 - the Test Series Pack is ONLINE (no files). Every owner-facing surface that said "download" / "files" / "PDF pack" for
 * any pack now says "Start your Test Series" and links to /test-series for test_series, and is unchanged for a PDF pack.
 * Each case is paired: a Test Series owner vs a PDF-pack-only owner.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PackReadyBanner, { type ReadyRow } from "../../components/packs/PackReadyBanner";
import { readyText } from "../../components/packs/PackReadyToast";
import { seriesProgressLine } from "../../components/packs/PacksShop";
import { packOwnerLine } from "../../components/packOwner/packOwnerModel";
import { meCardPackTitle } from "./packTitle";
import { TEST_SERIES_VALID_TILL } from "./packLabels";
import { seriesProgress, seriesTotals } from "../testSeries/testSeries";
import { WELCOME_PACK_LINE, WELCOME_SERIES_LINE } from "../../components/welcome/WelcomeBanner";

afterEach(cleanup);

const pdf = { packId: "pack_chapter:real-numbers", sku: "pack_chapter", target: "real-numbers", pricePaidInr: 49, paidAt: 5 };
const series = { packId: "test_series:all", sku: "test_series", target: "all", pricePaidInr: 999, paidAt: 6 };

function banner(row: ReadyRow) {
  return render(
    <MemoryRouter>
      <PackReadyBanner rows={[row]} canOpen onOpen={() => undefined} onDismiss={() => undefined} />
    </MemoryRouter>,
  );
}

describe("1 · the 'Your latest pack' banner", () => {
  it("Test Series: ready line with counts from the series config + 'Start your Test Series →' to /test-series; no 'Download files'", () => {
    banner({ key: series.packId, packId: series.packId, sku: "test_series", title: "Test Series Pack", variant: "return" });
    const t = screen.getByTestId("pack-ready-row").textContent ?? "";
    expect(t).toContain(`Your Test Series is ready — ${seriesTotals().total} tests, written answers checked step by step`);
    expect(t).not.toMatch(/Your latest pack|Download files/);
    const a = screen.getByTestId("pack-ready-start-series");
    expect(a.textContent).toBe("Start your Test Series →");
    expect(a.getAttribute("href")).toBe("/test-series");
  });
  it("PDF pack: unchanged ('Your latest pack: X' + 'Download files')", () => {
    banner({ key: pdf.packId, packId: pdf.packId, sku: "pack_chapter", title: "Chapter Pack", variant: "return" });
    const t = screen.getByTestId("pack-ready-row").textContent ?? "";
    expect(t).toContain("Your latest pack: Chapter Pack");
    expect(t).toContain("Download files");
    expect(screen.queryByTestId("pack-ready-start-series")).toBeNull();
  });
});

describe("2 · the My packs row facts", () => {
  it("progress line: 'Chapter Tests: N of 26 done · Full-Length: N of 40 done' from the real records; unknown -> omitted", () => {
    expect(seriesProgressLine(null)).toBeNull();
    expect(seriesProgressLine(seriesProgress([]))).toBe(`Chapter Tests: 0 of ${seriesTotals().chapterTests} done · Full-Length: 0 of ${seriesTotals().fullMocks} done`);
    expect(seriesTotals().chapterTests).toBe(26);
    expect(seriesTotals().fullMocks).toBe(40);
  });
  it("validity is the existing 31 May 2027 pack term", () => {
    expect(TEST_SERIES_VALID_TILL).toBe("31 May 2027");
  });
});

describe("4/6 · names and words elsewhere", () => {
  it("a Test Series Pack is named 'Test Series Pack', never 'PDF pack'; the PDF default is unchanged", () => {
    expect(meCardPackTitle({ sku: "test_series", target: "all" })).toBe("Test Series Pack");
    expect(meCardPackTitle({ sku: "pack_chapter", target: "real-numbers" })).toContain("Chapter Pack");
  });
  it("the pack-owner gate line never says a Test Series owner practises 'on paper'; a PDF owner still hears it", () => {
    expect(packOwnerLine([series as never])).toBeNull();
    expect(packOwnerLine([pdf as never])?.headline).toContain("Chapter Pack");
    expect(packOwnerLine([series as never, pdf as never])?.headline).toContain("Chapter Pack");
  });
  it("the post-sign-in welcome line and the claim toast do not say 'Download' for the series", () => {
    expect(WELCOME_SERIES_LINE).not.toMatch(/download/i);
    expect(WELCOME_PACK_LINE).toMatch(/Download/);
    expect(readyText([{ orderId: "o", kind: "pack", sku: "test_series", target: null, name: "Test Series Pack" } as never])).toBe("Your Test Series Pack is ready");
  });
});

describe("P1-6 · copy that was false is gone", () => {
  it("no 'everything unlocked' trial claim, and the free-test note is the true sentence", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");
    expect(read("components/auth/MockViewGate.tsx")).not.toMatch(/everything unlocked/);
    expect(read("components/worksheet/WorksheetGenerator.tsx")).not.toMatch(/everything unlocked/);
    const { FREE_TEST_NOTE } = await import("../testSeries/seriesAccess");
    expect(FREE_TEST_NOTE).toBe("This is your 1 free test. Its MCQs (Section A) are marked free.");
  });
});
