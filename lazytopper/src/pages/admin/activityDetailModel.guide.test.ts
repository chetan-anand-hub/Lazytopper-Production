import { describe, it, expect } from "vitest";
import {
  GUIDE_AB_ENDED_NOTE,
  GUIDE_TEST_GROUP_LABELS,
  activityEventLabel,
  feedItemLabel,
  guideTestGroupLabel,
} from "./activityDetailModel";
import { guideVariantFor } from "../../components/guide/guideVariant";

/** GUIDE-1 - the admin board's words for the Byte-guide test group (historical since GUIDE-ALL-1). */
describe("GUIDE-1 · admin labels", () => {
  it("names the group from the uid (the stored name carries no arm; the arm is a pure function of the uid)", () => {
    const uids = Array.from({ length: 40 }, (_, i) => `admin-uid-${i}`);
    const byte = uids.find((u) => guideVariantFor(u) === "guide")!;
    const ctrl = uids.find((u) => guideVariantFor(u) === "control")!;
    expect(guideTestGroupLabel(byte)).toBe("Guide test group: Byte (A/B ended 22 Oct 2026 — all students on guide)");
    expect(guideTestGroupLabel(ctrl)).toBe("Guide test group: control (A/B ended 22 Oct 2026 — all students on guide)");
    expect(activityEventLabel("guide_variant_assigned", byte)).toBe(GUIDE_TEST_GROUP_LABELS.guide);
    expect(feedItemLabel({ t: 1, k: "event", n: "guide_variant_assigned" }, ctrl)).toBe(GUIDE_TEST_GROUP_LABELS.control);
  });

  it("without a uid the name still reads in plain words, never the raw name", () => {
    expect(activityEventLabel("guide_variant_assigned")).toBe(`Was put in the guide test (${GUIDE_AB_ENDED_NOTE})`);
    expect(activityEventLabel("check_graded")).toBe("Checked an answer");
  });

  it("GUIDE-ALL-1 · the A/B readout is labelled as ended, not deleted", () => {
    expect(GUIDE_AB_ENDED_NOTE).toBe("A/B ended 22 Oct 2026 — all students on guide");
    for (const l of Object.values(GUIDE_TEST_GROUP_LABELS)) expect(l).toContain(GUIDE_AB_ENDED_NOTE);
  });
});
