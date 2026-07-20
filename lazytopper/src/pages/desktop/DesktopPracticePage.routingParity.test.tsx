// DesktopPracticePage — ROUTING PARITY across the Practice Hub redesign.
//
// The hub redesign was presentation + flow only, against a frozen interlink
// contract: 7 outbound route families, 22 inbound callers. The whole risk is
// that a re-render quietly changes an emitted URL.
//
// Every expected string below was CAPTURED FROM TRUNK (base/approved-thru-437,
// 0b22ee7) by driving the pre-redesign hub with this same matrix, then asserted
// unchanged against the redesigned hub. They are not hand-written guesses — a
// diff of the two captures was empty.
//
// This pins the contract going forward: any change to a builder, to the
// source/returnTo params, or to the scope→param mapping fails here first.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" }, loading: false }),
}));
// One real-shaped entry so the MI card reaches its has-data state and exposes
// the weak-area drill CTA. topic "real-numbers" matches the desktop catalogue.
vi.mock("../../services/mistakeLogService", () => ({
  getMistakeLogs: async () => [
    {
      id: "m1",
      timestamp: "2026-07-18T10:00:00.000Z",
      questionText: "q",
      topic: "real-numbers",
      subject: "Maths",
      totalMarks: 5,
      marksLost: 3,
      mistakeCounts: { conceptual: 1, calculation: 2, silly: 0, presentation: 0 },
      stepDetails: [{ stepNumber: 1, mistakeType: "calculation", marksDeducted: 2 }],
    },
  ],
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage from "./DesktopPracticePage";

afterEach(cleanup);

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe" data-url={`${loc.pathname}${loc.search}`} />;
}

async function renderHub(entry: string) {
  setMatchMediaMatches(true);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

/** Fire a CTA (button or link) and return the URL it navigated to. */
function fireAndCapture(name: RegExp): string {
  let el: HTMLElement;
  try {
    el = screen.getByRole("button", { name });
  } catch {
    el = screen.getByRole("link", { name });
  }
  fireEvent.click(el);
  return screen.getByTestId("probe").getAttribute("data-url") ?? "";
}

const CTA = {
  quick: /start quick practice/i,
  worksheet: /open worksheet builder/i,
  hpq: /open highly probable/i,
  fulltest: /open full test/i,
  drill: /run targeted drill/i,
};

const SINGLE = "/practice-hub?scope=topic&topic=real-numbers";
const SINGLE_RT = "%2Fpractice-hub%3Fscope%3Dtopic%26topic%3Dreal-numbers";
const MULTI = "/practice-hub?scope=multi-topic&topics=real-numbers,polynomials";
const MULTI_RT = "%2Fpractice-hub%3Fscope%3Dmulti-topic%26topics%3Dreal-numbers%2Cpolynomials";
const FULL = "/practice-hub?scope=full-subject";
const FULL_RT = "%2Fpractice-hub%3Fscope%3Dfull-subject";

describe("Practice hub routing parity (redesign — frozen interlink contract)", () => {
  it("single-topic scope emits the trunk URLs for all five CTAs", async () => {
    await renderHub(SINGLE);
    expect(fireAndCapture(CTA.quick)).toBe(
      `/practice/10/Maths?topic=real-numbers&source=practice&returnTo=${SINGLE_RT}`,
    );
    cleanup();

    await renderHub(SINGLE);
    expect(fireAndCapture(CTA.worksheet)).toBe(
      `/practice/worksheets?scope=topic&subject=Maths&topic=real-numbers&source=practice&returnTo=${SINGLE_RT}`,
    );
    cleanup();

    await renderHub(SINGLE);
    expect(fireAndCapture(CTA.hpq)).toBe(
      `/highly-probable/10/Maths?source=practice&returnTo=${SINGLE_RT}&topic=real-numbers`,
    );
    cleanup();

    await renderHub(SINGLE);
    expect(fireAndCapture(CTA.fulltest)).toBe(
      `/full-mock/10/Maths?source=practice&returnTo=${SINGLE_RT}`,
    );
    cleanup();

    await renderHub(SINGLE);
    expect(fireAndCapture(CTA.drill)).toBe(
      `/practice/10/Maths?topic=real-numbers&timed=1&source=practice&returnTo=${SINGLE_RT}`,
    );
  }, 30000);

  it("multi-topic scope still emits the full topic SET (topics=), never a collapse", async () => {
    await renderHub(MULTI);
    expect(fireAndCapture(CTA.quick)).toBe(
      `/practice/10/Maths?topics=real-numbers%2Cpolynomials&source=practice&returnTo=${MULTI_RT}`,
    );
    cleanup();

    await renderHub(MULTI);
    expect(fireAndCapture(CTA.worksheet)).toBe(
      `/practice/worksheets?scope=multi-topic&subject=Maths&topics=real-numbers%2Cpolynomials&source=practice&returnTo=${MULTI_RT}`,
    );
    cleanup();

    await renderHub(MULTI);
    expect(fireAndCapture(CTA.hpq)).toBe(
      `/highly-probable/10/Maths?source=practice&returnTo=${MULTI_RT}&topics=real-numbers%2Cpolynomials`,
    );
  }, 30000);

  it("full-subject scope emits the subject-level URLs with no topic params", async () => {
    await renderHub(FULL);
    expect(fireAndCapture(CTA.quick)).toBe(
      `/practice/10/Maths?source=practice&returnTo=${FULL_RT}`,
    );
    cleanup();

    await renderHub(FULL);
    expect(fireAndCapture(CTA.worksheet)).toBe(
      `/practice/worksheets?scope=full-subject&subject=Maths&source=practice&returnTo=${FULL_RT}`,
    );
    cleanup();

    await renderHub(FULL);
    expect(fireAndCapture(CTA.fulltest)).toBe(
      `/full-mock/10/Maths?source=practice&returnTo=${FULL_RT}`,
    );
  }, 30000);

  it("Science scope routes to the Science surfaces", async () => {
    const entry = "/practice-hub?subject=Science&scope=topic&topic=life-processes";
    const rt = "%2Fpractice-hub%3Fsubject%3DScience%26scope%3Dtopic%26topic%3Dlife-processes";
    await renderHub(entry);
    expect(fireAndCapture(CTA.quick)).toBe(
      `/practice/10/Science?topic=life-processes&source=practice&returnTo=${rt}`,
    );
    cleanup();

    await renderHub(entry);
    expect(fireAndCapture(CTA.fulltest)).toBe(
      `/full-mock/10/Science?source=practice&returnTo=${rt}`,
    );
  }, 30000);

  it("Topic-Hub focus context still rides through on the Quick Practice URL", async () => {
    const entry =
      "/practice-hub?scope=topic&topic=real-numbers&source=topicHub&focus=euclid&subtopicHint=hcf";
    const rt =
      "%2Fpractice-hub%3Fscope%3Dtopic%26topic%3Dreal-numbers%26source%3DtopicHub%26focus%3Deuclid%26subtopicHint%3Dhcf";
    await renderHub(entry);
    expect(fireAndCapture(CTA.quick)).toBe(
      `/practice/10/Maths?topic=real-numbers&subtopicHint=hcf&focus=euclid&source=practice&returnTo=${rt}`,
    );
  }, 30000);

  // ── The ONE deliberate relaxation ──────────────────────────────────────
  // The retired "Timed Drill" card folded into Quick Practice as a toggle.
  // Trunk's separate card carried `timed=1` but DROPPED multi-topic and focus;
  // the toggle instead adds `timed=1` to the same scoped builder, so the
  // learner's scope survives. Same builder, one additive frozen param.
  describe("timer toggle", () => {
    const timerBox = () => screen.getByRole("checkbox", { name: /add a timer/i });

    it("is OFF by default — the Quick Practice URL is byte-identical to trunk", async () => {
      await renderHub(SINGLE);
      expect(timerBox()).not.toBeChecked();
      expect(fireAndCapture(CTA.quick)).toBe(
        `/practice/10/Maths?topic=real-numbers&source=practice&returnTo=${SINGLE_RT}`,
      );
    }, 30000);

    it("ON adds timed=1 and PRESERVES a multi-topic set (trunk's card dropped it)", async () => {
      await renderHub(MULTI);
      fireEvent.click(timerBox());
      expect(fireAndCapture(CTA.quick)).toBe(
        `/practice/10/Maths?topics=real-numbers%2Cpolynomials&timed=1&source=practice&returnTo=${MULTI_RT}`,
      );
    }, 30000);

    it("ON preserves single-topic focus context too", async () => {
      const entry =
        "/practice-hub?scope=topic&topic=real-numbers&source=topicHub&focus=euclid&subtopicHint=hcf";
      const rt =
        "%2Fpractice-hub%3Fscope%3Dtopic%26topic%3Dreal-numbers%26source%3DtopicHub%26focus%3Deuclid%26subtopicHint%3Dhcf";
      await renderHub(entry);
      fireEvent.click(timerBox());
      expect(fireAndCapture(CTA.quick)).toBe(
        `/practice/10/Maths?topic=real-numbers&timed=1&subtopicHint=hcf&focus=euclid&source=practice&returnTo=${rt}`,
      );
    }, 30000);
  });
});

// ── The §2 CUT list, pinned ───────────────────────────────────────────────
// These sections were removed from the hub UI (their ROUTES are untouched and
// still reachable from their real homes — Chapter Test from Topic Hub, the
// blueprint from FullMockPage). Pinning them stops the developer language and
// the retired panels from creeping back in a later edit.
describe("Practice hub redesign — cut surfaces stay cut", () => {
  it("renders the 2-step flow and none of the retired sections", async () => {
    await renderHub(SINGLE);

    // Kept: the two steps and all four mode cards.
    expect(screen.getByRole("heading", { name: "What to work on" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to practise" })).toBeInTheDocument();
    for (const name of ["Quick Practice", "Worksheet", "Predicted (HPQs)", "Full Test"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }

    // Cut: blueprint preview, more-options, quick links, topic reference, and
    // the retired Chapter-Test / Timed-Drill cards.
    for (const gone of [
      /paper blueprint/i,
      /more practice options/i,
      /quick links/i,
      /topic reference/i,
      /chapter test/i,
      /timed drill/i,
    ]) {
      expect(screen.queryByRole("heading", { name: gone })).toBeNull();
    }

    // Cut: every scrap of developer language the spec called out.
    for (const phrase of [
      /intent-first/i,
      /the desktop bridge/i,
      /nothing generates a new paper/i,
      /Reference blueprint, not a learner-specific paper/i,
      /starter set/i,
    ]) {
      expect(screen.queryByText(phrase)).toBeNull();
    }
  }, 30000);
});
