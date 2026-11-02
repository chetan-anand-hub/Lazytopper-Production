/** ACT-FIRST-1 — the first-action events: one `shown` per surface per load, a `tap` only for a card that was shown, reason carried. */
import { describe, it, expect, beforeEach, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", () => ({ trackFirstAction: track }));
vi.mock("../../services/firebaseClient", () => ({ authClient: null }));
vi.mock("../../services/newAccountTrial", () => ({ wasTrialStartedAtSignUp: () => false }));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: vi.fn(), loadLocalSessionRecords: () => [] }));

import { reportFirstActionShown, reportFirstActionTap, resetFirstActionForTests } from "./firstAction";

beforeEach(() => {
  track.mockReset();
  resetFirstActionForTests();
});

describe("first-action events", () => {
  it("shown fires once per surface, with the reason; a null reason fires nothing", () => {
    reportFirstActionShown("home", null);
    reportFirstActionShown("home", "new_by_signal");
    reportFirstActionShown("home", "server_zero");
    reportFirstActionShown("answer_checker", "server_zero");
    expect(track.mock.calls).toEqual([
      ["first_action_shown", { surface: "home", reason: "new_by_signal" }],
      ["first_action_shown", { surface: "answer_checker", reason: "server_zero" }],
    ]);
  });

  it("tap carries the shown reason and needs a shown card", () => {
    reportFirstActionTap("answer_checker");
    reportFirstActionTap();
    expect(track).not.toHaveBeenCalled();
    reportFirstActionShown("home", "new_by_signal");
    reportFirstActionTap();
    expect(track).toHaveBeenLastCalledWith("first_action_tap", { surface: "home", reason: "new_by_signal" });
  });
});
