/**
 * MOMENTS-1 — the moments themselves: the owner's exact lines per moment, Ziggy-then-Byte in ONE
 * spot, reduced motion = the final frame, the guide-arm-only audience (ABSENT in the control arm),
 * the "Hide mascots" button on every bubble (hidden everywhere + snackbar + Undo), the
 * guide_moment_shown event (suppressed under the admin preview), the M6 title pin, the M9
 * shared-link rule and the M10 corner peek (only after a matching check).
 *
 * The page wiring (Quick Practice, Check & Improve, the solutions page) is pinned by each page's own
 * MOMENTS-1 test; this file pins the shared pieces.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../../test/setup";

const { onboarding, armAssigned } = vi.hoisted(() => ({ onboarding: vi.fn(), armAssigned: vi.fn() }));
vi.mock("../../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding, trackGuidePublicArmAssigned: armAssigned };
});
vi.mock("../../../services/firebaseClient", () => ({ authClient: null }));

import {
  GuideMomentSlot,
  SolutionsMoment,
  UNREAD_ALL_TITLE,
  __resetSolutionMatchedForTests,
  cameFromSharedLink,
  firstSessionAudience,
  inGuideArm,
  isUnreadAllPending,
  noteSolutionMatched,
  usePublicMomentAudience,
} from "./moments";
import { BEAT_MS, MOMENT_COPY } from "./momentsChunk";
import { MASCOTS_TOAST_COPY, __removeMascotsToastForTests } from "./mascotsToast";
import { MASCOTS_HIDDEN_KEY, __resetMascotsForTests, mascotsHidden } from "../mascotsMute";
import { __setGuideAbForTests } from "../guideVariant";
import { GUIDE_PUBLIC_ARM_KEY, __resetPublicArmForTests } from "../public/publicPeekModel";
import { allPendingMessage } from "../../results/scorecardVariants";
import { VISIT_SOURCE_KEY } from "../../../analytics/visitSource";
import type { GuideMomentProps } from "./momentsChunk";

const REDUCED = "(prefers-reduced-motion: reduce)";
const motion = (reduced: boolean) => setMatchMediaMatches((q) => (q === REDUCED ? reduced : false));
const momentCalls = () => onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown");
const line = () => screen.getByTestId("guide-moment-line").textContent;

function Slot(props: GuideMomentProps & { uid: string | null; first?: boolean }) {
  const { uid, first, ...rest } = props;
  const show = first ? firstSessionAudience(uid, "none") : inGuideArm(uid);
  return (
    <MemoryRouter>
      <GuideMomentSlot show={show} {...rest} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetPublicArmForTests();
  __resetSolutionMatchedForTests();
  onboarding.mockReset();
  armAssigned.mockReset();
  motion(false);
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __removeMascotsToastForTests();
  __setGuideAbForTests(null);
});

describe("MOMENTS-1 · every moment's exact line, guide arm only", () => {
  const ONE_BEAT: Array<[GuideMomentProps, string, string, string]> = [
    [{ moment: "m3", step: "byte" }, "byte", "point", "Tap the answer you think is right. No typing."],
    [{ moment: "m3", step: "ziggy" }, "ziggy", "excited", "Yes! 1 of 5. Next one."],
    [{ moment: "m4", step: "type" }, "byte", "explain", "Write every step. CBSE gives marks for each one."],
    [{ moment: "m4", step: "upload" }, "byte", "explain", "Flat page, good light, whole answer in the photo."],
    [{ moment: "m8", step: "safe" }, "ziggy", "sad", "Oops, the connection dropped. Your answer is safe."],
    [{ moment: "m8", step: "plain" }, "ziggy", "sad", "Oops, the connection dropped."],
    [{ moment: "m9", step: "shared" }, "byte", "hello", "Someone sent you this! Check one answer free. No sign-up."],
  ];

  for (const [props, kind, pose, text] of ONE_BEAT) {
    it(`${props.moment}/${props.step}: ${kind} (${pose}) says the owner's line; ABSENT in the control arm`, async () => {
      render(<Slot uid="u1" {...props} />);
      const m = await screen.findByTestId(`guide-moment-${props.moment}`);
      expect(m.getAttribute("data-kind")).toBe(kind);
      expect(m.getAttribute("data-pose")).toBe(pose);
      expect(line()).toBe(text);
      expect(screen.getByTestId(`blob-${kind}`)).toBeTruthy();
      expect(screen.getByRole("button", { name: MASCOTS_TOAST_COPY.hide })).toBeTruthy();
      cleanup();

      __setGuideAbForTests(true, "control");
      render(<Slot uid="u1" {...props} />);
      await act(async () => {});
      expect(screen.queryByTestId(`guide-moment-${props.moment}`)).toBeNull();
      expect(screen.queryByText(text)).toBeNull();
    });
  }

  it("★★ signed out / split off → no signed-in moment at all", async () => {
    render(<Slot uid={null} moment="m8" step="safe" />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m8")).toBeNull();
    __setGuideAbForTests(false);
    expect(inGuideArm("u1")).toBe(false);
  });

  it("first-session audience: guide arm AND zero graded ('loading' / 'some' are not zero)", () => {
    expect(firstSessionAudience("u1", "none")).toBe(true);
    expect(firstSessionAudience("u1", "loading")).toBe(false);
    expect(firstSessionAudience("u1", "some")).toBe(false);
    __setGuideAbForTests(true, "control");
    expect(firstSessionAudience("u1", "none")).toBe(false);
  });
});

describe("MOMENTS-1 · two speakers, ONE spot: Ziggy first, then Byte replaces him", () => {
  const TWO: Array<[GuideMomentProps, string, string, string, string]> = [
    [{ moment: "m5", step: "written" }, "nervous", "Fingers crossed…", "think", "Marking it step by step, like a CBSE examiner."],
    [{ moment: "m5", step: "mcq" }, "nervous", "Fingers crossed…", "think", "Checking your answers, like a CBSE examiner."],
    [{ moment: "m6", step: "unread" }, "confused", "Hmm. Even I can't read that one.", "explain", "Flat page, good light, whole answer in the photo. Try again?"],
  ];
  for (const [props, zPose, zLine, bPose, bLine] of TWO) {
    it(`${props.moment}/${props.step}: Ziggy (${zPose}) → ~2 s → Byte (${bPose}); never both at once`, async () => {
      render(<Slot uid="u1" {...props} />);
      const m = await screen.findByTestId(`guide-moment-${props.moment}`);
      expect(m.getAttribute("data-kind")).toBe("ziggy");
      expect(m.getAttribute("data-pose")).toBe(zPose);
      expect(line()).toBe(zLine);
      expect(screen.queryByTestId("blob-byte")).toBeNull();
      await waitFor(() => expect(line()).toBe(bLine), { timeout: BEAT_MS + 1500 });
      expect(m.getAttribute("data-kind")).toBe("byte");
      expect(m.getAttribute("data-pose")).toBe(bPose);
      expect(screen.queryByTestId("blob-ziggy")).toBeNull();
      expect(screen.getAllByTestId(/^blob-/)).toHaveLength(1);
    });
  }

  it("★★ reduced motion: the FINAL frame at once (Byte's line), still — no swap", async () => {
    motion(true);
    render(<Slot uid="u1" moment="m5" step="written" />);
    await screen.findByTestId("guide-moment-m5");
    expect(line()).toBe(MOMENT_COPY.m5Byte);
    expect(screen.getByTestId("guide-moment-m5").getAttribute("data-kind")).toBe("byte");
    expect(screen.queryByText(MOMENT_COPY.m5Ziggy)).toBeNull();
    await act(async () => new Promise((r) => setTimeout(r, BEAT_MS + 200)));
    expect(line()).toBe(MOMENT_COPY.m5Byte);
  });
});

describe("MOMENTS-1 · guide_moment_shown", () => {
  it("once per moment mount, { moment } only; a step change (M3's swap) is the same moment", async () => {
    const view = render(<Slot uid="u1" moment="m3" step="byte" />);
    await screen.findByTestId("guide-moment-m3");
    view.rerender(<Slot uid="u1" moment="m3" step="ziggy" />);
    await waitFor(() => expect(line()).toBe(MOMENT_COPY.m3Ziggy));
    expect(momentCalls()).toEqual([["guide_moment_shown", { moment: "m3" }]]);
  });
});

describe("MOMENTS-1 M11 · the written-answer nudge (the moment itself)", () => {
  it("★★ Byte (cheer), the owner's line, 'Check a written answer' runs the host's IN-PAGE action (no route); the tap sends guide_moment_click m11", async () => {
    const onCta = vi.fn();
    render(<Slot uid="u1" moment="m11" step="nudge" onCta={onCta} />);
    const m = await screen.findByTestId("guide-moment-m11");
    expect(m.getAttribute("data-pose")).toBe("cheer");
    expect(line()).toBe(
      "Nice! Now write one answer in your notebook, snap a photo, and I'll show where marks slip — step by step, the way a CBSE examiner marks it.",
    );
    const cta = screen.getByTestId("guide-moment-m11-cta");
    expect(cta.textContent).toBe("Check a written answer");
    expect(cta.tagName).toBe("BUTTON");
    expect(cta.getAttribute("href")).toBeNull();
    expect(document.querySelector('a[href="/check-improve"]')).toBeNull();
    fireEvent.click(cta);
    expect(onCta).toHaveBeenCalledTimes(1);
    expect(onboarding.mock.calls.filter((c) => c[0] === "guide_moment_click")).toEqual([["guide_moment_click", { moment: "m11" }]]);
    expect(momentCalls()).toEqual([["guide_moment_shown", { moment: "m11" }]]);
  });

  it("★★ GUIDE-SCORE-2: no host action → no button at all (never an off-page /check-improve link)", async () => {
    render(<Slot uid="u1" moment="m11" step="nudge" />);
    await screen.findByTestId("guide-moment-m11");
    expect(screen.queryByTestId("guide-moment-m11-cta")).toBeNull();
    expect(document.querySelector('a[href="/check-improve"]')).toBeNull();
  });
});

describe("MOMENTS-1 PART 0 · Hide mascots from a moment's bubble", () => {
  it("★★ one tap: hidden on this device, the moment goes, the snackbar says so; Undo brings it back", async () => {
    render(<Slot uid="u1" moment="m4" step="type" />);
    fireEvent.click(await screen.findByTestId("mascots-hide"));
    expect(mascotsHidden()).toBe(true);
    expect(window.localStorage.getItem(MASCOTS_HIDDEN_KEY)).toBe("1");
    expect(screen.queryByTestId("guide-moment-m4")).toBeNull();
    const toast = screen.getByTestId("mascots-toast");
    expect(toast.textContent).toContain("Mascots hidden. Turn them back on in Me.");
    expect(onboarding.mock.calls.filter((c) => c[0] === "mascots_hidden")).toEqual([["mascots_hidden", {}]]);

    fireEvent.click(screen.getByTestId("mascots-undo"));
    expect(mascotsHidden()).toBe(false);
    expect(window.localStorage.getItem(MASCOTS_HIDDEN_KEY)).toBeNull();
    expect(screen.queryByTestId("mascots-toast")).toBeNull();
    expect(await screen.findByTestId("guide-moment-m4")).toBeTruthy();
    expect(onboarding.mock.calls.filter((c) => c[0] === "mascots_shown")).toEqual([["mascots_shown", {}]]);
  });

  it("hidden → no moment renders anywhere (and the arm is unchanged)", async () => {
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    render(<Slot uid="u1" moment="m8" step="safe" />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m8")).toBeNull();
    expect(inGuideArm("u1")).toBe(true);
  });
});

describe("MOMENTS-1 M6 · the unread title", () => {
  it("★ pinned equal to the scorecard's own all-pending title for an unreadable paper; other titles are not M6", () => {
    const unread = allPendingMessage({
      results: [{ qNumber: 1, couldNotRead: true }],
    } as unknown as Parameters<typeof allPendingMessage>[0]);
    expect(unread.title).toBe(UNREAD_ALL_TITLE);
    expect(isUnreadAllPending(unread)).toBe(true);
    expect(isUnreadAllPending({ title: "Waiting for your answer sheet" })).toBe(false);
    expect(isUnreadAllPending(null)).toBe(false);
  });
});

describe("MOMENTS-1 M9 · a shared link", () => {
  it("parent_share / medium=share on the URL, or in this tab's captured visit source; nothing else", () => {
    expect(cameFromSharedLink("?utm_source=parent_share&utm_medium=whatsapp")).toBe(true);
    expect(cameFromSharedLink("?utm_source=whatsapp&utm_medium=share&utm_campaign=scorecard")).toBe(true);
    expect(cameFromSharedLink("?from=for_parents&utm_source=for_parents")).toBe(false);
    expect(cameFromSharedLink("")).toBe(false);
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify({ utm_source: "parent_share", utm_medium: "whatsapp" }));
    expect(cameFromSharedLink("")).toBe(true);
  });

  function Public({ enabled }: { enabled: boolean }) {
    const show = usePublicMomentAudience(enabled, true);
    return <span data-testid="aud">{show ? "yes" : "no"}</span>;
  }

  it("★★ GUIDE-ALL-1: the public arm rule gives EVERY device the guide (ex-control, fresh); the arm is never reported", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    const view = render(<Public enabled />);
    await waitFor(() => expect(screen.getByTestId("aud").textContent).toBe("yes"));
    view.unmount();

    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "control"); // a device the A/B put in control
    __resetPublicArmForTests();
    const ex = render(<Public enabled />);
    await waitFor(() => expect(screen.getByTestId("aud").textContent).toBe("yes"));
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBe("guide");
    ex.unmount();

    window.localStorage.removeItem(GUIDE_PUBLIC_ARM_KEY); // a fresh device
    __resetPublicArmForTests();
    render(<Public enabled />);
    await waitFor(() => expect(screen.getByTestId("aud").textContent).toBe("yes"));
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBe("guide");
    expect(armAssigned).not.toHaveBeenCalled(); // GUIDE-ALL-1: no arm report
  });

  it("not enabled → no arm is drawn at all", async () => {
    render(<Public enabled={false} />);
    await act(async () => {});
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBeNull();
  });
});

describe("MOMENTS-1 M10 · the solutions page corner peek", () => {
  const tree = (freeCheckOn = true) => (
    <MemoryRouter>
      <SolutionsMoment freeCheckOn={freeCheckOn} />
    </MemoryRouter>
  );

  it("★★ nothing until a check MATCHED; then Byte (peek) with the owner's line and 'Check my answer' → /check-improve", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    render(tree());
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m10")).toBeNull();
    act(() => noteSolutionMatched());
    const m = await screen.findByTestId("guide-moment-m10");
    expect(line()).toBe("Got it right? See which step loses marks. First check free.");
    expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("peek");
    const cta = screen.getByTestId("guide-moment-m10-cta");
    expect(cta.textContent).toBe("Check my answer");
    expect(cta.getAttribute("href")).toBe("/check-improve");
    expect(m).toBeTruthy();
    fireEvent.click(screen.getByTestId("guide-moment-m10-close"));
    expect(screen.queryByTestId("guide-moment-m10")).toBeNull();
  });

  it("GUIDE-ALL-1: an ex-control device arm now gets Byte after a match", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "control");
    render(tree());
    act(() => noteSolutionMatched());
    expect(await screen.findByTestId("guide-moment-m10")).toBeTruthy();
  });


  it("★ honesty: 'First check free' only while the free check is on — off → nothing", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    render(tree(false));
    act(() => noteSolutionMatched());
    await act(async () => {});
    expect(screen.queryByTestId("guide-moment-m10")).toBeNull();
  });
});

/**
 * GUIDE-SCORE-2 (cofounder ruling, #1322 re-review) — no step-marking promise where the target is
 * an OBJECTIVE question. CBSE scores an MCQ / 1-marker on the answer alone; working only sets the
 * mistake type (CLAUDE.md §13). The moments whose target is a tap (M3 on the question, M5's MCQ
 * beat) must not promise step marks; M11's owner copy DOES promise them, so M11 is never mounted on
 * the tap-only Quick Practice scorecard (pinned on the real page: PracticePage.moments.test.tsx).
 */
describe("GUIDE-SCORE-2 · moments copy on objective targets", () => {
  const STEP_PROMISE = /step by step|each step|every step|marks? (each|every) step|step[- ]mark/i;
  it("★★ M3 (the tap) and M5's MCQ beat promise no step marking", () => {
    for (const key of ["m3Byte", "m3Ziggy", "m5ByteMcq"] as const) {
      expect(MOMENT_COPY[key], key).not.toMatch(STEP_PROMISE);
    }
  });
  it("★ M11's owner copy promises step marking — which is exactly why it is suppressed on tap-only cards", () => {
    expect(MOMENT_COPY.m11).toMatch(STEP_PROMISE);
  });
});
