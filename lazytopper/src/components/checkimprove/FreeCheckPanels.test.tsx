/**
 * FREE-CHECK-1b — the free-check panels: exact copy, the ONE sign-in target (OR-8), and
 * a trial offer that starts nothing on its own (R9).
 *
 * FIX-2 (OR-18): clicking ANY of those sign-in links writes this tab's sign-in marker,
 * holding the waiting result's gradedAt.
 *
 * Mutations this file turns RED: B4 (a sign-in link pointed at /sign-up); B10 (OR-14:
 * `unavailable` mapped back to the App Check line).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const track = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => track(...a) };
});

import {
  FreeCheckRefusalPanel,
  FreeCheckSavePrompt,
  FreeCheckSavingPanel,
  FreeCheckTrialOffer,
  FreeCheckUsedPanel,
} from "./FreeCheckPanels";
import {
  FREE_CHECK_REFUSAL_REASONS,
  FREE_CHECK_SIGNIN_INTENT_KEY,
  __setFreeCheckClockForTests,
  recordFreeCheckSuccess,
  type PendingSingleFreeCheck,
} from "../../services/freeCheckClient";
import { MONTHLY_INLINE } from "../../config/pricing";

beforeEach(() => {
  track.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  __setFreeCheckClockForTests(null);
});

const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

/**
 * Every link in the panel EXCEPT the one plans link (FRICTION-FIX-1 · F4 added "See plans →"
 * to /pricing in the 'used' panel). Only that exact href is set aside, so any other link —
 * a second sign-in target, a /sign-up — still lands in the list and still fails OR-8.
 */
function signInHrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a"))
    .map((a) => a.getAttribute("href") ?? "")
    .filter((h) => h !== "/pricing");
}

describe("OR-8 — every free-check sign-in prompt links to /login?redirect=%2Fcheck-improve", () => {
  const prompts: Array<[string, React.ReactElement]> = [
    ["the post-result save prompt", <FreeCheckSavePrompt />],
    ["the inline save prompt", <FreeCheckSavePrompt inline />],
    ["the 'used' line", <FreeCheckUsedPanel />],
    ...FREE_CHECK_REFUSAL_REASONS.map(
      (r) => [`the ${r} refusal`, <FreeCheckRefusalPanel reason={r} />] as [string, React.ReactElement],
    ),
  ];
  it.each(prompts)("%s", (_label, ui) => {
    const { container } = mount(ui);
    const hrefs = signInHrefs(container);
    expect(hrefs).toEqual(["/login?redirect=%2Fcheck-improve"]);
    expect(hrefs.some((h) => h.startsWith("/sign-up"))).toBe(false);
  });
});

describe("OR-18 — every free-check sign-in link writes the sign-in marker on click", () => {
  const GRADED_AT = 1_700_000_000_000;
  const WAITING = {
    v: 1,
    kind: "single",
    gradedAt: GRADED_AT,
    subject: "Maths",
    topicName: "Real Numbers",
    topicSlug: "real-numbers",
    topicTouched: false,
    question: "Q",
    marksSource: null,
    detectionOverride: null,
    graded: {
      ok: true,
      totalMarks: 3,
      marksAwarded: 1,
      percentage: 33,
      annotatedSteps: [],
      mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "",
    },
  } as PendingSingleFreeCheck;
  const links: Array<[string, React.ReactElement]> = [
    ["the post-result save prompt", <FreeCheckSavePrompt />],
    ["the inline save prompt", <FreeCheckSavePrompt inline />],
    ["the 'used' line", <FreeCheckUsedPanel />],
    ...FREE_CHECK_REFUSAL_REASONS.map(
      (r) => [`the ${r} refusal`, <FreeCheckRefusalPanel reason={r} />] as [string, React.ReactElement],
    ),
  ];
  it.each(links)("%s → sessionStorage holds the waiting result's gradedAt", (_label, ui) => {
    __setFreeCheckClockForTests(() => GRADED_AT + 60 * 1000);
    recordFreeCheckSuccess(WAITING);
    const { container } = mount(ui);
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull(); // rendering writes nothing
    const link = container.querySelector("a") as HTMLAnchorElement;
    fireEvent.click(link);
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(GRADED_AT));
  });
});

describe("the copy is the spec's, verbatim", () => {
  it("after a free result", () => {
    const { container } = mount(<FreeCheckSavePrompt />);
    expect(container.textContent).toContain("Sign up free to save this and build your mistake pattern.");
  });

  it("R1 'used' — and it counts free_check_used_block with the name only", () => {
    const { container } = mount(<FreeCheckUsedPanel />);
    // SIGNUP-NUDGE-1 — the S1 copy (the full copy set is pinned in the signupNudge suite).
    expect(container.textContent).toContain("Your free check is done ✅");
    expect(container.textContent).toContain("Sign up in one tap to keep this result and keep checking answers.");
    expect(track.mock.calls).toEqual([["free_check_used_block"]]);
  });

  it.each([
    ["ceiling_reached", "Today's free checks are all used up."],
    ["budget", "Today's free checks are all used up."],
    ["app_check_missing", "We couldn't start a free check in this browser."],
    ["app_check_invalid", "We couldn't start a free check in this browser."],
    ["unavailable", "Free checks aren't available right now."],
  ] as const)("refusal %s → its line", (reason, head) => {
    const { container } = mount(<FreeCheckRefusalPanel reason={reason} />);
    expect(container.textContent).toContain(head);
  });

  describe("OR-14 — `unavailable` has its own line; the App Check line is for app_check_* only", () => {
    const BROWSER = "We couldn't start a free check in this browser. Sign up free and your 7-day trial covers it.";
    const UNAVAILABLE = "Free checks aren't available right now. Sign up free and your 7-day trial covers it.";

    it("unavailable → 'Free checks aren't available right now…', linking to /login?redirect=%2Fcheck-improve", () => {
      const { container } = mount(<FreeCheckRefusalPanel reason="unavailable" />);
      expect(container.querySelector("p")?.textContent).toBe(UNAVAILABLE);
      expect(container.textContent).not.toContain("in this browser");
      expect(signInHrefs(container)).toEqual(["/login?redirect=%2Fcheck-improve"]);
    });

    it.each(["app_check_missing", "app_check_invalid"] as const)(
      "%s → the App Check line, linking to /login?redirect=%2Fcheck-improve",
      (reason) => {
        const { container } = mount(<FreeCheckRefusalPanel reason={reason} />);
        expect(container.querySelector("p")?.textContent).toBe(BROWSER);
        expect(signInHrefs(container)).toEqual(["/login?redirect=%2Fcheck-improve"]);
      },
    );
  });

  it("saving never claims more than it knows", () => {
    const { container } = mount(<FreeCheckSavingPanel />);
    expect(within(container).getByRole("status").querySelector("p")?.textContent).toBe("Saving your answer…");
  });
});

describe("R9 — the trial offer starts NOTHING until tapped", () => {
  function renderOffer() {
    const onStartTrial = vi.fn();
    const onMaybeLater = vi.fn();
    const r = mount(
      <FreeCheckTrialOffer endsOn="2 October 2026" onStartTrial={onStartTrial} onMaybeLater={onMaybeLater} />,
    );
    return { ...r, onStartTrial, onMaybeLater };
  }

  it("renders the offer copy, with OR-7's line and no '<3 − n>' count line", () => {
    const { container } = renderOffer();
    const text = container.textContent ?? "";
    expect(text).toContain("Your answer is saved.");
    expect(text).toContain(
      `Try Premium free for 7 days — no card needed. Ends 2 October 2026. After that, keep free Basic or upgrade to Premium at ${MONTHLY_INLINE}.`,
    );
    expect(text).not.toMatch(/upgrade anytime/i);
    expect(text).toContain("Every answer you check helps build your mistake pattern.");
    expect(text).not.toMatch(/more checks? and your mistake pattern appears/i);
    expect(text).not.toMatch(/\d+\s*more checks?/i);
  });

  it("mounting it calls nothing", () => {
    const { onStartTrial, onMaybeLater } = renderOffer();
    expect(onStartTrial).not.toHaveBeenCalled();
    expect(onMaybeLater).not.toHaveBeenCalled();
  });

  it("'Start my free trial' → start, once; 'Maybe later' → later, and never a start", () => {
    const { container, onStartTrial, onMaybeLater } = renderOffer();
    fireEvent.click(within(container).getByRole("button", { name: "Maybe later" }));
    expect(onMaybeLater).toHaveBeenCalledTimes(1);
    expect(onStartTrial).not.toHaveBeenCalled();
    fireEvent.click(within(container).getByRole("button", { name: "Start my free trial" }));
    expect(onStartTrial).toHaveBeenCalledTimes(1);
  });
});
