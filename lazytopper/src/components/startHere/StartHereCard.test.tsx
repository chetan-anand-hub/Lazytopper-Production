import { setMatchMediaMatches } from "../../test/setup";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { cloudHas, localRows, onboarding, bank, auth, AVAIL } = vi.hoisted(() => ({
  // QP-SCORECARD-2 D3: the card lists chapters from the precomputed map (mocked here with this
  // stub); the real map is pinned against the real bank in startHereBank.test.ts.
  AVAIL: {
    Maths: { "real-numbers": { mcq: 20, ar: 0 }, polynomials: { mcq: 0, ar: 0 } },
    Science: { electricity: { mcq: 25, ar: 10 } },
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

import StartHereCard, { START_HERE_GETTING, START_HERE_RETRY_MS, accountIsNew } from "./StartHereCard";
import { resetZeroGradedCacheForTests, ZERO_GRADED_NONE_TTL_MS } from "./zeroGraded";
import {
  START_HERE_COPY,
  START_HERE_DISMISSED_KEY,
  START_HERE_FOCUS_CLOSED_KEY,
  START_HERE_FOCUS_NOT_NOW_PREFIX,
  START_HERE_SUBJECT_HINT_KEY,
} from "./startHereModel";

/**
 * START-HERE-1 §2.1 / §2.2 — who sees the card, "Not now", the picker, the events.
 * The bank half is replaced by a stub (its own file tests the real bank).
 */
let location = "";
function Probe() {
  const l = useLocation();
  location = `${l.pathname}${l.search}`;
  return null;
}


const tree = (uid: string | null = "u1", extra: { focus?: boolean; inProgress?: boolean } = {}) => (
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <Probe />
      <Routes>
        <Route path="*" element={<StartHereCard uid={uid} surface="practice_hub" returnTo="/practice-hub" {...extra} />} />
      </Routes>
    </MemoryRouter>
);
const mount = (uid: string | null = "u1", extra: { focus?: boolean; inProgress?: boolean } = {}) => render(tree(uid, extra));
const daysAgo = (n: number): string => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toUTCString();
const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);
const card = () => screen.queryByTestId("start-here-card");
/** Opens the reused ChapterPickerModal from the card's chapter button; returns its chapter list. */
async function openChapterPicker(prefix = "start-here"): Promise<HTMLSelectElement> {
  fireEvent.click(await screen.findByTestId(`${prefix}-chapter`));
  const picker = await screen.findByTestId(`${prefix}-chapter-picker`);
  return within(picker).getByLabelText("Chapter") as HTMLSelectElement;
}

beforeEach(() => {
  window.sessionStorage.clear();
  resetZeroGradedCacheForTests(); // SHW-2: the cloud answer is kept per uid per tab
  cloudHas.mockReset();
  auth.currentUser = null;
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  bank.startHereAvailability.mockReset();
  bank.pickStartHereSet.mockReset();
  bank.pickStartHereSet.mockResolvedValue(["a", "b", "c", "d", "e"]);
  location = "";
});
afterEach(cleanup);

describe("START-HERE-1 · who sees the card (§2.1)", () => {
  it("★★ a signed-in account with ZERO graded results sees it, with the owner's copy", async () => {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    expect(card()!.textContent).toContain(START_HERE_COPY.kicker);
    expect(card()!.textContent).toContain(START_HERE_COPY.body);
    expect(screen.getByTestId("start-here-start").textContent).toBe("Start");
    expect(screen.getByTestId("start-here-not-now").textContent).toBe("Not now");
  });

  it("★★ it hides once there is a graded result: local rows answer at once with NO cloud call", async () => {
    localRows.mockReturnValue([{ id: "r1" }]);
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
    expect(cloudHas).not.toHaveBeenCalled();
    expect(calls("start_here_shown")).toHaveLength(0);
  });

  it("★★ no local rows but the cloud holds one (a returning student on a fresh device): no card", async () => {
    cloudHas.mockResolvedValue(true);
    mount();
    await waitFor(() => expect(cloudHas).toHaveBeenCalledWith("u1"));
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
  });

  it("★★ the cloud cannot tell (null) and the account is unknown or old: hidden, never the card", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      cloudHas.mockResolvedValue(null);
      for (const created of [undefined, daysAgo(60)]) {
        auth.currentUser = { uid: "u1", metadata: { creationTime: created } };
        cloudHas.mockClear();
        mount();
        await vi.advanceTimersByTimeAsync(START_HERE_RETRY_MS + 50);
        expect(cloudHas).toHaveBeenCalledTimes(2); // asked, waited, asked ONCE more
        expect(card()).toBeNull();
        cleanup();
      }
      expect(calls("start_here_shown")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("★★ a weak network must not hide the card from a NEW student: null twice + an account made 2 days ago -> shows", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      cloudHas.mockResolvedValue(null);
      auth.currentUser = { uid: "u1", metadata: { creationTime: daysAgo(2) } };
      mount();
      await vi.advanceTimersByTimeAsync(START_HERE_RETRY_MS + 50);
      await waitFor(() => expect(card()).not.toBeNull());
      expect(cloudHas).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the retry can settle it: null, then a real false -> shows; null, then true -> hidden", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      auth.currentUser = { uid: "u1", metadata: { creationTime: daysAgo(60) } };
      cloudHas.mockResolvedValueOnce(null).mockResolvedValueOnce(false);
      mount();
      await vi.advanceTimersByTimeAsync(START_HERE_RETRY_MS + 50);
      await waitFor(() => expect(card()).not.toBeNull());
      cleanup();
      // SHW-3: the second half is a LATER visit. Within ZERO_GRADED_NONE_TTL_MS the server's "no
      // records" is reused by design (no extra read); past it, a mount asks again - so move the clock.
      await vi.advanceTimersByTimeAsync(ZERO_GRADED_NONE_TTL_MS);
      cloudHas.mockReset().mockResolvedValueOnce(null).mockResolvedValueOnce(true);
      mount();
      await vi.advanceTimersByTimeAsync(START_HERE_RETRY_MS + 50);
      expect(cloudHas).toHaveBeenCalledTimes(2); // it really asked (and retried) again
      expect(card()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("accountIsNew: only the signed-in uid, within 7 days, never a future or unparseable date", () => {
    auth.currentUser = { uid: "u1", metadata: { creationTime: daysAgo(6) } };
    expect(accountIsNew("u1")).toBe(true);
    expect(accountIsNew("someone-else")).toBe(false);
    auth.currentUser = { uid: "u1", metadata: { creationTime: daysAgo(8) } };
    expect(accountIsNew("u1")).toBe(false);
    auth.currentUser = { uid: "u1", metadata: { creationTime: daysAgo(-3) } };
    expect(accountIsNew("u1")).toBe(false);
    auth.currentUser = { uid: "u1", metadata: { creationTime: "not a date" } };
    expect(accountIsNew("u1")).toBe(false);
    auth.currentUser = null;
    expect(accountIsNew("u1")).toBe(false);
  });

  it("★ signed-out: nothing renders and nothing is read (signed-out pages are unchanged)", async () => {
    const { container } = mount(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
    expect(container.innerHTML).toBe("");
    expect(cloudHas).not.toHaveBeenCalled();
    expect(localRows).not.toHaveBeenCalled();
  });

  it("★ hydration is a third state: nothing renders while the read is in flight, and a failed read is silence", async () => {
    let resolve: (v: boolean | null) => void = () => undefined;
    cloudHas.mockReturnValue(new Promise((r) => (resolve = r)));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull(); // in flight: not the card
    resolve(false);
    await waitFor(() => expect(card()).not.toBeNull());
    cleanup();
    // SHW-2: a server answer is kept per uid for this tab; a NEW tab (fresh module state) asks again.
    resetZeroGradedCacheForTests();
    cloudHas.mockRejectedValue(new Error("offline"));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull(); // an unreadable history is not evidence of a first session
  });
});

describe("START-HERE-1 · \"Not now\" is session-scoped (§2.1)", () => {
  it("★★ hides it for the rest of the session, fires start_here_dismissed once, and it returns on the next visit", async () => {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-not-now"));
    expect(card()).toBeNull();
    expect(calls("start_here_dismissed")).toEqual([["start_here_dismissed", { surface: "practice_hub" }]]);
    expect(window.localStorage.getItem(START_HERE_DISMISSED_KEY)).toBeNull();
    // Same session, a later mount (another page): still hidden.
    cleanup();
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(card()).toBeNull();
    // The next visit (a new tab/session = empty sessionStorage): it returns, once.
    cleanup();
    window.sessionStorage.clear();
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
  });

  it("start_here_shown fires once per mount, however many times it re-renders", async () => {
    cloudHas.mockResolvedValue(false);
    const { rerender } = mount();
    await waitFor(() => expect(card()).not.toBeNull());
    rerender(tree());
    rerender(tree());
    fireEvent.click(screen.getByTestId("start-here-start"));
    expect(calls("start_here_shown")).toEqual([["start_here_shown", { surface: "practice_hub" }]]);
  });
});

describe("START-HERE-1 · the picker (§2.2)", () => {
  async function open() {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-start"));
    // START-HERE-ONE-TAP-1: "Start" now opens the one-tap READY state; the picker is behind "Change…".
    fireEvent.click(screen.getByTestId("start-here-change"));
  }

  it("★★ with a Maths ad hint, Maths is pre-selected; Quick 5 is the default type", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Maths");
    await open();
    expect(screen.getByTestId("start-here-subject-maths").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("start-here-subject-science").getAttribute("aria-checked")).toBe("false");
    // QP-SCORECARD-2 D2 (Oct 2026): the chapter is a button opening ChapterPickerModal, not a <select>.
    expect((await screen.findByTestId("start-here-chapter")).getAttribute("data-chapter")).toBe("real-numbers");
    // QP-SCORECARD-2 D1 (Oct 2026) made the type a chip button; SHW-2 made it a role="radio" option (aria-checked).
    expect(screen.getByTestId("start-here-qtype-mcq").getAttribute("aria-checked")).toBe("true");
  });

  it("★★ an unknown landing: nothing is pre-selected and the card ASKS", async () => {
    await open();
    expect(screen.getByTestId("start-here-subject-maths").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("start-here-subject-science").getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByTestId("start-here-chapter")).toBeNull();
    expect((screen.getByTestId("start-here-go") as HTMLButtonElement).disabled).toBe(true);
  });

  it("★ a chapter without CBQ MCQs reads 'coming soon' and cannot be picked", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Maths");
    await open();
    // QP-SCORECARD-2 D2 (Oct 2026): the chapter list now lives in the reused ChapterPickerModal.
    const select = await openChapterPicker();
    const soon = Array.from(select.options).find((o) => o.value === "polynomials")!;
    expect(soon.textContent).toContain("coming soon");
    expect(soon.disabled).toBe(true);
  });

  it("★ only the question types the chapter really has are offered (A-R only when it has them)", async () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Maths");
    await open();
    await screen.findByTestId("start-here-chapter");
    expect(screen.queryByTestId("start-here-qtype-ar")).toBeNull(); // real-numbers: no A-R in this stub
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    await screen.findByTestId("start-here-qtype-ar");
    expect(screen.getByTestId("start-here-qtype-mcq")).toBeInTheDocument();
  });

  it("★★ Start opens Quick Practice on the picked five, fires start_here_start once, with slug params only", async () => {
    await open();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    await screen.findByTestId("start-here-chapter");
    fireEvent.click(screen.getByTestId("start-here-qtype-ar"));
    fireEvent.click(screen.getByTestId("start-here-go"));
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    const q = new URLSearchParams(location.split("?")[1]);
    expect(q.get("topic")).toBe("electricity");
    expect(q.get("focusBankIds")).toBe("a,b,c,d,e");
    expect(q.get("strictFocus")).toBe("true");
    expect(q.get("count")).toBe("5");
    expect(q.get("src")).toBe("start_here");
    expect(q.get("qt")).toBe("ar");
    expect(bank.pickStartHereSet.mock.calls[0][0]).toMatchObject({ subject: "Science", chapter: "electricity", qtype: "ar" });
    expect(calls("start_here_start")).toEqual([["start_here_start", { subject: "science", chapter: "electricity", qtype: "ar", mode: "picker" }]]);
  });

  it("★ if five questions cannot be lined up it says so and stays; no start event, no navigation", async () => {
    bank.pickStartHereSet.mockResolvedValue(["a", "b"]);
    await open();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    await screen.findByTestId("start-here-chapter");
    fireEvent.click(screen.getByTestId("start-here-go"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(location).toBe("/practice-hub");
    expect(calls("start_here_start")).toHaveLength(0);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────────────────
 * QP-SCORECARD-2 D1-D4 — the picker fixes (owner report, Oct 2026, a NEW account).
 * ───────────────────────────────────────────────────────────────────────────────────────── */
describe("QP-SCORECARD-2 D · the picker", () => {
  async function openPicker() {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-start"));
    // START-HERE-ONE-TAP-1: "Start" now opens the one-tap READY state; the picker is behind "Change…".
    fireEvent.click(screen.getByTestId("start-here-change"));
  }

  it("★★ D1: no radio input renders in the card; the question types are segmented radio options with aria-checked, Quick 5 pre-selected", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    const mcq = screen.getByTestId("start-here-qtype-mcq");
    const ar = screen.getByTestId("start-here-qtype-ar");
    expect(card()!.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    // SHW-2 (Oct 2026): the choices are segmented-control radios (role="radio" buttons, aria-checked).
    for (const chip of [mcq, ar]) {
      expect(chip.tagName).toBe("BUTTON");
      expect(chip.className).toBe("lt-shc-seg-opt"); // the SAME option class as the subject row
    }
    expect(screen.getByTestId("start-here-subject-science").className).toBe("lt-shc-seg-opt");
    expect(mcq.getAttribute("aria-checked")).toBe("true");
    expect(ar.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(ar);
    expect(ar.getAttribute("aria-checked")).toBe("true");
    expect(mcq.getAttribute("aria-checked")).toBe("false");
  });

  it("★ D1: the A-R chip shows only when the chapter has a full set of A-R CBQ MCQs", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-maths")); // real-numbers: ar 0 in the stub
    expect(screen.getByTestId("start-here-qtype-mcq")).toBeInTheDocument();
    expect(screen.queryByTestId("start-here-qtype-ar")).toBeNull();
  });

  it("★★ D2: no <select> in the card; the chapter button opens the EXISTING ChapterPickerModal on the tapped subject", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    expect(card()!.querySelectorAll("select")).toHaveLength(0);
    const btn = screen.getByTestId("start-here-chapter");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.textContent).toContain("Electricity");
    const select = await openChapterPicker();
    const picker = screen.getByTestId("start-here-chapter-picker");
    expect(picker.className).toContain("lt-tutor-ov"); // ChapterPickerModal's own overlay
    expect(within(picker).getByRole("dialog").getAttribute("aria-label")).toBe("Pick a chapter");
    expect(within(picker).queryByLabelText("Subject")).toBeNull(); // the subject is locked to the tap
    expect(Array.from(select.options).map((o) => o.value)).toEqual(desktopTopicsBySubject("Science").map((t) => t.slug));
    expect(select.value).toBe("electricity");
  });

  it("★★ D2: in the picker a chapter without CBQ MCQs is 'coming soon' and not selectable; a ready one is chosen", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-maths"));
    const select = await openChapterPicker();
    const soon = Array.from(select.options).find((o) => o.value === "polynomials")!;
    expect(soon.textContent).toContain("coming soon");
    expect(soon.disabled).toBe(true);
    fireEvent.change(select, { target: { value: "polynomials" } });
    expect(select.value).toBe("real-numbers"); // a coming-soon chapter is never the selection
    fireEvent.click(screen.getByTestId("start-here-chapter-picker-open"));
    expect(screen.queryByTestId("start-here-chapter-picker")).toBeNull();
    expect(screen.getByTestId("start-here-chapter").getAttribute("data-chapter")).toBe("real-numbers");
    expect(document.activeElement).toBe(screen.getByTestId("start-here-chapter")); // focus returns
  });

  it("★★ D3: a subject tap lists chapters AT ONCE with no bank call (no 'Checking…' state)", async () => {
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    // Synchronous: no await between the tap and the chosen chapter.
    expect(screen.getByTestId("start-here-chapter").getAttribute("data-chapter")).toBe("electricity");
    expect(card()!.textContent).not.toContain("Checking which chapters");
    fireEvent.click(screen.getByTestId("start-here-subject-maths"));
    expect(screen.getByTestId("start-here-chapter")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(bank.startHereAvailability).not.toHaveBeenCalled();
    expect(bank.pickStartHereSet).not.toHaveBeenCalled();
  });

  it("★★ D3: the bank is fetched only on Start, with an honest 'Getting your 5 questions…' state", async () => {
    let release: (ids: string[]) => void = () => undefined;
    bank.pickStartHereSet.mockReturnValue(new Promise<string[]>((r) => (release = r)));
    await openPicker();
    fireEvent.click(screen.getByTestId("start-here-subject-science"));
    expect(bank.pickStartHereSet).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("start-here-go"));
    await waitFor(() => expect(bank.pickStartHereSet).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("start-here-go").textContent).toBe(START_HERE_GETTING);
    expect(START_HERE_GETTING).toBe("Getting your 5 questions…");
    expect((screen.getByTestId("start-here-go") as HTMLButtonElement).disabled).toBe(true);
    release(["a", "b", "c", "d", "e"]);
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
  });

  it("★★ D4: with no ad hint NO subject is pre-selected (inline card AND the focused surface)", async () => {
    window.localStorage.clear();
    await openPicker();
    for (const s of ["maths", "science"]) {
      expect(screen.getByTestId(`start-here-subject-${s}`).getAttribute("aria-checked")).toBe("false");
    }
    cleanup();
    mount("u1", { focus: true });
    await screen.findByTestId("start-here-focus");
    fireEvent.click(screen.getByTestId("start-here-focus-change")); // START-HERE-ONE-TAP-1: picker behind "Change…"
    for (const s of ["maths", "science"]) {
      expect(screen.getByTestId(`start-here-focus-subject-${s}`).getAttribute("aria-checked")).toBe("false");
    }
    expect(screen.queryByTestId("start-here-focus-chapter")).toBeNull();
    expect((screen.getByTestId("start-here-focus-go") as HTMLButtonElement).disabled).toBe(true);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────────────────
 * QP-SCORECARD-2 E — the focused first-run surface (owner ruling, Oct 2026).
 * ───────────────────────────────────────────────────────────────────────────────────────── */
describe("QP-SCORECARD-2 E · the focused first-run surface", () => {
  const focusEl = () => screen.queryByTestId("start-here-focus");
  const dialog = () => screen.getByRole("dialog");
  // The dialog can be in the DOM before its passive effects run. The trap's document listeners
  // and the initial focus are installed in the same effect flush (trap first), so focus being
  // inside the dialog proves the trap is live. Wait for that before poking the trap.
  const trapActive = async () => {
    await waitFor(() => expect(focusEl()).not.toBeNull());
    await waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true));
  };
  const count = () => window.localStorage.getItem(`${START_HERE_FOCUS_NOT_NOW_PREFIX}u1`);

  beforeEach(() => {
    window.localStorage.clear();
    cloudHas.mockResolvedValue(false);
  });
  afterEach(() => setMatchMediaMatches(false));

  it("★★ zero-graded + focus: the focused surface opens, role=dialog, aria-modal, aria-labelledby -> the heading", async () => {
    mount("u1", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
    const d = dialog();
    expect(d.getAttribute("aria-modal")).toBe("true");
    const heading = document.getElementById(d.getAttribute("aria-labelledby")!);
    expect(heading?.textContent).toBe(START_HERE_COPY.body);
    // START-HERE-ONE-TAP-1: the READY state is open straight away (one tap launches); the picker
    // is one "Change…" tap behind it.
    expect(screen.getByTestId("start-here-focus-one-tap-maths")).toBeInTheDocument();
    expect(screen.queryByTestId("start-here-focus-subject-maths")).toBeNull();
    fireEvent.click(screen.getByTestId("start-here-focus-change"));
    expect(screen.getByTestId("start-here-focus-subject-maths")).toBeInTheDocument();
    // Passive effects can land after the async eligibility read settles: wait for the events.
    await waitFor(() => expect(calls("start_here_shown")).toContainEqual(["start_here_shown", { surface: "practice_hub_focus" }]));
    // The inline card's own event and param are unchanged.
    await waitFor(() => expect(calls("start_here_shown")).toContainEqual(["start_here_shown", { surface: "practice_hub" }]));
  });

  it("★★ focus off (the default): byte-unchanged — no overlay, no focus storage read, no focus event", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    try {
      mount();
      await waitFor(() => expect(card()).not.toBeNull());
      expect(focusEl()).toBeNull();
      const keys = getItem.mock.calls.map((c) => String(c[0]));
      expect(keys.some((k) => k.startsWith(START_HERE_FOCUS_NOT_NOW_PREFIX) || k === START_HERE_FOCUS_CLOSED_KEY)).toBe(false);
      await waitFor(() => expect(calls("start_here_shown")).toEqual([["start_here_shown", { surface: "practice_hub" }]]));
    } finally {
      getItem.mockRestore();
    }
  });

  it("★★ an existing student gets no focused surface (and no focus storage read); a signed-out visitor neither", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    try {
      localRows.mockReturnValue([{ id: "r1" }]);
      mount("u1", { focus: true });
      await new Promise((r) => setTimeout(r, 0));
      expect(focusEl()).toBeNull();
      expect(card()).toBeNull();
      cleanup();
      const { container } = mount(null, { focus: true });
      await new Promise((r) => setTimeout(r, 0));
      expect(container.innerHTML).toBe("");
      expect(focusEl()).toBeNull();
      const keys = getItem.mock.calls.map((c) => String(c[0]));
      expect(keys.some((k) => k.startsWith(START_HERE_FOCUS_NOT_NOW_PREFIX) || k === START_HERE_FOCUS_CLOSED_KEY)).toBe(false);
      expect(calls("start_here_shown")).toHaveLength(0);
    } finally {
      getItem.mockRestore();
    }
  });

  it("★★ something in progress on the page (inProgress): no focused surface; the inline card still shows", async () => {
    mount("u1", { focus: true, inProgress: true });
    await waitFor(() => expect(card()).not.toBeNull());
    expect(focusEl()).toBeNull();
  });

  it("★★ Esc = Not now: closes for this visit, fires start_here_dismissed (focus surface), the inline card stays", async () => {
    mount("u1", { focus: true });
    await trapActive();
    fireEvent.keyDown(dialog(), { key: "Escape" });
    expect(focusEl()).toBeNull();
    expect(card()).not.toBeNull(); // the inline card remains
    expect(calls("start_here_dismissed")).toEqual([["start_here_dismissed", { surface: "practice_hub_focus" }]]);
    expect(count()).toBe("1");
    // The visit memory is a flag, never the account id (CodeQL clear-text storage).
    expect(window.sessionStorage.getItem(START_HERE_FOCUS_CLOSED_KEY)).toBe("1");
    // The same visit, another page: the focused surface stays closed, the inline card shows.
    cleanup();
    mount("u1", { focus: true });
    await waitFor(() => expect(card()).not.toBeNull());
    expect(focusEl()).toBeNull();
  });

  it("★★ next visit it returns ONCE more; after a second Not now only the inline card shows", async () => {
    mount("u1", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-focus-not-now"));
    expect(count()).toBe("1");
    // Visit 2 (a new session): offered once more.
    cleanup();
    window.sessionStorage.clear();
    mount("u1", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-focus-close")); // the ✕ is also Not now
    expect(count()).toBe("2");
    // Visit 3: only the inline card.
    cleanup();
    window.sessionStorage.clear();
    mount("u1", { focus: true });
    await waitFor(() => expect(card()).not.toBeNull());
    expect(focusEl()).toBeNull();
    // Per uid: another account on this device still gets its own offer.
    cleanup();
    window.sessionStorage.clear();
    mount("u2", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
  });

  it("★★ the chapter picker nested in the focused surface: it takes focus, Tab stays in it, Esc closes ONLY the picker", async () => {
    mount("u1", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-focus-change")); // START-HERE-ONE-TAP-1: picker behind "Change…"
    fireEvent.click(screen.getByTestId("start-here-focus-subject-science"));
    const select = await openChapterPicker("start-here-focus");
    const picker = screen.getByTestId("start-here-focus-chapter-picker");
    expect(picker.className).toContain("lt-shc-picker-top"); // stacked above the focused surface
    expect(document.activeElement).toBe(select); // the topmost layer has focus
    fireEvent.keyDown(select, { key: "Tab" });
    expect(document.activeElement).toBe(select); // the focused surface's trap did not pull it back
    fireEvent.keyDown(select, { key: "Escape" });
    expect(screen.queryByTestId("start-here-focus-chapter-picker")).toBeNull(); // picker closed
    expect(focusEl()).not.toBeNull(); // ...and the focused surface is still open
    expect(calls("start_here_dismissed")).toHaveLength(0);
    expect(count()).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("start-here-focus-chapter"));
    // A second Esc, now inside the focused surface, is its Not now.
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(focusEl()).toBeNull();
    expect(count()).toBe("1");
  });

  it("★★ desktop backdrop press, focus on <body>: Esc still closes the dialog and records the focus Not now", async () => {
    setMatchMediaMatches(true);
    mount("u1", { focus: true });
    await trapActive();
    // The backdrop press is prevented (it would move focus to <body>)...
    expect(fireEvent.mouseDown(focusEl()!)).toBe(false);
    // ...and even if focus does reach <body>, the trap and Esc still hold.
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(dialog().contains(document.activeElement)).toBe(true);
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(focusEl()).toBeNull();
    expect(count()).toBe("1");
    expect(calls("start_here_dismissed")).toEqual([["start_here_dismissed", { surface: "practice_hub_focus" }]]);
    expect(card()).not.toBeNull(); // the inline card stays (it was NOT dismissed)
  });

  it("★★ focus moved to an element outside (the inline card behind) is pulled back into the dialog", async () => {
    mount("u1", { focus: true });
    await trapActive();
    const behind = screen.getByTestId("start-here-not-now"); // the inline card's own Not now
    behind.focus();
    // The pull-back is synchronous (the capture-phase focusin handler refocuses in place).
    expect(document.activeElement).not.toBe(behind);
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it("★ unmount removes the document listeners (Esc and focus are free again)", async () => {
    const remove = vi.spyOn(document, "removeEventListener");
    try {
      mount("u1", { focus: true });
      await waitFor(() => expect(focusEl()).not.toBeNull());
      fireEvent.click(screen.getByTestId("start-here-focus-not-now"));
      expect(focusEl()).toBeNull();
      const removed = remove.mock.calls.filter((c) => c[2] === true).map((c) => c[0]);
      expect(removed).toEqual(expect.arrayContaining(["keydown", "focusin"]));
      const behind = screen.getByTestId("start-here-not-now");
      behind.focus();
      expect(document.activeElement).toBe(behind); // nothing pulls focus any more
      fireEvent.keyDown(document.body, { key: "Escape" });
      expect(calls("start_here_dismissed")).toHaveLength(1);
      expect(count()).toBe("1");
    } finally {
      remove.mockRestore();
    }
  });

  it("★★ focus is trapped: it starts inside the dialog and Tab / Shift+Tab wrap at the ends", async () => {
    mount("u1", { focus: true });
    await trapActive();
    const d = dialog();
    expect(d.contains(document.activeElement)).toBe(true);
    const items = Array.from(d.querySelectorAll<HTMLElement>("button:not([disabled]), select"));
    const first = items[0];
    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(d, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(d, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("full screen under 1024 px, a centred overlay at desktop width", async () => {
    setMatchMediaMatches(false);
    mount("u1", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
    expect(focusEl()!.getAttribute("data-layout")).toBe("full");
    expect(focusEl()!.className).toContain("lt-shcf--full");
    cleanup();
    window.sessionStorage.clear();
    window.localStorage.clear();
    setMatchMediaMatches(true);
    mount("u1", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
    expect(focusEl()!.getAttribute("data-layout")).toBe("overlay");
    expect(focusEl()!.className).toContain("lt-shcf--overlay");
  });

  it("Start from the focused surface opens the same five-question set (bank fetched on Start only)", async () => {
    mount("u1", { focus: true });
    await waitFor(() => expect(focusEl()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-focus-change")); // START-HERE-ONE-TAP-1: picker behind "Change…"
    fireEvent.click(screen.getByTestId("start-here-focus-subject-science"));
    expect(bank.pickStartHereSet).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("start-here-focus-go"));
    await waitFor(() => expect(location).toMatch(/^\/practice\/10\/Science\?/));
    expect(new URLSearchParams(location.split("?")[1]).get("src")).toBe("start_here");
    expect(bank.startHereAvailability).not.toHaveBeenCalled();
  });
});

describe("FOLLOWUPS-2 F1 [FU-SH-TAP-44] · chips are 44px tap targets", () => {
  // SHW-2 (Oct 2026): the chips became segmented-control options (.lt-shc-seg-opt); the 44px floor stays.
  const chipRule = (css: string): string => /\.lt-shc \.lt-shc-seg-opt \{[^}]*\}/.exec(css)?.[0] ?? "";

  it("★ the injected .lt-shc-seg-opt rule has min-height 44px with flex centring (inline card)", async () => {
    cloudHas.mockResolvedValue(false);
    mount();
    await waitFor(() => expect(card()).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-start"));
    fireEvent.click(screen.getByTestId("start-here-change")); // START-HERE-ONE-TAP-1: picker behind "Change…"
    const chip = screen.getByTestId("start-here-subject-maths");
    expect(chip.matches(".lt-shc .lt-shc-seg-opt")).toBe(true);
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent ?? "").join("\n");
    const rule = chipRule(css);
    expect(rule).toMatch(/min-height: 44px;/);
    expect(rule).toMatch(/display: flex;/);
    expect(rule).toMatch(/align-items: center;/);
    expect(rule).toMatch(/justify-content: center;/);
  });

  it("★ the overlay (lt-shcf) chips are matched by the same 44px rule", async () => {
    window.localStorage.clear();
    cloudHas.mockResolvedValue(false);
    mount("u1", { focus: true });
    await waitFor(() => expect(screen.queryByTestId("start-here-focus")).not.toBeNull());
    fireEvent.click(screen.getByTestId("start-here-focus-change")); // START-HERE-ONE-TAP-1: picker behind "Change…"
    const chip = screen.getByTestId("start-here-focus-subject-maths");
    expect(chip.closest(".lt-shcf")).not.toBeNull();
    expect(chip.matches(".lt-shc .lt-shc-seg-opt")).toBe(true);
    const css = screen.getByTestId("start-here-focus").querySelector("style")!.textContent ?? "";
    expect(chipRule(css)).toMatch(/min-height: 44px;/);
  });
});

describe("FOLLOWUPS-2 F2 [FU-SH-SHOWN-DEDUPE] · start_here_shown at most once per tab per surface", () => {
  const treeOn = (surface: "practice_hub" | "home", focus = false) => (
    <MemoryRouter initialEntries={["/x"]}>
      <Routes>
        <Route path="*" element={<StartHereCard uid="u1" surface={surface} returnTo="/x" focus={focus} />} />
      </Routes>
    </MemoryRouter>
  );

  beforeEach(() => {
    window.localStorage.clear();
    cloudHas.mockResolvedValue(false);
  });

  it("★★ two mounts on the same surface -> ONE start_here_shown; the value stored is the constant 1, never the uid", async () => {
    render(treeOn("practice_hub"));
    await waitFor(() => expect(card()).not.toBeNull());
    await waitFor(() => expect(calls("start_here_shown")).toHaveLength(1));
    cleanup();
    render(treeOn("practice_hub"));
    await waitFor(() => expect(card()).not.toBeNull());
    await new Promise((r) => setTimeout(r, 0));
    expect(calls("start_here_shown")).toEqual([["start_here_shown", { surface: "practice_hub" }]]);
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i)!;
      expect(k).not.toContain("u1");
      if (k.startsWith("lazytopper.startHereShown.")) expect(window.sessionStorage.getItem(k)).toBe("1");
    }
  });

  it("★ a different surface gets its own one; the focus surface likewise dedupes on remount", async () => {
    render(treeOn("practice_hub", true));
    await waitFor(() => expect(calls("start_here_shown")).toHaveLength(2));
    cleanup();
    render(treeOn("practice_hub", true));
    await waitFor(() => expect(card()).not.toBeNull());
    await new Promise((r) => setTimeout(r, 0));
    expect(calls("start_here_shown")).toHaveLength(2);
    cleanup();
    render(treeOn("home"));
    await waitFor(() => expect(calls("start_here_shown")).toHaveLength(3));
    expect(calls("start_here_shown")).toContainEqual(["start_here_shown", { surface: "home" }]);
    expect(calls("start_here_shown")).toContainEqual(["start_here_shown", { surface: "practice_hub_focus" }]);
  });

  it("★ storage throws -> fail open: still fires once per mount", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      const { rerender } = render(treeOn("practice_hub"));
      await waitFor(() => expect(calls("start_here_shown")).toHaveLength(1));
      rerender(treeOn("practice_hub"));
      await new Promise((r) => setTimeout(r, 0));
      expect(calls("start_here_shown")).toHaveLength(1);
      cleanup();
      render(treeOn("practice_hub"));
      await waitFor(() => expect(calls("start_here_shown")).toHaveLength(2));
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});
