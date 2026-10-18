import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StudyReadModel } from "../../services/progressReadModel";
import type { ParentReport } from "./parentReportModel";

/**
 * PARENT-REPORT-1 — the card's three honest states render no placeholder, the sheet fires
 * `parent_report_shown` / `parent_report_share` with placement + state/method only, the share
 * carries the PNG and a text with no figure, and the name appears only when ticked.
 */
const { trackParentReportShown, trackParentReportShare, authUser } = vi.hoisted(() => ({
  trackParentReportShown: vi.fn(),
  trackParentReportShare: vi.fn(),
  authUser: { current: null as null | { uid: string; displayName: string | null; isLocalSession?: boolean } },
}));
vi.mock("../../analytics/analytics", () => ({ trackParentReportShown, trackParentReportShare }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => {
    if (!authUser.current) throw new Error("useAuth must be used inside AuthProvider");
    return { user: authUser.current };
  },
}));

import ParentReportCard, { ACTIVITY_EN, CARD_FOOTER, EMPTY_EN, EMPTY_HI } from "./ParentReportCard";
import ParentReportModal from "./ParentReportModal";
import ShareWithParentsButton from "./ShareWithParentsButton";
import { PARENT_REPORT_LINK } from "./parentReportModel";

const RANGE = { start: Date.parse("2026-10-11T18:30:00Z"), end: Date.parse("2026-10-18T12:00:00Z") };

/** The minimum of a read the card needs, for a student with `answers` answers marked and no pattern. */
function thinModel(answers: number): StudyReadModel {
  return {
    range: RANGE,
    subject: null,
    progress: { totals: answers > 0 ? { answers, marksLost: 4, marksScored: 2, marksAvailable: 6, marksNotAttempted: 0 } : null, subjectTotals: {}, subjects: [] },
    activity: { tests: { total: 1 } },
    mistakes: { entries: [], complete: true, wonBack: { count: 0, marks: 0 } },
  } as unknown as StudyReadModel;
}

const PATTERN: ParentReport = {
  state: "pattern",
  firstName: null,
  weekLabel: "12 – 18 Oct 2026",
  answersMarked: 8,
  testsTaken: 1,
  marksLost: 17,
  typeRows: [
    { key: "untyped", label: "Marks lost, reason not recorded", hindi: "कारण दर्ज नहीं", marks: 12 },
    { key: "conceptual", label: "Concept gap", hindi: "कॉन्सेप्ट समझने में कमी", marks: 5 },
  ],
  chapters: [{ key: "real-numbers", label: "Real Numbers", marks: 3 }],
  wonBack: { count: 1, marks: 2 },
  nextSteps: ["Learn this: 5 marks to gain — practise Real Numbers until the method is yours."],
};

const PLACEHOLDER = /NaN|undefined|\bnull\b|\[object|lorem|placeholder|0 \/ 0|>\s*—\s*</i;

let createObjectURL: ((b: Blob) => string) | undefined;
beforeEach(() => {
  createObjectURL = URL.createObjectURL;
  // jsdom has no object URLs: give the preview one (and let downloadBlob run).
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  trackParentReportShown.mockClear();
  trackParentReportShare.mockClear();
  authUser.current = null;
  if (createObjectURL) URL.createObjectURL = createObjectURL;
  Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  vi.restoreAllMocks();
});

describe("ParentReportCard — honest states, no placeholder", () => {
  it("empty: the owner's empty sentence (EN + HI) and no figure", () => {
    const html = renderToStaticMarkup(
      <ParentReportCard report={{ ...PATTERN, state: "empty", answersMarked: 1, marksLost: null, typeRows: [], chapters: [], wonBack: null, nextSteps: [] }} />,
    );
    expect(html).toContain(EMPTY_EN);
    expect(html).toContain(EMPTY_HI);
    expect(EMPTY_EN).toBe("Not enough checked answers this week to show a pattern — check 3 answers to see one");
    expect(html).not.toContain('data-testid="prc-answers"');
    expect(html).not.toContain('data-testid="prc-types"');
    expect(html).not.toMatch(PLACEHOLDER);
  });

  it("activity: counts and the note, nothing about why marks were lost", () => {
    const html = renderToStaticMarkup(
      <ParentReportCard report={{ ...PATTERN, state: "activity", marksLost: null, typeRows: [], chapters: [], wonBack: null, nextSteps: [] }} />,
    );
    expect(html).toContain(ACTIVITY_EN);
    expect(html).toContain('data-testid="prc-answers"');
    expect(html).not.toContain('data-testid="prc-lost"');
    expect(html).not.toContain('data-testid="prc-types"');
    expect(html).not.toMatch(PLACEHOLDER);
  });

  it("pattern: the model's figures, the Hindi line, the price framing that already exists, and the link label", () => {
    const html = renderToStaticMarkup(<ParentReportCard report={PATTERN} />);
    for (const s of ["17", "Concept gap", "कॉन्सेप्ट समझने में कमी", "Real Numbers", "12 – 18 Oct 2026", "Where I am losing marks", "मेरे अंक कहाँ कट रहे हैं"]) {
      expect(html).toContain(s);
    }
    expect(CARD_FOOTER).toBe("Month pass: less than one tuition session · lazytopper.com/pricing");
    expect(html).not.toMatch(PLACEHOLDER);
  });

  it("the first name appears only when the report carries it", () => {
    expect(renderToStaticMarkup(<ParentReportCard report={{ ...PATTERN, firstName: "Aarav" }} />)).toContain("Where Aarav is losing marks");
    expect(renderToStaticMarkup(<ParentReportCard report={PATTERN} />)).not.toContain("Aarav");
  });
});

function renderModal(over: Partial<Parameters<typeof ParentReportModal>[0]> = {}) {
  const renderPng = vi.fn(async (report: ParentReport) => new Blob([new Uint8Array([137, 80, 78, 71]), report.state], { type: "image/png" }));
  const read = vi.fn(async () => thinModel(1));
  const onClose = vi.fn();
  render(<ParentReportModal uid="u1" displayName={null} placement="me" onClose={onClose} read={read} render={renderPng} {...over} />);
  return { renderPng, read, onClose };
}

describe("ParentReportModal — analytics, share payload, name opt-in", () => {
  it("shows the PNG preview and fires parent_report_shown once with placement + state only", async () => {
    const { renderPng, read } = renderModal();
    await screen.findByTestId("prm-preview");
    expect(read).toHaveBeenCalledWith("u1");
    expect(trackParentReportShown).toHaveBeenCalledTimes(1);
    expect(trackParentReportShown).toHaveBeenCalledWith("me", "empty");
    expect(renderPng.mock.calls[0][0].state).toBe("empty");
  });

  it("native share: the PNG file + a text with the link and no figure; parent_report_share {me, native}", async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderModal({ read: vi.fn(async () => thinModel(5)) });
    await screen.findByTestId("prm-preview");
    await act(async () => {
      fireEvent.click(screen.getByTestId("prm-share"));
    });
    expect(share).toHaveBeenCalledTimes(1);
    const payload = (share.mock.calls[0] as unknown as [{ files: File[]; text: string }])[0];
    expect(payload.files[0]).toBeInstanceOf(File);
    expect(payload.files[0].type).toBe("image/png");
    expect(payload.text).toContain(PARENT_REPORT_LINK);
    expect(payload.text.replace(PARENT_REPORT_LINK, "").replace(/\d+ – \d+ Oct 2026/, "")).not.toMatch(/\d/);
    expect(trackParentReportShare).toHaveBeenCalledWith("me", "native");
    expect(trackParentReportShown).toHaveBeenCalledWith("me", "activity");
  });

  it("a cancelled share sheet sends no share event", async () => {
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", {
      value: vi.fn(async () => {
        throw new DOMException("x", "AbortError");
      }),
      configurable: true,
    });
    renderModal();
    await screen.findByTestId("prm-preview");
    await act(async () => {
      fireEvent.click(screen.getByTestId("prm-share"));
    });
    expect(trackParentReportShare).not.toHaveBeenCalled();
  });

  it("desktop: opens wa.me with the text inside the tap and counts it only when a window opened", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => ({ opener: {} }) as unknown as Window);
    renderModal({ placement: "home" });
    await screen.findByTestId("prm-preview");
    await act(async () => {
      fireEvent.click(screen.getByTestId("prm-share"));
    });
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/\?text=/), "_blank");
    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain("utm_source=parent_share");
    expect(trackParentReportShare).toHaveBeenCalledWith("home", "whatsapp_link");

    trackParentReportShare.mockClear();
    open.mockImplementation(() => null);
    await act(async () => {
      fireEvent.click(screen.getByTestId("prm-share"));
    });
    expect(trackParentReportShare).not.toHaveBeenCalled();
  });

  it("the first name is OFF by default and reaches the card only when ticked", async () => {
    const { renderPng } = renderModal({ displayName: "Aarav Kumar", read: vi.fn(async () => thinModel(5)) });
    await screen.findByTestId("prm-preview");
    expect(renderPng.mock.calls[0][0].firstName).toBeNull();
    fireEvent.click(screen.getByTestId("prm-show-name"));
    await waitFor(() => expect(renderPng.mock.calls.at(-1)?.[0].firstName).toBe("Aarav"));
  });

  it("an email-like display name offers no name box at all", async () => {
    renderModal({ displayName: "aarav.k@gmail.com" });
    await screen.findByTestId("prm-preview");
    expect(screen.queryByTestId("prm-show-name")).toBeNull();
  });

  it("a failed read says so honestly — no card, no share", async () => {
    renderModal({ read: vi.fn(async () => Promise.reject(new Error("offline"))) });
    await screen.findByTestId("prm-error");
    expect((screen.getByTestId("prm-share") as HTMLButtonElement).disabled).toBe(true);
    expect(trackParentReportShown).not.toHaveBeenCalled();
  });
});

describe("ShareWithParentsButton — real signed-in accounts only", () => {
  it("renders nothing outside an AuthProvider, signed out, or in a local session", () => {
    expect(renderToStaticMarkup(<ShareWithParentsButton placement="me" />)).toBe("");
    authUser.current = { uid: "local", displayName: "Local Student", isLocalSession: true };
    expect(renderToStaticMarkup(<ShareWithParentsButton placement="me" />)).toBe("");
  });

  it("renders the button for a real account, with the C&I wording where asked", () => {
    authUser.current = { uid: "u1", displayName: "Aarav" };
    expect(renderToStaticMarkup(<ShareWithParentsButton placement="me" />)).toContain("Share with parents");
    expect(
      renderToStaticMarkup(<ShareWithParentsButton placement="check_improve" label="Show my parents where I lose marks" />),
    ).toContain("Show my parents where I lose marks");
  });
});
