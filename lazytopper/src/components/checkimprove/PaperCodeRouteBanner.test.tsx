/** GRADE-ROUTE-1 - the Answer Checker offers to grade the student's OWN worksheet on its worksheet page. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const H = vi.hoisted(() => ({ local: [] as Array<{ surface: string }>, cloud: vi.fn(), pdf: vi.fn(), track: vi.fn() }));
vi.mock("../../services/progressStore", () => ({ getSurfaceHistory: (surface: string) => H.local.filter((r) => r.surface === surface) }));
vi.mock("./pdfPaperText", () => ({ readPdfPaperText: (...a: unknown[]) => H.pdf(...a) }));
vi.mock("../../analytics/analytics", () => ({ trackNamedEvent: (...a: unknown[]) => H.track(...a) }));
vi.mock("../../services/sessionRecords", () => ({ getSessionRecordsFromCloud: (...a: unknown[]) => H.cloud(...a) }));

import PaperCodeRouteBanner from "./PaperCodeRouteBanner";
import { findPaperCodes, worksheetUploadHref } from "./paperCodeMatch";

const rec = (id: string, over: Record<string, unknown> = {}) => ({
  id, surface: "worksheet", subject: "maths", status: "pending-upload", dedupKey: `u1::${id}`, ...over,
});
const view = (texts: string[], uid: string | null = "u1", files?: Array<{ base64: string | null; mime: string } | null>) =>
  render(<MemoryRouter><PaperCodeRouteBanner uid={uid} texts={texts} files={files} /></MemoryRouter>);
const BANNER = "paper-code-route-banner";

beforeEach(() => {
  H.local = [];
  H.cloud.mockReset();
  H.cloud.mockResolvedValue([]);
  H.pdf.mockReset();
  H.pdf.mockResolvedValue([]);
  H.track.mockReset();
});
afterEach(cleanup);

describe("findPaperCodes", () => {
  it("reads the real WS / CT / FM mint shapes and ignores look-alikes", () => {
    expect(findPaperCodes(["Worksheet WS-M-MIX-02 (Maths)", "ws-s-full-01", "WS-M-RN-03 and WS-M-RN-03"]))
      .toEqual(["WS-M-MIX-02", "WS-S-FULL-01", "WS-M-RN-03"]);
    expect(findPaperCodes(["CT-M-RN-02", "fm-s-04", "FM-M-4"])).toEqual(["CT-M-RN-02", "FM-S-04"]);
    expect(findPaperCodes(["WS-X-RN-03", "WS-M-RN-3", "FM-M-RN-04x", "XWS-M-RN-03", null, undefined])).toEqual([]);
  });
});

describe("PaperCodeRouteBanner", () => {
  it("own PENDING worksheet: banner with the #1556 upload link", async () => {
    H.local = [rec("WS-M-MIX-02")];
    view(["Name ____ WS-M-MIX-02"]);
    expect(await screen.findByTestId(BANNER)).toBeTruthy();
    expect(screen.getByText("This looks like your worksheet WS-M-MIX-02.")).toBeTruthy();
    expect(H.track).toHaveBeenCalledWith("grade_route_offer_shown");
    expect(screen.getByTestId("paper-code-route-go").getAttribute("href"))
      .toBe("/practice/worksheets?subject=Maths&scope=full-subject&upload=WS-M-MIX-02");
    expect(document.body.textContent).not.toMatch(/Premium|Check & Improve/);
  });

  it("own GRADED worksheet (found in the cloud list, Science): banner", async () => {
    H.cloud.mockResolvedValue([rec("WS-S-FULL-01", { subject: "science", status: "graded" })]);
    view(["WS-S-FULL-01"]);
    await screen.findByTestId(BANNER);
    expect(screen.getByTestId("paper-code-route-go").getAttribute("href")).toBe(
      worksheetUploadHref({ code: "WS-S-FULL-01", subject: "Science" }),
    );
  });

  it("A1: own PENDING Chapter Test / Full Mock: banner with the existing deep links (Home's pendingPaperHref)", async () => {
    H.local = [rec("CT-M-TRI-03", { surface: "chapter-test", topicKeys: ["triangles"] })];
    view(["CT-M-TRI-03"]);
    expect((await screen.findByTestId("paper-code-route-go")).getAttribute("href")).toBe(
      "/chapter-test/10/Maths/triangles?review=CT-M-TRI-03&source=home&returnTo=%2F",
    );
    expect(screen.getByText("This looks like your Chapter Test CT-M-TRI-03.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("paper-code-route-go"));
    expect(H.track).toHaveBeenCalledWith("grade_route_offer_accepted");
    cleanup();
    H.local = [rec("FM-S-02", { surface: "full-mock", subject: "science", status: "partial" })];
    view(["FM-S-02"]);
    expect((await screen.findByTestId("paper-code-route-go")).getAttribute("href")).toBe(
      "/full-mock/10/Science?upload=FM-S-02&source=home&returnTo=%2F",
    );
  });

  it("A1: a GRADED Chapter Test / Full Mock only reopens read-only, so NO banner; a CT with no single chapter: none", async () => {
    H.local = [
      rec("CT-M-TRI-03", { surface: "chapter-test", topicKeys: ["triangles"], status: "graded" }),
      rec("FM-M-01", { surface: "full-mock", status: "graded" }),
      rec("CT-M-MIX-01", { surface: "chapter-test", topicKeys: ["mixed:abc"] }),
    ];
    view(["CT-M-TRI-03 FM-M-01 CT-M-MIX-01"]);
    await waitFor(() => expect(H.cloud).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId(BANNER)).toBeNull();
  });

  it("A3: the code is read from the PDF's own metadata/text even when the file was renamed", async () => {
    H.local = [rec("WS-M-MIX-02")];
    H.pdf.mockResolvedValue(["WS-M-MIX-02 - Maths Mixed Worksheet"]);
    view(["scan_final_v2.pdf"], "u1", [{ base64: "JVBERi0=", mime: "application/pdf" }]);
    expect(await screen.findByTestId(BANNER)).toBeTruthy();
    expect(H.pdf).toHaveBeenCalledWith("JVBERi0=", "application/pdf");
  });

  it("A3: an image is not sent to the PDF reader's loader path (no PDF read), and an unreadable PDF shows nothing", async () => {
    H.local = [rec("WS-M-MIX-02")];
    view(["x.jpg"], "u1", [{ base64: "/9j/", mime: "image/jpeg" }]);
    await Promise.resolve();
    expect(H.pdf).not.toHaveBeenCalled();
    expect(screen.queryByTestId(BANNER)).toBeNull();
  });

  it("another student's record, an unknown code, no code, or signed out: nothing", async () => {
    H.local = [rec("WS-M-RN-03", { dedupKey: "someone-else::WS-M-RN-03" })];
    view(["WS-M-RN-03", "WS-M-MIX-09"]);
    cleanup();
    view(["no code here"]);
    cleanup();
    view(["WS-M-RN-03"], null);
    await waitFor(() => expect(H.cloud).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId(BANNER)).toBeNull();
  });

  it("a read failure shows nothing", async () => {
    H.cloud.mockRejectedValue(new Error("offline"));
    view(["WS-M-MIX-02"]);
    await waitFor(() => expect(H.cloud).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId(BANNER)).toBeNull();
  });

  it("'Grade here anyway' only hides the offer (it never navigates or grades)", async () => {
    H.local = [rec("WS-M-MIX-02")];
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    view(["WS-M-MIX-02"]);
    fireEvent.click(await screen.findByTestId("paper-code-route-skip"));
    expect(screen.queryByTestId(BANNER)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("360 px: wraps, no fixed width, 44px touch targets", async () => {
    H.local = [rec("WS-M-MIX-02")];
    view(["WS-M-MIX-02"]);
    await screen.findByTestId(BANNER);
    const css = document.querySelector("style")?.textContent ?? "";
    expect(css).toMatch(/flex-wrap: wrap/);
    expect(css).toMatch(/min-height: 44px/);
    expect(css).not.toMatch(/\bwidth: \d+px/);
  });
});
