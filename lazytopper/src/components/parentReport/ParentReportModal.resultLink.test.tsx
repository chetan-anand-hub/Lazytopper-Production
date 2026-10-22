import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { StudyReadModel } from "../../services/progressReadModel";
import type { ParentReport } from "./parentReportModel";

/**
 * PARENT-REPORT-1 (result link) — opened from a saved scorecard with `resultRef`, the sheet mints
 * a link to THAT result and adds exactly one line, "See the full result: <link>", under the
 * unchanged message; the image is unchanged. No `resultRef` (Me, Home) → no mint, no line. A mint
 * that fails twice → the message goes as before. `parent_report_shared { kind, method }` fires
 * only when a share that carried the link completed.
 */
const { trackParentReportShown, trackParentReportShare, trackParentReportShared } = vi.hoisted(() => ({
  trackParentReportShown: vi.fn(),
  trackParentReportShare: vi.fn(),
  trackParentReportShared: vi.fn(),
}));
vi.mock("../../analytics/analytics", () => ({ trackParentReportShown, trackParentReportShare, trackParentReportShared }));

import ParentReportModal from "./ParentReportModal";
import { PARENT_RESULT_TOKEN_PATTERN, parentResultUrl, readParentResultToken, resultLinkLine, withResultLink } from "./parentResultLink";

const TOKEN = "A".repeat(20) + "b_-" + "9".repeat(20);
const RANGE = { start: Date.parse("2026-10-11T18:30:00Z"), end: Date.parse("2026-10-18T12:00:00Z") };
const model = {
  range: RANGE,
  subject: null,
  progress: { totals: null, subjectTotals: {}, subjects: [] },
  activity: { tests: { total: 0 } },
  mistakes: { entries: [], complete: true, wonBack: { count: 0, marks: 0 } },
} as unknown as StudyReadModel;

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  trackParentReportShown.mockClear();
  trackParentReportShare.mockClear();
  trackParentReportShared.mockClear();
  Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  vi.restoreAllMocks();
});

function nativeShare() {
  const share = vi.fn(async () => {});
  Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
  Object.defineProperty(navigator, "share", { value: share, configurable: true });
  return share;
}

function renderModal(over: Partial<Parameters<typeof ParentReportModal>[0]> = {}) {
  const renderPng = vi.fn(async (r: ParentReport) => new Blob([r.state], { type: "image/png" }));
  render(
    <ParentReportModal uid="u1" displayName={null} placement="check_improve" onClose={vi.fn()} read={vi.fn(async () => model)} render={renderPng} {...over} />,
  );
  return { renderPng };
}

describe("parentResultLink — the link and the one added line", () => {
  it("the URL is /u/report with the token in the FRAGMENT (never a query or path)", () => {
    const url = parentResultUrl(TOKEN, "https://www.lazytopper.com", "/");
    expect(url).toBe(`https://www.lazytopper.com/u/report#r=${TOKEN}`);
    expect(new URL(url).search).toBe("");
    expect(new URL(url).pathname).toBe("/u/report");
    expect(readParentResultToken(new URL(url).hash)).toBe(TOKEN);
    expect(PARENT_RESULT_TOKEN_PATTERN.test(TOKEN)).toBe(true);
  });

  it("reads only a well-formed r= token", () => {
    expect(readParentResultToken("#r=short")).toBeNull();
    expect(readParentResultToken(`#pp=${TOKEN}`)).toBeNull();
    expect(readParentResultToken("")).toBeNull();
    expect(readParentResultToken(`#x=1&r=${TOKEN}`)).toBe(TOKEN);
  });

  it("the owner's line, appended once; no link → the text is unchanged", () => {
    expect(resultLinkLine("https://x/u/report#r=T")).toBe("See the full result: https://x/u/report#r=T");
    expect(withResultLink("Hello", "https://x/u/report#r=T")).toBe("Hello\n\nSee the full result: https://x/u/report#r=T");
    expect(withResultLink("Hello", null)).toBe("Hello");
  });
});

describe("ParentReportModal — the result link", () => {
  it("with resultRef: mints for THAT id, adds the line, keeps the image; parent_report_shared {kind, method}", async () => {
    const share = nativeShare();
    const mintLink = vi.fn(async () => ({ token: TOKEN, expiresAt: "2026-11-21T00:00:00.000Z", kind: "written" as const }));
    const { renderPng } = renderModal({ resultRef: "CI-M-QUAD-03", mintLink });
    await screen.findByTestId("prm-preview");
    await waitFor(() => expect(screen.getByTestId("prm-share").getAttribute("data-result-link")).toBe("ready"));
    expect(mintLink).toHaveBeenCalledWith("CI-M-QUAD-03");
    expect(screen.getByTestId("prm-link-note").textContent).toMatch(/never your answers/);
    await act(async () => {
      fireEvent.click(screen.getByTestId("prm-share"));
    });
    const payload = (share.mock.calls[0] as unknown as [{ files: File[]; text: string }])[0];
    expect(payload.files[0].type).toBe("image/png");
    expect(renderPng).toHaveBeenCalledTimes(1);
    const lines = payload.text.split("\n").filter((l) => l.startsWith("See the full result: "));
    expect(lines).toEqual([`See the full result: ${window.location.origin}/u/report#r=${TOKEN}`]);
    expect(trackParentReportShare).toHaveBeenCalledWith("check_improve", "native");
    expect(trackParentReportShared).toHaveBeenCalledWith("written", "native");
  });

  it("the Share button waits while the link is being made", async () => {
    let resolve: (v: { token: string; expiresAt: string; kind: "objective" }) => void = () => {};
    const mintLink = vi.fn(() => new Promise<{ token: string; expiresAt: string; kind: "objective" }>((r) => (resolve = r)));
    renderModal({ resultRef: "CI-M-QUAD-03", mintLink });
    await screen.findByTestId("prm-preview");
    expect((screen.getByTestId("prm-share") as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolve({ token: TOKEN, expiresAt: "x", kind: "objective" }));
    await waitFor(() => expect((screen.getByTestId("prm-share") as HTMLButtonElement).disabled).toBe(false));
  });

  it("without resultRef (Me, Home): no mint, no line, no parent_report_shared", async () => {
    const share = nativeShare();
    const mintLink = vi.fn();
    renderModal({ mintLink });
    await screen.findByTestId("prm-preview");
    await act(async () => {
      fireEvent.click(screen.getByTestId("prm-share"));
    });
    expect(mintLink).not.toHaveBeenCalled();
    const payload = (share.mock.calls[0] as unknown as [{ text: string }])[0];
    expect(payload.text).not.toContain("See the full result");
    expect(trackParentReportShared).not.toHaveBeenCalled();
  });

  it("a mint that fails (after one retry) → the message goes exactly as before", async () => {
    const share = nativeShare();
    const mintLink = vi.fn(async () => Promise.reject(new Error("404")));
    renderModal({ resultRef: "CI-M-QUAD-03", mintLink });
    await screen.findByTestId("prm-preview");
    await waitFor(() => expect(screen.getByTestId("prm-share").getAttribute("data-result-link")).toBe("none"), { timeout: 4000 });
    expect(mintLink).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("prm-link-note")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId("prm-share"));
    });
    const payload = (share.mock.calls[0] as unknown as [{ text: string }])[0];
    expect(payload.text).not.toContain("See the full result");
    expect(trackParentReportShared).not.toHaveBeenCalled();
  });
});
