// QP-SCORECARD-2 C — the reopen URLs the scorecard tutor hop hands the tutor as `returnTo`.
import { describe, it, expect } from "vitest";
import {
  buildCheckImproveReviewHref,
  buildQuickPracticeReviewHref,
  withScorecardReviewParam,
} from "./tutorRoundTrip";
import { safeInternalReturnTo } from "./tutorPath";

describe("scorecard review URLs (QP-SCORECARD-2 C)", () => {
  it("withScorecardReviewParam keeps the page's own query and sets ONE review param", () => {
    const u = withScorecardReviewParam("/practice/10/maths?topic=real-numbers&src=start_here&review=OLD", "QP-M-REAL-1");
    const [path, q] = u.split("?");
    expect(path).toBe("/practice/10/maths");
    const sp = new URLSearchParams(q);
    expect(sp.getAll("review")).toEqual(["QP-M-REAL-1"]);
    expect(sp.get("topic")).toBe("real-numbers");
    expect(sp.get("src")).toBe("start_here");
    expect(withScorecardReviewParam("/practice/10/maths", "X")).toBe("/practice/10/maths?review=X");
    // Still a safe in-app return path for the tutor's back arrow.
    expect(safeInternalReturnTo(u)).toBe(u);
  });

  it("buildQuickPracticeReviewHref: the record's subject + first real topic; a mixed slug is skipped", () => {
    expect(buildQuickPracticeReviewHref({ id: "QP-S-ELEC-1", subject: "science", topicKeys: ["electricity"] }))
      .toBe("/practice/10/Science?topic=electricity&review=QP-S-ELEC-1");
    expect(buildQuickPracticeReviewHref({ id: "QP-M-MIX-1", subject: "maths", topicKeys: ["mixed:a+b", "polynomials"] }))
      .toBe("/practice/10/Maths?topic=polynomials&review=QP-M-MIX-1");
  });

  it("buildCheckImproveReviewHref names the paper by its code", () => {
    expect(buildCheckImproveReviewHref("CI-M-REAL-02")).toBe("/check-improve?review=CI-M-REAL-02");
  });
});
