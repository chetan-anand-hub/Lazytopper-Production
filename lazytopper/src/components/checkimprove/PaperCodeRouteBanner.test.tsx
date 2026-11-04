/** GRADE-ROUTE-1 - the Answer Checker offers to grade the student's OWN worksheet on its worksheet page. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const H = vi.hoisted(() => ({
  local: [] as Array<{ surface: string }>, cloud: vi.fn(), pdf: vi.fn(), qr: vi.fn(), track: vi.fn(),
  // GRADE-ROUTE-3 - the paper stored under a code (this device / the student's server copies).
  wsLocal: vi.fn(), wsSnap: vi.fn(), ctPaper: vi.fn(), fmSnap: vi.fn(),
}));
vi.mock("../../services/progressStore", () => ({ getSurfaceHistory: (surface: string) => H.local.filter((r) => r.surface === surface) }));
vi.mock("./decodePaperCode", () => ({ decodePaperCodeFromImage: (...a: unknown[]) => H.qr(...a) }));
vi.mock("./pdfPaperText", () => ({ readPdfPaperText: (...a: unknown[]) => H.pdf(...a) }));
vi.mock("../../analytics/analytics", () => ({ trackNamedEvent: (...a: unknown[]) => H.track(...a) }));
vi.mock("../../services/sessionRecords", () => ({ getSessionRecordsFromCloud: (...a: unknown[]) => H.cloud(...a) }));
vi.mock("../../services/worksheetSessionStore", () => ({ getWorksheetSession: (...a: unknown[]) => H.wsLocal(...a) }));
vi.mock("../../services/worksheetPaperStore", () => ({ fetchWorksheetPaperSnapshot: (...a: unknown[]) => H.wsSnap(...a) }));
vi.mock("../../services/chapterTestPaperStore", () => ({ loadChapterTestPaper: (...a: unknown[]) => H.ctPaper(...a) }));
vi.mock("../../services/fullMockPaperStore", () => ({ fetchFullMockPaperSnapshot: (...a: unknown[]) => H.fmSnap(...a) }));

import PaperCodeRouteBanner from "./PaperCodeRouteBanner";
import { findPaperCodes, isSamePaper, worksheetUploadHref } from "./paperCodeMatch";

// The 3 Nov paper the student uploads (25 questions) and the July paper the colliding record holds (5 questions).
const NOV = Array.from({ length: 25 }, (_, i) =>
  [
    "Find the HCF of 96 and 404 by the prime factorisation method and hence find their LCM.",
    "If the zeroes of the polynomial x^2 - 5x + 6 are alpha and beta, find the value of alpha^2 + beta^2.",
    "Solve the pair of linear equations 2x + 3y = 11 and 2x - 4y = -24 by substitution.",
  ][i] ?? `November question ${i + 1}: prove that the given statement about triangle ABC number ${i + 1} holds.`,
);
const JULY = [
  "Show that 5 - root 3 is irrational, given that root 3 is irrational.",
  "Find the 10th term of the AP 2, 7, 12, and so on.",
  "A ladder 10 m long reaches a window 8 m above the ground. Find the distance of its foot from the wall.",
  "Find the coordinates of the point dividing the join of (-1, 7) and (4, -3) in the ratio 2 : 3.",
  "Evaluate sin 60 cos 30 + sin 30 cos 60.",
];
const paper = (texts: string[], worksheetId = "ws-1") => ({
  worksheetId, questions: texts.map((questionText, i) => ({ qNumber: i + 1, questionText })),
});
const ids = (n: number) => Array.from({ length: n }, (_, i) => `q${i + 1}`);
const rec = (id: string, over: Record<string, unknown> = {}) => ({
  id, surface: "worksheet", subject: "maths", status: "pending-upload", dedupKey: `u1::${id}`,
  worksheetId: "ws-1", questionIds: ids(25), ...over,
});
/** What the Answer Checker has once it read the 3 Nov paper: the code, then its read questions. */
const NOV_READ = (code: string) => [code, ...NOV];
const view = (texts: string[], uid: string | null = "u1", files?: Array<{ base64: string | null; mime: string } | null>) =>
  render(<MemoryRouter><PaperCodeRouteBanner uid={uid} texts={texts} files={files} /></MemoryRouter>);
const BANNER = "paper-code-route-banner";

beforeEach(() => {
  H.local = [];
  H.cloud.mockReset();
  H.cloud.mockResolvedValue([]);
  H.qr.mockReset();
  H.qr.mockResolvedValue(null);
  H.pdf.mockReset();
  H.pdf.mockResolvedValue([]);
  H.track.mockReset();
  // Default: the stored paper under every code IS the uploaded 3 Nov paper.
  H.wsLocal.mockReset();
  H.wsLocal.mockReturnValue(paper(NOV));
  H.wsSnap.mockReset();
  H.wsSnap.mockResolvedValue(null);
  H.ctPaper.mockReset();
  H.ctPaper.mockResolvedValue({ paper: paper(NOV) });
  H.fmSnap.mockReset();
  H.fmSnap.mockResolvedValue({ paper: paper(NOV) });
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
    view(NOV_READ("Name ____ WS-M-MIX-02"));
    expect(await screen.findByTestId(BANNER)).toBeTruthy();
    expect(screen.getByText("This looks like your worksheet WS-M-MIX-02.")).toBeTruthy();
    await waitFor(() => expect(H.track).toHaveBeenCalledWith("grade_route_offer_shown"));
    expect(screen.getByTestId("paper-code-route-go").getAttribute("href"))
      .toBe("/practice/worksheets?subject=Maths&scope=full-subject&upload=WS-M-MIX-02");
    expect(document.body.textContent).not.toMatch(/Premium|Check & Improve/);
  });

  it("own GRADED worksheet (found in the cloud list, Science): banner", async () => {
    H.cloud.mockResolvedValue([rec("WS-S-FULL-01", { subject: "science", status: "graded" })]);
    view(NOV_READ("WS-S-FULL-01"));
    await screen.findByTestId(BANNER);
    expect(screen.getByTestId("paper-code-route-go").getAttribute("href")).toBe(
      worksheetUploadHref({ code: "WS-S-FULL-01", subject: "Science" }),
    );
  });

  it("A1: own PENDING Chapter Test / Full Mock: banner with the existing deep links (Home's pendingPaperHref)", async () => {
    H.local = [rec("CT-M-TRI-03", { surface: "chapter-test", topicKeys: ["triangles"] })];
    view(NOV_READ("CT-M-TRI-03"));
    expect((await screen.findByTestId("paper-code-route-go")).getAttribute("href")).toBe(
      "/chapter-test/10/Maths/triangles?review=CT-M-TRI-03&source=home&returnTo=%2F",
    );
    expect(screen.getByText("This looks like your Chapter Test CT-M-TRI-03.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("paper-code-route-go"));
    expect(H.track).toHaveBeenCalledWith("grade_route_offer_accepted");
    cleanup();
    H.local = [rec("FM-S-02", { surface: "full-mock", subject: "science", status: "partial" })];
    view(NOV_READ("FM-S-02"));
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
    H.pdf.mockResolvedValue(["WS-M-MIX-02 - Maths Mixed Worksheet", `Q1. ${NOV[0]} (2) Q2. ${NOV[1]} (2) Q3. ${NOV[2]} (3)`]);
    view(["scan_final_v2.pdf"], "u1", [{ base64: "JVBERi0=", mime: "application/pdf" }]);
    expect(await screen.findByTestId(BANNER)).toBeTruthy();
    expect(H.pdf).toHaveBeenCalledWith("JVBERi0=", "application/pdf");
  });

  it("B3: an image upload's footer QR is decoded in the browser and matched (PDF reader not used)", async () => {
    H.local = [rec("WS-M-MIX-02")];
    H.qr.mockResolvedValue("WS-M-MIX-02");
    view(["IMG_2041.jpg", ...NOV], "u1", [{ base64: "/9j/", mime: "image/jpeg" }]);
    expect(await screen.findByTestId(BANNER)).toBeTruthy();
    expect(H.qr).toHaveBeenCalledWith({ base64: "/9j/", mime: "image/jpeg" });
    expect(H.pdf).not.toHaveBeenCalled();
  });

  it("B3: an image with no readable QR shows nothing", async () => {
    H.local = [rec("WS-M-MIX-02")];
    view(["x.jpg"], "u1", [{ base64: "/9j/", mime: "image/jpeg" }]);
    await waitFor(() => expect(H.qr).toHaveBeenCalled());
    await Promise.resolve();
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
    view(NOV_READ("WS-M-MIX-02"));
    fireEvent.click(await screen.findByTestId("paper-code-route-skip"));
    expect(screen.queryByTestId(BANNER)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("360 px: wraps, no fixed width, 44px touch targets", async () => {
    H.local = [rec("WS-M-MIX-02")];
    view(NOV_READ("WS-M-MIX-02"));
    await screen.findByTestId(BANNER);
    const css = document.querySelector("style")?.textContent ?? "";
    expect(css).toMatch(/flex-wrap: wrap/);
    expect(css).toMatch(/min-height: 44px/);
    expect(css).not.toMatch(/\bwidth: \d+px/);
  });

  describe("GRADE-ROUTE-3: the offer needs the SAME paper, not just the same code", () => {
    const settle = async () => {
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
    };

    it("code match + same paper: banner (the read questions match the stored paper)", async () => {
      H.local = [rec("WS-M-MIX-02")];
      view(NOV_READ("WS-M-MIX-02"));
      expect(await screen.findByTestId(BANNER)).toBeTruthy();
      expect(H.wsLocal).toHaveBeenCalledWith("ws-1");
    });

    it("the 4 Nov live defect: code WS-M-MIX-02 is an OLDER 5-question July paper, the upload is the 25-question 3 Nov one -> no banner", async () => {
      H.local = [rec("WS-M-MIX-02", { status: "graded", worksheetId: "ws-july", questionIds: ids(5) })];
      H.wsLocal.mockImplementation((id: string) => (id === "ws-july" ? paper(JULY, "ws-july") : paper(NOV, "ws-nov")));
      view(NOV_READ("WS-M-MIX-02"));
      await waitFor(() => expect(H.wsLocal).toHaveBeenCalledWith("ws-july"));
      await settle();
      expect(screen.queryByTestId(BANNER)).toBeNull();
      expect(H.track).not.toHaveBeenCalledWith("grade_route_offer_shown");
    });

    it("a code match alone (the questions not read yet / not on the page) is not enough: no banner until they are", async () => {
      H.local = [rec("WS-M-MIX-02")];
      const { rerender } = view(["WS-M-MIX-02-questions.pdf"]);
      await waitFor(() => expect(H.wsLocal).toHaveBeenCalled());
      await settle();
      expect(screen.queryByTestId(BANNER)).toBeNull();
      rerender(<MemoryRouter><PaperCodeRouteBanner uid="u1" texts={NOV_READ("WS-M-MIX-02-questions.pdf")} /></MemoryRouter>);
      expect(await screen.findByTestId(BANNER)).toBeTruthy();
    });

    it("stored paper without question texts (old record), or no stored paper at all: no banner (fail closed)", async () => {
      H.local = [rec("WS-M-MIX-02")];
      H.wsLocal.mockReturnValue(paper(["", "", ""]));
      view(NOV_READ("WS-M-MIX-02"));
      await waitFor(() => expect(H.wsLocal).toHaveBeenCalled());
      await settle();
      expect(screen.queryByTestId(BANNER)).toBeNull();
      cleanup();
      H.wsLocal.mockReturnValue(null);
      H.wsSnap.mockResolvedValue(null);
      view(NOV_READ("WS-M-MIX-02"));
      await waitFor(() => expect(H.wsSnap).toHaveBeenCalled());
      await settle();
      expect(screen.queryByTestId(BANNER)).toBeNull();
    });

    it("the stored paper is found on the server when this device has none (same paper): banner", async () => {
      H.local = [rec("WS-M-MIX-02")];
      H.wsLocal.mockReturnValue(null);
      H.wsSnap.mockResolvedValue({ code: "WS-M-MIX-02", paper: paper(NOV) });
      view(NOV_READ("WS-M-MIX-02"));
      expect(await screen.findByTestId(BANNER)).toBeTruthy();
    });

    it("a paper-store read failure: no banner", async () => {
      H.local = [rec("CT-M-TRI-03", { surface: "chapter-test", topicKeys: ["triangles"] })];
      H.ctPaper.mockRejectedValue(new Error("offline"));
      view(NOV_READ("CT-M-TRI-03"));
      await waitFor(() => expect(H.ctPaper).toHaveBeenCalled());
      await settle();
      expect(screen.queryByTestId(BANNER)).toBeNull();
    });

    it("a Full Mock whose stored paper is a different paper: no banner", async () => {
      H.local = [rec("FM-M-04", { surface: "full-mock", questionIds: ids(5) })];
      H.fmSnap.mockResolvedValue({ paper: paper(JULY) });
      view(NOV_READ("FM-M-04"));
      await waitFor(() => expect(H.fmSnap).toHaveBeenCalled());
      await settle();
      expect(screen.queryByTestId(BANNER)).toBeNull();
    });
  });
});

describe("isSamePaper", () => {
  it("matches across spacing / punctuation / transcription noise and needs the first three questions", () => {
    const read = NOV.slice(0, 3).map((q) => q.toUpperCase().replace(/ /g, "  ").replace(/\./g, " ."));
    expect(isSamePaper(NOV, read)).toBe(true);
    expect(isSamePaper(NOV, [read.join(" ")])).toBe(true); // one PDF page text holding all three
    expect(isSamePaper(NOV, read.slice(0, 2))).toBe(false); // Q3 missing
    expect(isSamePaper(JULY, NOV)).toBe(false);
    expect(isSamePaper(NOV, JULY)).toBe(false);
  });
  it("fails closed: no stored texts, empty texts, nothing uploaded", () => {
    expect(isSamePaper([], NOV)).toBe(false);
    expect(isSamePaper(["", ""], NOV)).toBe(false);
    expect(isSamePaper(NOV, [])).toBe(false);
    expect(isSamePaper(NOV, [null, undefined, "  "])).toBe(false);
  });
});
