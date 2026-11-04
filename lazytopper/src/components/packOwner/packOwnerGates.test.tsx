/**
 * PACK-OWNER-GATES-1 - every Premium gate speaks to a pack owner as a customer.
 * Matrix: each gate x {no packs, owns Chapter, owns CBQ, owns Bundle, packs loading, packs error} x {trial-eligible, trial ended}.
 * No packs / loading / error -> today's copy, unchanged (and no pack-owner line). A Premium student sees no gate (or no line).
 * Plus: the 402 label map covers every feature id the server can send; the CBQ bonus-spent line; the owned-pack paper wall.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

const S = vi.hoisted(() => ({
  tier: "free" as string,
  trialStartDate: null as string | null,
  hydrated: true,
  uid: "u1",
  packs: "none" as "none" | "chapter" | "cbq" | "bundle" | "loading" | "error",
}));

const PACKS = {
  chapter: [{ packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles", pricePaidInr: 49, paidAt: 1_000 }],
  cbq: [{ packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", pricePaidInr: 199, paidAt: 2_000 }],
  bundle: [
    { packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles", pricePaidInr: 49, paidAt: 1_000 },
    { packId: "pack_bundle:all", sku: "pack_bundle", target: "all", pricePaidInr: 299, paidAt: 5_000 },
  ],
};

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: S.uid ? { uid: S.uid } : null, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => {
    const isPremium = S.tier === "premium" || S.tier === "trial";
    return {
      isPremium,
      isTrialExpired: S.tier === "free" && Boolean(S.trialStartDate),
      startTrial: vi.fn(),
      hydrated: S.hydrated,
      status: { tier: S.tier, plan: "none", trialStartDate: S.trialStartDate, trialEndDate: null, premiumSince: null },
    };
  },
}));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: S.tier, plan: "none", trialStartDate: S.trialStartDate, trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: (l: (uid: string, s: unknown) => void) => {
      l(S.uid, { tier: S.tier, plan: "none", trialStartDate: S.trialStartDate, trialEndDate: null, premiumSince: null });
      return () => undefined;
    },
    activateTrial: vi.fn(),
    hydrateSubscriptionFromCloud: vi.fn(),
  };
});
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: () => {
      if (S.packs === "loading") return new Promise(() => undefined);
      if (S.packs === "error") return Promise.reject(new Error("request failed: 500"));
      return Promise.resolve({ packs: S.packs === "none" ? [] : PACKS[S.packs], licensee: { name: "", email: "" }, boardPassCredit: null });
    },
  };
});
vi.mock("../UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("../feedback/feedbackPromptHost", () => ({ notifyPaywallDismissed: vi.fn(), notifyFirstGradedResult: vi.fn(), dismissFeedbackPromptFor: vi.fn() }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return {
    ...actual,
    trackNamedEvent: vi.fn(),
    trackPaywallAction: vi.fn(),
    trackSaleMoment: vi.fn(),
    trackScorecardUpgrade: vi.fn(),
    sendAnalyticsHit: vi.fn(),
  };
});

import { RequirePremium } from "../auth/RequireAuth";
import { UpgradeSheet, labelForFeature } from "../subscription/UpgradeSheet";
import LockedDetail from "../results/LockedDetail";
import ScorecardUpgradeLine from "../results/ScorecardUpgradeLine";
import DownloadLimitWall from "../limits/DownloadLimitWall";
import TutorErrorView from "../../pages/tutor/TutorErrorView";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { PACK_OWNER_BODY, mostRecentPack, ownsPaperPack, packForPaper, packOwnerLine, packOwnerName } from "./packOwnerModel";
import { cbqTutorBonusUsedLine, resetCbqTutorBonusForTests, setCbqTutorBonus } from "../../ai/cbqTutorBonus";
import type { OwnedPack } from "../../services/packs";
import type { ScorecardVariant } from "../results/scorecardVariants";

const HEAD = {
  chapter: "You already practise on paper with your Triangles Chapter Pack.",
  cbq: "You already practise on paper with your Maths CBQ Pack.",
  bundle: "You already practise on paper with your Maths + Science Bundle.",
} as const;

type GateCase = { name: string; el: () => ReactElement; todays: () => void };
const scoreVariant = { surface: "worksheet", title: "T", subtitle: "S", score: { kind: "marks", awarded: 7, total: 10 }, actions: [] } as unknown as ScorecardVariant;

const GATES: GateCase[] = [
  {
    name: "RequirePremium lock (Answer Checker / Worksheet / tutor)",
    el: () => (
      <RequirePremium featureLabel="Answer Checker">
        <div>CHILD</div>
      </RequirePremium>
    ),
    todays: () => {
      // LOCK-SELL-1: the lock's headline names the feature and the Board Pass.
      expect(screen.getByText("Answer Checker comes with the Board Pass")).toBeTruthy();
    },
  },
  {
    name: "UpgradeSheet (402 from SolutionChecker / Practice / Quick Practice)",
    el: () => <UpgradeSheet featureLabel={labelForFeature("check-solution")} onClose={() => undefined} />,
    todays: () => expect(screen.getByRole("heading", { name: "Checking your answer is a Premium feature" })).toBeTruthy(),
  },
  {
    name: "paper wall (Chapter Test)",
    el: () => <UpgradeSheet featureLabel="Grading your chapter test" offers={{ kind: "chapter-test", chapterSlug: "circles", chapterName: "Circles" }} onClose={() => undefined} />,
    todays: () => expect(screen.getByTestId("upgrade-sheet-wall-body").textContent).toContain("Written answers are marked with the Board Pass."),
  },
  {
    name: "LockedDetail (results)",
    el: () => <LockedDetail scoreLine="7 of 10" />,
    todays: () => expect(screen.getByText(/Premium opens every answer step by step/)).toBeTruthy(),
  },
  {
    name: "ScorecardUpgradeLine (results)",
    el: () => <ScorecardUpgradeLine variant={scoreVariant} />,
    todays: () => expect(screen.getByText("You lost 3 marks.")).toBeTruthy(),
  },
  {
    name: "DownloadLimitWall (limits)",
    el: () => <DownloadLimitWall variant="blocked" tier="free" onClose={() => undefined} />,
    todays: () => expect(screen.getByTestId("download-wall")).toBeTruthy(),
  },
  {
    name: "Tutor PremiumCard (402 inside the tutor)",
    el: () => <TutorErrorView state={{ kind: "premium", message: "x" }} onRetry={() => undefined} selfHref="/tutor" />,
    todays: () => expect(screen.getByText("Want to know why you lost this mark?")).toBeTruthy(),
  },
];

const TRIALS = [
  { name: "trial-eligible", trialStartDate: null },
  { name: "trial ended", trialStartDate: "2026-10-01T00:00:00.000Z" },
] as const;

async function mount(el: ReactElement) {
  render(<MemoryRouter initialEntries={["/check-improve"]}>{el}</MemoryRouter>);
  // Let the lazy chunk and the ownership read settle.
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  S.tier = "free";
  S.trialStartDate = null;
  S.hydrated = true;
  S.uid = "u1";
  S.packs = "none";
  resetOwnedPacksCache();
  resetCbqTutorBonusForTests();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PACK-OWNER-GATES-1 - gate x packs x trial matrix", () => {
  for (const gate of GATES) {
    for (const trial of TRIALS) {
      describe(`${gate.name} - ${trial.name}`, () => {
        beforeEach(() => {
          S.trialStartDate = trial.trialStartDate;
        });
        for (const unknown of ["none", "loading", "error"] as const) {
          it(`${unknown}: today's copy, unchanged, no pack-owner line`, async () => {
            S.packs = unknown;
            await mount(gate.el());
            expect(screen.queryByTestId("pack-owner-line")).toBeNull();
            gate.todays();
          });
        }
        for (const owned of ["chapter", "cbq", "bundle"] as const) {
          it(`owns ${owned}: the pack-owner line names the most recent pack`, async () => {
            S.packs = owned;
            await mount(gate.el());
            const line = await screen.findByTestId("pack-owner-line");
            expect(line.textContent).toContain(HEAD[owned]);
            expect(line.textContent).toContain(PACK_OWNER_BODY);
            // Never error-red, never an inline style: CSS classes only.
            expect(line.getAttribute("style")).toBeNull();
          });
        }
      });
    }
  }

  it("the trial button shows only where it already showed (RequirePremium: trial-eligible only), pack owner or not", async () => {
    S.packs = "chapter";
    await mount(GATES[0].el());
    await screen.findByTestId("pack-owner-line");
    expect(screen.getByText("Start my free 7-day trial")).toBeTruthy();
    cleanup();
    resetOwnedPacksCache();
    S.trialStartDate = "2026-10-01T00:00:00.000Z";
    await mount(GATES[0].el());
    await screen.findByTestId("pack-owner-line");
    expect(screen.queryByText("Start my free 7-day trial")).toBeNull();
  });

  it("a Premium student meets no gate and no pack-owner line", async () => {
    S.tier = "premium";
    S.packs = "chapter";
    await mount(GATES[0].el());
    expect(screen.getByText("CHILD")).toBeTruthy();
    expect(screen.queryByText("Answer Checker comes with the Board Pass")).toBeNull();
    cleanup();
    await mount(GATES[1].el());
    expect(screen.queryByTestId("pack-owner-line")).toBeNull();
    cleanup();
    await mount(GATES[4].el());
    expect(screen.queryByTestId("pack-owner-line")).toBeNull();
    expect(screen.queryByText("You lost 3 marks.")).toBeNull();
    cleanup();
    await mount(<DownloadLimitWall variant="blocked" tier="premium" onClose={() => undefined} />);
    expect(screen.queryByTestId("pack-owner-line")).toBeNull();
  });

  it("a running trial keeps today's sheet (the line is for a Basic pack owner)", async () => {
    S.tier = "trial";
    S.trialStartDate = "2026-11-01T00:00:00.000Z";
    S.packs = "chapter";
    await mount(GATES[1].el());
    expect(screen.queryByTestId("pack-owner-line")).toBeNull();
  });
});

describe("fix 3 - a paper wall for a paper from an OWNED pack", () => {
  it("names the pack the paper comes from, and never says 'Written answers are marked with the Board Pass'", async () => {
    S.trialStartDate = "2026-10-01T00:00:00.000Z";
    S.packs = "chapter";
    await mount(<UpgradeSheet featureLabel="Grading your chapter test" offers={{ kind: "chapter-test", chapterSlug: "triangles", chapterName: "Triangles" }} onClose={() => undefined} />);
    const line = await screen.findByTestId("pack-owner-line");
    expect(line.textContent).toContain(HEAD.chapter);
    expect(document.body.textContent).not.toContain("Written answers are marked with the Board Pass");
    expect(screen.getByText("Your chapter test is saved. Get it marked like the board would.")).toBeTruthy();
  });
  it("a Full Mock from an owned Bundle names the Bundle", async () => {
    S.packs = "bundle";
    await mount(<UpgradeSheet featureLabel="Grading your full mock" offers={{ kind: "full-mock", subject: "science" }} onClose={() => undefined} />);
    expect((await screen.findByTestId("pack-owner-line")).textContent).toContain(HEAD.bundle);
    expect(document.body.textContent).not.toContain("written answers are marked with the Board Pass");
  });
});

describe("fix 4 - CBQ tutor bonus spent", () => {
  it("cbqTutorBonusUsedLine: only at 0 left, from the server's limit", () => {
    expect(cbqTutorBonusUsedLine({ left: 0, limit: 3 })).toBe("You've used your 3 free CBQ Pack tutor questions.");
    expect(cbqTutorBonusUsedLine({ left: 1, limit: 3 })).toBeNull();
    expect(cbqTutorBonusUsedLine(null)).toBeNull();
  });
  it("the tutor PremiumCard shows the spent line above the pack-owner line for a CBQ owner at 0", async () => {
    S.trialStartDate = "2026-10-01T00:00:00.000Z";
    S.packs = "cbq";
    setCbqTutorBonus({ uid: "u1", left: 0, limit: 3 });
    await mount(GATES[6].el());
    const used = screen.getByTestId("cbq-bonus-used");
    const line = await screen.findByTestId("pack-owner-line");
    expect(used.textContent).toBe("You've used your 3 free CBQ Pack tutor questions.");
    expect(used.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("no spent line while questions are left or for a non-owner", async () => {
    setCbqTutorBonus({ uid: "u1", left: 2, limit: 3 });
    await mount(GATES[6].el());
    expect(screen.queryByTestId("cbq-bonus-used")).toBeNull();
  });
});

describe("fix 2 - the 402 feature label", () => {
  it("every feature id the server can send (entitlement.cjs) maps to a specific title", () => {
    const src = readFileSync(resolve(__dirname, "../../../server/services/entitlement.cjs"), "utf8");
    const ids = [...src.matchAll(/feature:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(expect.arrayContaining(["check-solution", "grade-worksheet", "tutor", "detect-question", "step-solution-generation"]));
    for (const id of ids) {
      expect(labelForFeature(id), id).not.toBe("This");
      expect(labelForFeature(id.replace(/-/g, "_")), id).not.toBe("This");
    }
  });
  it("both spellings agree; unknown and absent stay generic", () => {
    expect(labelForFeature("check-solution")).toBe(labelForFeature("check_solution"));
    expect(labelForFeature("tutor")).toBe(labelForFeature("mentor"));
    expect(labelForFeature("grade-worksheet")).toBe("Grading your worksheet");
    expect(labelForFeature("nope")).toBe("This");
    expect(labelForFeature("toString")).toBe("This");
    expect(labelForFeature(undefined)).toBe("This");
  });
});

describe("packOwnerModel (pure)", () => {
  const p = (packId: string, paidAt: number): OwnedPack => {
    const [sku, target] = packId.split(":");
    return { packId, sku, target, pricePaidInr: 1, paidAt };
  };
  it("names each pack in a sentence", () => {
    expect(packOwnerName(p("pack_chapter:triangles", 1))).toBe("Triangles Chapter Pack");
    expect(packOwnerName(p("pack_mock:science", 1))).toBe("Science Mock Pack");
    expect(packOwnerName(p("pack_subject:maths", 1))).toBe("Maths Subject Pack");
    expect(packOwnerName(p("pack_cbq:science", 1))).toBe("Science CBQ Pack");
    expect(packOwnerName(p("pack_bundle:all", 1))).toBe("Maths + Science Bundle");
  });
  it("most recent pack; none -> no line", () => {
    expect(mostRecentPack([p("pack_cbq:maths", 9), p("pack_chapter:triangles", 3)])?.packId).toBe("pack_cbq:maths");
    expect(packOwnerLine([])).toBeNull();
  });
  it("the paper's own pack follows the server's ownership rules", () => {
    const subj = [p("pack_subject:maths", 1), p("pack_cbq:maths", 9)];
    expect(packForPaper(subj, { kind: "worksheet", chapterSlug: "triangles" })?.packId).toBe("pack_subject:maths");
    expect(packForPaper(subj, { kind: "full-mock", subject: "maths" })?.packId).toBe("pack_subject:maths");
    expect(ownsPaperPack(subj, { kind: "full-mock", subject: "science" })).toBe(false);
    // A CBQ Pack covers no chapter test or mock (packProducts.cjs: CBQ is its own product).
    expect(ownsPaperPack([p("pack_cbq:maths", 1)], { kind: "chapter-test", chapterSlug: "triangles" })).toBe(false);
    expect(packOwnerLine(subj, { kind: "worksheet", chapterSlug: "triangles" })?.headline).toBe("You already practise on paper with your Maths Subject Pack.");
  });
});
