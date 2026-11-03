/**
 * AD-LANDING-OFFER-1 (fix round 1) - the signed-out landing line on /check-improve: under the sample card while it shows, under the
 * title once it is closed, and NEVER after the ladder's "type your answer" (the page has just scrolled to the answer box) or its tap.
 * The sample card and its audience are stubbed so the test drives exactly those transitions; the line itself is a marker.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { __setCiDraftImageStoreForTests } from "../../services/checkImproveDraft";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: false,
    isTrialExpired: false,
    hydrated: true,
    tier: "free",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: (() => {}) as () => void,
    upgradeToPremium: () => {},
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  demo: { show: true },
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../components/packs/LandingOfferLazy", () => ({
  default: ({ variant }: { variant: string }) => <div data-testid="landing-offer-mount" data-variant={variant} />,
}));
vi.mock("../../components/ciDemo/ciDemoModel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/ciDemo/ciDemoModel")>();
  return {
    ...actual,
    useCiDemoAudience: () => ({
      show: H.demo.show,
      close: () => {
        H.demo.show = false;
      },
      closedHere: false,
      startLadder: () => false,
      ladderForced: false,
      reason: null,
    }),
  };
});
vi.mock("../../components/ciDemo/CiDemoCard", () => ({
  default: (p: {
    onClose: () => void;
    onLadderType: (pick: unknown) => void;
    onLadderAnswered: (a: unknown) => void;
  }) => (
    <div data-testid="ci-demo-stub">
      <button type="button" onClick={p.onClose}>stub-close</button>
      <button type="button" onClick={() => p.onLadderAnswered({ correct: true })}>stub-tap</button>
      <button
        type="button"
        onClick={() =>
          p.onLadderType({
            bankId: "b1",
            text: "Find the HCF of 6 and 20. [2 marks]",
            label: "Real Numbers",
            seed: { marks: 2, subject: "Maths", topicKey: "real-numbers", questionText: "Find the HCF of 6 and 20." },
          })
        }
      >
        stub-type
      </button>
    </div>
  ),
}));

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

function page() {
  return (
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>
  );
}
const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};
const mounts = () => screen.queryAllByTestId("landing-offer-mount");

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  H.auth = { user: null, loading: false };
  H.demo.show = true;
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  __setCiDraftImageStoreForTests({ put: async () => {}, get: async () => null, deleteId: async () => {}, purgeOlderThan: async () => {} });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __setCiDraftImageStoreForTests(null);
});

describe("AD-LANDING-OFFER-1 · the landing line on /check-improve (signed out)", () => {
  it("shows once, right after the sample card, while it shows", async () => {
    render(page());
    await settle();
    expect(mounts()).toHaveLength(1);
    const card = screen.getByTestId("ci-demo-stub");
    expect(card.compareDocumentPosition(mounts()[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("with the sample card closed (or never shown): exactly one line, under the page title", async () => {
    H.demo.show = false;
    render(page());
    await settle();
    expect(screen.queryByTestId("ci-demo-stub")).toBeNull();
    expect(mounts()).toHaveLength(1);
  });
  it("★ after the ladder's 'type your answer' the line never comes back above the answer box", async () => {
    render(page());
    await settle();
    await act(async () => {
      fireEvent.click(screen.getByText("stub-type"));
    });
    await settle();
    expect(screen.queryByTestId("ci-demo-stub")).toBeNull();
    expect(mounts()).toHaveLength(0);
  });
  it("after the ladder's tap the line steps aside (the verdict carries the buying block)", async () => {
    render(page());
    await settle();
    await act(async () => {
      fireEvent.click(screen.getByText("stub-tap"));
    });
    await settle();
    expect(mounts()).toHaveLength(0);
  });
  it("signed in: no line", async () => {
    H.auth = { user: { uid: "u1", email: null, phoneNumber: null, displayName: null }, loading: false };
    render(page());
    await settle();
    expect(mounts()).toHaveLength(0);
  });
});
