import { describe, it } from "node:test";
import assert from "node:assert/strict";

// @ts-expect-error — plain .mjs script, no type declarations by design.
import { GENERATED_PREFIXES, isGenerated } from "../ops/lane_overlap.mjs";

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
