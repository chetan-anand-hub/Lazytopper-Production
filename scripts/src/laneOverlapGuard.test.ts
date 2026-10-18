import { describe, it } from "node:test";
import assert from "node:assert/strict";

// @ts-expect-error — plain .mjs script, no type declarations by design.
import { GENERATED_PREFIXES, evaluateOverlaps, isGenerated } from "../ops/lane_overlap.mjs";

/**
 * GUARD — the generated-artifact exclusion in `scripts/ops/lane_overlap.mjs`.
 *
 * ★ WHAT THIS FILE IS PROTECTING, AND IT IS NOT THE EXCLUSION ITSELF.
 * `lane-overlap` is a REQUIRED status check. It exists to stop two lanes editing the
 * same AUTHORED file in parallel, where a shared path means two humans disagreeing
 * about one source of truth. A GENERATED artifact has no such conflict — whichever
 * lane merges second regenerates it — so `lazytopper/prerendered/**` is excluded, or
 * every content lane would have to be sequenced against every other for nothing.
 *
 * ⚠ THE RISK IS THE LIST GROWING, AND THE TEMPTATION IS CONCRETE. A `package.json`
 * collision is common, annoying, and blocks merges; adding `lazytopper/package.json`
 * to this list would make those disappear. It would also be exactly wrong —
 * package.json is authored, two lanes editing it genuinely can conflict, and hiding
 * that is how a bad merge reaches trunk. A required check that has been quietly
 * widened is worse than no check, because everyone still believes it is watching.
 *
 * So this asserts the list is EXACTLY one path — not "contains", not "at most N".
 * Widening it fails the root guard matrix, and `.github/CODEOWNERS` gates
 * `/scripts/ops/`, so the owner reviews any change to it in person.
 */

describe("lane_overlap generated-path exclusion", () => {
  it("is EXACTLY one path — the prerendered artifact, and nothing else", () => {
    assert.deepEqual(GENERATED_PREFIXES, ["lazytopper/prerendered/"]);
  });

  it("excludes files inside the prerendered artifact", () => {
    assert.equal(isGenerated("lazytopper/prerendered/manifest.json"), true);
    assert.equal(isGenerated("lazytopper/prerendered/topic-hub/trigonometry.html"), true);
    assert.equal(isGenerated("lazytopper/prerendered/notes/electricity.html"), true);
  });

  /**
   * ★ THE CONTROL. Every one of these is an AUTHORED file that two lanes can genuinely
   * conflict over. If any starts returning true, the required check has stopped
   * watching the thing it exists for — and `lazytopper/package.json` is first in the
   * list on purpose, because that is the one someone will be tempted to add.
   */
  it("does NOT exclude authored files, whatever the temptation", () => {
    for (const authored of [
      "lazytopper/package.json",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "lazytopper/src/App.tsx",
      "lazytopper/src/pages/Welcome.tsx",
      "lazytopper/scripts/seo/captureStaticBodies.ts",
      "lazytopper/scripts/seo/applyPrerendered.ts",
      "firestore.rules",
      "handoff/CURRENT_STATE.md",
      ".github/workflows/quality-gate.yml",
    ]) {
      assert.equal(isGenerated(authored), false, `${authored} must NOT be excluded`);
    }
  });

  /**
   * A near-miss must not match: a sibling directory whose name merely starts with the
   * same characters is a different, authored place.
   */
  it("does not match a lookalike path outside the artifact", () => {
    assert.equal(isGenerated("lazytopper/prerendered-notes/x.html"), false);
    assert.equal(isGenerated("lazytopper/prerender/x.html"), false);
    assert.equal(isGenerated("prerendered/x.html"), false);
    assert.equal(isGenerated("docs/lazytopper/prerendered/x.html"), false);
  });

  it("matches on a path prefix, not a substring anywhere in the path", () => {
    assert.equal(isGenerated("some/other/lazytopper/prerendered/x.html"), false);
  });
});

/**
 * GUARD — DRAFT PRs do not block (owner ruling CI-2, 2026-10-18).
 *
 * A draft is parked work, not a lane about to merge. An overlap with ANOTHER PR's draft
 * is informational; when THIS PR is a draft the check passes with a note and is re-run on
 * `ready_for_review` (pinned in ci_speed_acceptance.mjs w12). ★ THE CONTROL is the
 * non-draft case: two ready PRs sharing an authored file must still FAIL, or the required
 * check has stopped watching the thing it exists for.
 */
describe("lane_overlap draft handling", () => {
  const mine = ["lazytopper/src/pages/Home.tsx", "lazytopper/package.json"];
  const pr = (number: number, isDraft: boolean) => ({
    number, isDraft, title: `PR ${number}`, headRefName: `b${number}`, baseRefName: "base/approved-thru-437",
  });

  it("an overlapping DRAFT PR no longer fails the check (reported as informational)", () => {
    const r = evaluateOverlaps({ mine, others: [{ pr: pr(11, true), files: ["lazytopper/package.json"] }] });
    assert.equal(r.ok, true);
    assert.equal(r.blocking.length, 0);
    assert.equal(r.informational.length, 1);
    assert.deepEqual(r.informational[0].shared, ["lazytopper/package.json"]);
  });

  it("an overlapping NON-draft PR still fails the check (the control)", () => {
    const r = evaluateOverlaps({ mine, others: [{ pr: pr(12, false), files: ["lazytopper/package.json"] }] });
    assert.equal(r.ok, false);
    assert.equal(r.blocking.length, 1);
    assert.equal(r.blocking[0].pr.number, 12);
    assert.equal(r.informational.length, 0);
  });

  it("a non-draft overlap still fails even when a draft overlap is also present", () => {
    const r = evaluateOverlaps({
      mine,
      others: [
        { pr: pr(11, true), files: ["lazytopper/package.json"] },
        { pr: pr(12, false), files: ["lazytopper/src/pages/Home.tsx"] },
      ],
    });
    assert.equal(r.ok, false);
    assert.deepEqual(r.blocking.map((o: { pr: { number: number } }) => o.pr.number), [12]);
    assert.deepEqual(r.informational.map((o: { pr: { number: number } }) => o.pr.number), [11]);
  });

  it("when THIS PR is a draft, overlaps are still reported but the check passes", () => {
    const r = evaluateOverlaps({ mine, selfIsDraft: true, others: [{ pr: pr(12, false), files: ["lazytopper/package.json"] }] });
    assert.equal(r.ok, true);
    assert.equal(r.selfIsDraft, true);
    assert.equal(r.blocking.length, 1, "the overlap is still computed and reported, not hidden");
  });

  it("isDraft must be literally true — a missing or odd flag is treated as a ready PR (fails closed)", () => {
    for (const isDraft of [undefined, "true", 1, null]) {
      const r = evaluateOverlaps({
        mine,
        others: [{ pr: { ...pr(13, false), isDraft }, files: ["lazytopper/package.json"] }],
      });
      assert.equal(r.ok, false, `isDraft=${JSON.stringify(isDraft)} must block`);
    }
  });

  it("generated paths stay excluded for drafts and non-drafts alike", () => {
    const r = evaluateOverlaps({
      mine: ["lazytopper/prerendered/manifest.json"],
      others: [
        { pr: pr(11, true), files: ["lazytopper/prerendered/manifest.json"] },
        { pr: pr(12, false), files: ["lazytopper/prerendered/manifest.json"] },
      ],
    });
    assert.equal(r.ok, true);
    assert.equal(r.blocking.length + r.informational.length, 0);
  });
});
