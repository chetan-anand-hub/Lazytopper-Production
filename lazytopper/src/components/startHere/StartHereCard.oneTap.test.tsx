import { setMatchMediaMatches } from "../../test/setup";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

/**
 * START-HERE-ONE-TAP-1 — one tap from Start-here to five graded questions.
 * The READY state shows one button per subject (the hinted one only, else Maths and Science),
 * each launching that subject's pre-selected chapter on MCQ through the SAME launch path as the
 * picker's go. "Change chapter or question type" reveals the picker as it was.
 */
const { cloudHas, localRows, onboarding, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
    Maths: { "real-numbers": { mcq: 20, ar: 0 }, polynomials: { mcq: 0, ar: 0 } } as Record<string, { mcq: number; ar: number }>,
    Science: { electricity: { mcq: 25, ar: 10 } } as Record<string, { mcq: number; ar: number }>,
  },
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  bank: {
    startHereAvailability: vi.fn(),
    pickStartHereSet: vi.fn(),
  },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding }));
vi.mock("./startHereBank", () => bank);
vi.mock("./startHereAvailability.generated", () => ({ START_HERE_AVAILABILITY: AVAIL }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import StartHereCard, { START_HERE_GETTING, oneTapTarget } from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";
import {
  START_HERE_COPY,
  START_HERE_COUNT,
  START_HERE_FAIL_COPY,
  START_HERE_ONE_TAP_COPY,
  START_HERE_SUBJECT_HINT_KEY,
} from "./startHereModel";

let location = "";
function Probe() {
  const l = useLocation();
  location = `${l.pathname}${l.search}`;
  return null;
}

const mount = (focus = false) =>
  render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <Probe />
      <Routes>
        <Route path="*" element={<StartHereCard uid="u1" surface="practice_hub" returnTo="/practice-hub" focus={focus} />} />
      </Routes>
    </MemoryRouter>,
  );
const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);
const card = () => screen.queryByTestId("start-here-card");
const chapterName = (subject: "Maths" | "Science", slug: string) =>
  desktopTopicsBySubject(subject).find((t) => t.slug === slug)!.name;
const query = () => new URLSearchParams(location.split("?")[1]);

async function openInline() {
  mount();
  await waitFor(() => expect(card()).not.toBeNull());
  fireEvent.click(screen.getByTestId("start-here-start")); // tap 1
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  cloudHas.mockReset().mockResolvedValue(false);
  auth.currentUser = null;
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  bank.startHereAvailability.mockReset();
  bank.pickStartHereSet.mockReset().mockResolvedValue(["a", "b", "c", "d", "e"]);
  location = "";
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe("START-HERE-ONE-TAP-1 · the ready state (inline card)", () => {
  it("★★ Maths hint: ONE button naming the pre-selected Maths chapter; one tap opens five Maths MCQs", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Maths");
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    // The inline card's first button keeps its label; it now opens the ready state.
    expect(screen.getByTestId("start-here-start").textContent).toBe(START_HERE_COPY.start);
    fireEvent.click(screen.getByTestId("start-here-start")); // tap 1
    const btn = await screen.findByTestId("start-here-one-tap-maths");
    expect(screen.queryByTestId("start-here-one-tap-science")).toBeNull();
    expect(btn.textContent).toBe(`Start 5 questions · ${chapterName("Maths", "real-numbers")}`);
    expect(btn.getAttribute("data-chapter")).toBe("real-numbers");
    // The picker is NOT shown up front.
    expect(screen.queryByTestId("start-here-subject-maths")).toBeNull();
    expect(screen.queryByTestId("start-here-go")).toBeNull();
    expect(bank.pickStartHereSet).not.toHaveBeenCalled();

    fireEvent.click(btn); // tap 2
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Maths\?/));
    const q = query();
    expect(q.get("src")).toBe("start_here");
    expect(q.get("qt")).toBe("mcq");
    expect(q.get("topic")).toBe("real-numbers");
    expect(q.get("focusBankIds")!.split(",")).toHaveLength(5);
    expect(q.get("count")).toBe("5");
    expect(bank.pickStartHereSet).toHaveBeenCalledTimes(1);
    expect(bank.pickStartHereSet.mock.calls[0][0]).toMatchObject({ subject: "Maths", chapter: "real-numbers", qtype: "mcq" });
    expect(calls("start_here_start")).toEqual([
      ["start_here_start", { subject: "maths", chapter: "real-numbers", qtype: "mcq", mode: "one_tap" }],
    ]);
  });

  it("★★ no hint: two buttons, 'Maths · 5 questions' and 'Science · 5 questions'; Science launches Science", async () => {
    await openInline();
    const maths = screen.getByTestId("start-here-one-tap-maths");
    const science = screen.getByTestId("start-here-one-tap-science");
    expect(maths.textContent).toBe(`Maths · ${START_HERE_ONE_TAP_COPY.perSubjectSuffix}`);
    expect(science.textContent).toBe(`Science · ${START_HERE_ONE_TAP_COPY.perSubjectSuffix}`);
    expect(maths.textContent).toBe("Maths · 5 questions");
    expect(START_HERE_ONE_TAP_COPY.perSubjectSuffix).toBe(`${START_HERE_COUNT} questions`);
    // One live region for the ready buttons (the container), none on each button.
    expect(screen.getByTestId("start-here-ready").getAttribute("aria-live")).toBe("polite");
    expect(maths.hasAttribute("aria-live")).toBe(false);
    fireEvent.click(science);
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    expect(query().get("topic")).toBe("electricity");
    expect(query().get("qt")).toBe("mcq");
    expect(calls("start_here_start")).toEqual([
      ["start_here_start", { subject: "science", chapter: "electricity", qtype: "mcq", mode: "one_tap" }],
    ]);
  });

  it("★ while fetching, the tapped button says so honestly and every launch control is disabled", async () => {
    let release: (ids: string[]) => void = () => undefined;
    bank.pickStartHereSet.mockReturnValue(new Promise<string[]>((r) => (release = r)));
    await openInline();
    fireEvent.click(screen.getByTestId("start-here-one-tap-maths"));
    await waitFor(() => expect(screen.getByTestId("start-here-one-tap-maths").textContent).toBe(START_HERE_GETTING));
    expect((screen.getByTestId("start-here-one-tap-maths") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("start-here-one-tap-science") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("start-here-change") as HTMLButtonElement).disabled).toBe(true);
    release(["a", "b", "c", "d", "e"]);
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Maths\?/));
  });

  it("★★ 'Change chapter or question type' reveals the old picker; its go still works, with mode=picker", async () => {
    await openInline();
    const change = screen.getByTestId("start-here-change");
    expect(change.textContent).toBe(START_HERE_ONE_TAP_COPY.change);
    fireEvent.click(change);
    expect(screen.queryByTestId("start-here-ready")).toBeNull();
    // Today's picker exactly: no hint -> nothing pre-selected, go disabled until a subject is tapped.
    expect(screen.getByTestId("start-here-subject-maths").getAttribute("aria-checked")).toBe("false");
    expect((screen.getByTestId("start-here-go") as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId("start-here-subject-maths")));
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    fireEvent.click(screen.getByTestId("start-here-qtype-ar"));
    fireEvent.click(screen.getByTestId("start-here-go"));
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    expect(query().get("qt")).toBe("ar");
    expect(calls("start_here_start")).toEqual([
      ["start_here_start", { subject: "science", chapter: "electricity", qtype: "ar", mode: "picker" }],
    ]);
  });

  it("★★ start_here_shown / start_here_dismissed are unchanged (no mode param)", async () => {
    await openInline();
    await waitFor(() => expect(calls("start_here_shown")).toEqual([["start_here_shown", { surface: "practice_hub" }]]));
    fireEvent.click(screen.getByTestId("start-here-not-now")); // Not now is still offered in the ready state
    expect(calls("start_here_dismissed")).toEqual([["start_here_dismissed", { surface: "practice_hub" }]]);
    expect(card()).toBeNull();
  });

  it("★★ bank failure on one tap: the existing failure note, no event, no navigation; Change still opens the picker", async () => {
    bank.pickStartHereSet.mockResolvedValue(["a", "b"]);
    await openInline();
    fireEvent.click(screen.getByTestId("start-here-one-tap-science"));
    const note = await screen.findByRole("alert");
    // The ready state shows no chapter control, so its note points at the Change control.
    expect(note.textContent).toBe(START_HERE_FAIL_COPY.ready);
    expect(note.textContent).toContain(START_HERE_ONE_TAP_COPY.change);
    expect(location).toBe("/practice-hub");
    expect(calls("start_here_start")).toHaveLength(0);
    const change = screen.getByTestId("start-here-change") as HTMLButtonElement;
    expect(change.disabled).toBe(false);
    fireEvent.click(change);
    // The picker opens on the subject that was tapped.
    expect(screen.getByTestId("start-here-subject-science").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("start-here-chapter").getAttribute("data-chapter")).toBe("electricity");
  });

  it("a thrown bank import/pick also shows the note and re-enables the buttons", async () => {
    bank.pickStartHereSet.mockRejectedValue(new Error("offline"));
    await openInline();
    fireEvent.click(screen.getByTestId("start-here-one-tap-maths"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect((screen.getByTestId("start-here-one-tap-maths") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("START-HERE-ONE-TAP-1 · the focused surface", () => {
  it("★★ opens on the ready state: ONE tap from open to the five-question set", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Science");
    mount(true);
    const focus = await screen.findByTestId("start-here-focus");
    expect(focus).toBeInTheDocument();
    const btn = screen.getByTestId("start-here-focus-one-tap-science");
    expect(btn.textContent).toBe(`Start 5 questions · ${chapterName("Science", "electricity")}`);
    expect(screen.queryByTestId("start-here-focus-one-tap-maths")).toBeNull();
    fireEvent.click(btn); // the ONE tap
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    expect(query().get("src")).toBe("start_here");
    expect(query().get("qt")).toBe("mcq");
    expect(calls("start_here_start")).toEqual([
      ["start_here_start", { subject: "science", chapter: "electricity", qtype: "mcq", mode: "one_tap" }],
    ]);
  });

  it("★★ Esc = Not now and the focused Not now are unchanged", async () => {
    mount(true);
    await screen.findByTestId("start-here-focus-ready");
    await waitFor(() => expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(calls("start_here_dismissed")).toEqual([["start_here_dismissed", { surface: "practice_hub_focus" }]]);
    expect(card()).not.toBeNull();
    cleanup();
    window.sessionStorage.clear();
    mount(true);
    await screen.findByTestId("start-here-focus-ready");
    fireEvent.click(screen.getByTestId("start-here-focus-not-now"));
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(calls("start_here_dismissed")).toHaveLength(2);
  });
});

describe("START-HERE-ONE-TAP-1 · targets and edges", () => {
  it("★ 44px floor on the launch buttons and the Change link; no inline style attribute", async () => {
    await openInline();
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent ?? "").join("\n");
    expect(/\.lt-shc \.lt-shc-go \{[^}]*min-height: 44px;[^}]*\}/.test(css)).toBe(true);
    expect(/\.lt-shc \.lt-shc-change \{[^}]*min-height: 44px;[^}]*\}/.test(css)).toBe(true);
    expect(screen.getByTestId("start-here-one-tap-maths").matches(".lt-shc .lt-shc-go")).toBe(true);
    expect(screen.getByTestId("start-here-change").matches(".lt-shc .lt-shc-change")).toBe(true);
    expect(card()!.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("a subject whose pre-selected chapter has no full MCQ set gets no one-tap button", () => {
    const saved = { ...AVAIL.Science.electricity };
    try {
      AVAIL.Science.electricity = { mcq: 0, ar: 10 };
      expect(oneTapTarget("Science")).toBeNull();
      expect(oneTapTarget("Maths")).toMatchObject({ subject: "Maths", slug: "real-numbers" });
    } finally {
      AVAIL.Science.electricity = saved;
    }
  });

  it("nothing launchable in one tap -> the picker opens directly (as before)", async () => {
    const saved = { m: { ...AVAIL.Maths["real-numbers"] }, s: { ...AVAIL.Science.electricity } };
    try {
      AVAIL.Maths["real-numbers"] = { mcq: 0, ar: 0 };
      AVAIL.Science.electricity = { mcq: 0, ar: 10 };
      await openInline();
      expect(screen.queryByTestId("start-here-ready")).toBeNull();
      expect(screen.getByTestId("start-here-subject-maths")).toBeInTheDocument();
    } finally {
      AVAIL.Maths["real-numbers"] = saved.m;
      AVAIL.Science.electricity = saved.s;
    }
  });
});
