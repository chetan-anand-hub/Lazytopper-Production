/** GRADE-ROUTE-1 - the Answer Checker offers to grade the student's OWN worksheet on its worksheet page. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const H = vi.hoisted(() => ({ local: [] as unknown[], cloud: vi.fn() }));
vi.mock("../../services/progressStore", () => ({ getSurfaceHistory: () => H.local }));
vi.mock("../../services/sessionRecords", () => ({ getSessionRecordsFromCloud: (...a: unknown[]) => H.cloud(...a) }));

import PaperCodeRouteBanner from "./PaperCodeRouteBanner";
import { findWorksheetCodes, worksheetUploadHref } from "./paperCodeMatch";

const rec = (id: string, over: Record<string, unknown> = {}) => ({
  id, surface: "worksheet", subject: "maths", status: "pending-upload", dedupKey: `u1::${id}`, ...over,
});
const view = (texts: string[], uid: string | null = "u1") =>
  render(<MemoryRouter><PaperCodeRouteBanner uid={uid} texts={texts} /></MemoryRouter>);
const BANNER = "paper-code-route-banner";

beforeEach(() => {
  H.local = [];
  H.cloud.mockReset();
  H.cloud.mockResolvedValue([]);
});
afterEach(cleanup);

describe("findWorksheetCodes", () => {
  it("reads the real mint shapes and ignores look-alikes", () => {
    expect(findWorksheetCodes(["Worksheet WS-M-MIX-02 (Maths)", "ws-s-full-01", "WS-M-RN-03 and WS-M-RN-03"]))
      .toEqual(["WS-M-MIX-02", "WS-S-FULL-01", "WS-M-RN-03"]);
    expect(findWorksheetCodes(["CT-M-RN-02", "FM-M-04", "WS-X-RN-03", "WS-M-RN-3", null, undefined])).toEqual([]);
  });
});

describe("PaperCodeRouteBanner", () => {
  it("own PENDING worksheet: banner with the #1556 upload link", async () => {
    H.local = [rec("WS-M-MIX-02")];
    view(["Name ____ WS-M-MIX-02"]);
    expect(await screen.findByTestId(BANNER)).toBeTruthy();
    expect(screen.getByText("This looks like your worksheet WS-M-MIX-02.")).toBeTruthy();
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
