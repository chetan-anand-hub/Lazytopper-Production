/** BRIDGE-CODES-1 - the Answer Checker reads pack paper codes (PK-, CBQ Pack documents included) and routes to that paper. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";

const H = vi.hoisted(() => ({
  local: [] as Array<{ surface: string }>, cloud: vi.fn(), track: vi.fn(), saved: vi.fn(), qr: vi.fn(),
  wsLocal: vi.fn(), wsSnap: vi.fn(), ctPaper: vi.fn(), fmSnap: vi.fn(),
}));
vi.mock("../../services/progressStore", () => ({ getSurfaceHistory: (surface: string) => H.local.filter((r) => r.surface === surface) }));
vi.mock("./decodePaperCode", () => ({ decodePaperCodeFromImage: (...a: unknown[]) => H.qr(...a) }));
vi.mock("./pdfPaperText", () => ({ readPdfPaperText: async () => [] }));
vi.mock("../../analytics/analytics", () => ({ trackNamedEvent: (...a: unknown[]) => H.track(...a) }));
vi.mock("../../services/sessionRecords", () => ({ getSessionRecordsFromCloud: (...a: unknown[]) => H.cloud(...a) }));
vi.mock("../../services/worksheetSessionStore", () => ({ getWorksheetSession: (...a: unknown[]) => H.wsLocal(...a) }));
vi.mock("../../services/worksheetPaperStore", () => ({ fetchWorksheetPaperSnapshot: (...a: unknown[]) => H.wsSnap(...a) }));
vi.mock("../../services/chapterTestPaperStore", () => ({ loadChapterTestPaper: (...a: unknown[]) => H.ctPaper(...a) }));
vi.mock("../../services/fullMockPaperStore", () => ({ fetchFullMockPaperSnapshot: (...a: unknown[]) => H.fmSnap(...a) }));
vi.mock("./packCodeSaved", () => ({ packCodeSavedOnAccount: (...a: unknown[]) => H.saved(...a) }));

import PaperCodeRouteBanner from "./PaperCodeRouteBanner";
import { findPaperCodes, isPackPaperCode } from "./paperCodeMatch";

const STORED = ["Prove that root 2 is irrational.", "Find the HCF of 96 and 404.", "Find the LCM of 12 and 18."];
const paper = (worksheetId = "pack-x") => ({ worksheetId, questions: STORED.map((questionText, i) => ({ qNumber: i + 1, questionText })) });
const rec = (id: string, over: Record<string, unknown> = {}) => ({
  id, surface: "worksheet", subject: "maths", status: "pending-upload", dedupKey: `u1::${id}`, worksheetId: "pack-x", questionIds: ["a", "b", "c"], ...over,
});
const view = (texts: string[], uid: string | null = "u1", files?: Array<{ base64: string | null; mime: string }>) =>
  render(<MemoryRouter><PaperCodeRouteBanner uid={uid} texts={texts} files={files} /></MemoryRouter>);
const PHOTO = [{ base64: "/9j/AAAA", mime: "image/jpeg" }];

beforeEach(() => {
  H.local = [];
  H.cloud.mockReset().mockResolvedValue([]);
  H.track.mockReset();
  H.saved.mockReset().mockResolvedValue(false);
  H.qr.mockReset().mockResolvedValue(null);
  H.wsLocal.mockReset().mockReturnValue(paper());
  H.wsSnap.mockReset().mockResolvedValue(null);
  H.ctPaper.mockReset().mockResolvedValue({ paper: paper() });
  H.fmSnap.mockReset().mockResolvedValue({ paper: paper() });
});
afterEach(cleanup);

describe("findPaperCodes: pack codes", () => {
  it("reads every pinned pack code (Chapter Test, Worksheet, Mock, CBQ, -V2) and nothing that only looks like one", () => {
    const pinned = Object.keys(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../lib/packs/packPaperCodes.pin.json"), "utf8")));
    expect(pinned.some((c) => c.includes("-CBQ"))).toBe(true);
    for (const c of pinned) {
      expect(findPaperCodes([`Paper code: ${c.toLowerCase()}.`]), c).toEqual([c]);
      expect(isPackPaperCode(c)).toBe(true);
    }
    expect(findPaperCodes(["PK-X-RN-CT1", "PK-M-RN-CT3", "PK-M-RN-QZ1", "XPK-M-RN-CT1", "PK-M-RN-CBQ"])).toEqual([]);
    expect(findPaperCodes(["WS-M-MIX-02 PK-M-RN-CBQ2"])).toEqual(["WS-M-MIX-02", "PK-M-RN-CBQ2"]);
  });
});

describe("PaperCodeRouteBanner: pack codes", () => {
  it("a typed CBQ pack code the student downloaded: offer to grade it on its worksheet page (the code alone identifies it)", async () => {
    H.local = [rec("PK-M-RN-CBQ1")];
    view(["pk-m-rn-cbq1"]);
    expect(await screen.findByTestId("paper-code-route-banner")).toBeTruthy();
    expect(screen.getByText("This looks like your worksheet PK-M-RN-CBQ1.")).toBeTruthy();
    expect(screen.getByTestId("paper-code-route-go").getAttribute("href")).toBe(
      "/practice/worksheets?subject=Maths&scope=full-subject&upload=PK-M-RN-CBQ1",
    );
    expect(H.saved).not.toHaveBeenCalled();
  });

  it("a pack Chapter Test code: the chapter-test review link (same as Home's papers waiting)", async () => {
    H.cloud.mockResolvedValue([rec("PK-M-RN-CT1", { surface: "chapter-test", topicKeys: ["real-numbers"] })]);
    view(["PK-M-RN-CT1"]);
    expect((await screen.findByTestId("paper-code-route-go")).getAttribute("href")).toBe(
      "/chapter-test/10/Maths/real-numbers?review=PK-M-RN-CT1&source=home&returnTo=%2F",
    );
  });

  it("an in-app code still needs its questions (GRADE-ROUTE-3 unchanged)", async () => {
    H.local = [rec("WS-M-MIX-02", { worksheetId: "pack-x" })];
    view(["WS-M-MIX-02"]);
    await waitFor(() => expect(H.wsLocal).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("paper-code-route-banner")).toBeNull();
    expect(screen.queryByTestId("paper-code-pack-note")).toBeNull();
  });

  it("a pack code NOT on this account (positive server answer): an honest note to My packs, no offer to grade it as that paper", async () => {
    view(["PK-S-ELE-CBQ2"]);
    expect(await screen.findByTestId("paper-code-pack-note")).toBeTruthy();
    expect(H.saved).toHaveBeenCalledWith("u1", "PK-S-ELE-CBQ2");
    expect(screen.queryByTestId("paper-code-route-go")).toBeNull();
    expect(screen.getByTestId("paper-code-pack-note-go").getAttribute("href")).toBe("/packs#my-packs");
    expect(document.body.textContent).not.toMatch(/\bAI\b|Premium|Check & Improve/);
    fireEvent.click(screen.getByTestId("paper-code-route-skip"));
    expect(screen.queryByTestId("paper-code-pack-note")).toBeNull();
  });

  it("could not tell (read failure / offline) or the record exists but has no offer (graded test): nothing", async () => {
    H.saved.mockResolvedValue(null);
    view(["PK-S-ELE-CBQ2"]);
    await waitFor(() => expect(H.saved).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("paper-code-pack-note")).toBeNull();
    cleanup();
    H.saved.mockResolvedValue(true);
    H.local = [rec("PK-M-RN-CT1", { surface: "chapter-test", topicKeys: ["real-numbers"], status: "graded" })];
    view(["PK-M-RN-CT1"]);
    await waitFor(() => expect(H.saved).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("paper-code-pack-note")).toBeNull();
    expect(screen.queryByTestId("paper-code-route-banner")).toBeNull();
  });

  it("signed out: nothing is read and nothing shows", async () => {
    view(["PK-M-RN-CT1"], null);
    await new Promise((r) => setTimeout(r, 0));
    expect(H.saved).not.toHaveBeenCalled();
    expect(screen.queryByTestId("paper-code-pack-note")).toBeNull();
  });

  // Round 2 (owner 8 Nov 20:17: QR on every pack paper): a code DECODED from the photo's footer QR routes exactly like a typed one.
  it("QR: a decoded CBQ set code the student downloaded -> the same offer as typing it (file name says nothing)", async () => {
    H.qr.mockResolvedValue("PK-M-RN-CBQ7");
    H.local = [rec("PK-M-RN-CBQ7")];
    view(["IMG_20261108_2015.jpg"], "u1", PHOTO);
    expect(await screen.findByTestId("paper-code-route-banner")).toBeTruthy();
    expect(H.qr).toHaveBeenCalledWith({ base64: "/9j/AAAA", mime: "image/jpeg" });
    expect(screen.getByTestId("paper-code-route-go").getAttribute("href")).toBe(
      "/practice/worksheets?subject=Maths&scope=full-subject&upload=PK-M-RN-CBQ7",
    );
  });

  it("QR: a decoded pack Chapter Test / Mock code -> its review link; not on this account -> the honest My packs note", async () => {
    H.qr.mockResolvedValue("PK-S-FULL-M5-V2");
    H.local = [rec("PK-S-FULL-M5-V2", { surface: "full-mock", subject: "science" })];
    view(["scan.jpg"], "u1", PHOTO);
    expect((await screen.findByTestId("paper-code-route-go")).getAttribute("href")).toBe(
      "/full-mock/10/Science?upload=PK-S-FULL-M5-V2&source=home&returnTo=%2F",
    );
    cleanup();
    H.local = [];
    H.qr.mockResolvedValue("PK-M-TRI-CBQ2");
    view(["scan.jpg"], "u1", PHOTO);
    expect(await screen.findByTestId("paper-code-pack-note")).toBeTruthy();
    expect(H.saved).toHaveBeenCalledWith("u1", "PK-M-TRI-CBQ2");
    expect(screen.queryByTestId("paper-code-route-go")).toBeNull();
  });

  it("QR: signed out -> the photo is not even decoded", async () => {
    H.qr.mockResolvedValue("PK-M-RN-CBQ7");
    view(["scan.jpg"], null, PHOTO);
    await new Promise((r) => setTimeout(r, 0));
    expect(H.qr).not.toHaveBeenCalled();
    expect(screen.queryByTestId("paper-code-route-banner")).toBeNull();
  });
});
