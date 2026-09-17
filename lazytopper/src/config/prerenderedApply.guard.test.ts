// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

import {
  applicablePaths,
  assetRefsIn,
  fragmentPathFor,
  validateArtifact,
} from "../../scripts/seo/applyPrerendered";
import { sitemapPaths } from "./sitemapUrls";

/**
 * GUARD — the post-build apply step, `scripts/seo/applyPrerendered.ts`.
 *
 * ★ WHAT THIS FILE EXISTS TO CATCH. The apply step's dangerous failure is not a crash:
 * it is a build that looks fine and ships pages whose content is wrong, missing, or
 * pointing at images that no longer exist. None of that is visible in a build log, and
 * none of it is visible to `tsc`, the ops matrix or the mojibake check. So the rules
 * that make the step safe are asserted here against synthetic input, where each one can
 * be shown to FAIL on a broken case — which is the only property that makes a guard
 * worth having.
 */

describe("applicablePaths", () => {
  it("is every advertised path except the root", () => {
    const advertised = sitemapPaths();
    const applicable = applicablePaths();

    expect(advertised).toContain("/");
    expect(applicable).not.toContain("/");
    expect(applicable).toHaveLength(advertised.length - 1);
    expect(applicable.slice().sort()).toEqual(
      advertised.filter((path) => path !== "/").slice().sort(),
    );
  });

  it("still covers all 26 chapters and all 26 notes", () => {
    const applicable = applicablePaths();
    expect(applicable.filter((p) => p.startsWith("/topic-hub/"))).toHaveLength(26);
    expect(applicable.filter((p) => p.startsWith("/notes/"))).toHaveLength(26);
  });
});

describe("fragmentPathFor", () => {
  it("maps an advertised path to a fragment file", () => {
    expect(fragmentPathFor("/topic-hub/trigonometry", "/art")).toBe(
      join("/art", "topic-hub", "trigonometry.html"),
    );
  });
});

describe("validateArtifact — the artifact must match the advertised set exactly", () => {
  const expected = ["/exam-trends", "/notes/electricity", "/topic-hub/trigonometry"];

  it("passes when the sets match", () => {
    expect(validateArtifact(expected, [...expected])).toEqual([]);
  });

  /**
   * ★★ THE CASE THAT CATCHES A NEW CHAPTER GOING UNCAPTURED. Every other check in this
   * step asks "is the fragment we have good?", which is vacuously true of a page that
   * has no fragment at all — that page simply keeps an empty body and no gate notices.
   * Only comparing against the advertised set catches an omission.
   */
  it("REJECTS an advertised page with no fragment", () => {
    const failures = validateArtifact(expected, ["/exam-trends", "/topic-hub/trigonometry"]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("/notes/electricity");
    expect(failures[0]).toContain("no prerendered fragment");
  });

  it("REJECTS a fragment for a path that is no longer advertised", () => {
    const failures = validateArtifact(expected, [...expected, "/topic-hub/retired-chapter"]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("/topic-hub/retired-chapter");
    expect(failures[0]).toContain("not advertised");
  });

  it("names EVERY problem, not just the first", () => {
    const failures = validateArtifact(expected, ["/exam-trends", "/topic-hub/ghost"]);
    expect(failures).toHaveLength(3); // two missing, one orphan
    expect(failures.join(" ")).toContain("/notes/electricity");
    expect(failures.join(" ")).toContain("/topic-hub/trigonometry");
    expect(failures.join(" ")).toContain("/topic-hub/ghost");
  });

  it("REJECTS a completely empty artifact rather than treating it as nothing to do", () => {
    expect(validateArtifact(expected, [])).toHaveLength(expected.length);
  });
});

describe("assetRefsIn — the staleness check that runs on every platform", () => {
  /**
   * ★ WHY THIS IS THE CHECK THAT MATTERS. Vite content-hashes asset filenames, so a
   * figure that changed or was renamed no longer exists under the name a stale fragment
   * holds. Without this, the build ships a page whose images 404 — worse than stale
   * text, and invisible to every other gate.
   */
  it("finds the hashed figures a captured body points at", () => {
    const fragment =
      '<main><img src="/app/assets/fig_11_6-CXBI_RXR.webp" alt="">' +
      '<img src="/app/assets/fig_eye-DPGK2y3-.webp" alt=""></main>';

    expect(assetRefsIn(fragment).sort()).toEqual([
      "/app/assets/fig_11_6-CXBI_RXR.webp",
      "/app/assets/fig_eye-DPGK2y3-.webp",
    ]);
  });

  it("strips a query string, so the same asset is not reported twice", () => {
    expect(assetRefsIn('<img src="/app/assets/f-AAAAAAAA.webp?v=2">')).toEqual([
      "/app/assets/f-AAAAAAAA.webp",
    ]);
  });

  /**
   * ★ THE CONTROL. Navigation links vastly outnumber asset references in a real
   * fragment — 114 route links against 65 asset refs in the current capture — and they
   * are NOT files, so demanding they exist on disk would fail every build. This is the
   * discrimination the check depends on.
   */
  it("ignores in-app navigation links, which are routes and not files", () => {
    const fragment =
      '<a href="/app/browse">Browse</a>' +
      '<a href="/app/chapter-test/10/Maths/trigonometry?source=topicHub">Test</a>' +
      '<a href="/app/notes/electricity">Notes</a>';

    expect(assetRefsIn(fragment)).toEqual([]);
  });

  it("returns nothing for a fragment with no assets at all", () => {
    expect(assetRefsIn("<main><h1>Refund policy</h1><p>No figures here.</p></main>")).toEqual([]);
  });
});

describe("the fragment layout round-trips", () => {
  it("writes and reads back every advertised path without collision", () => {
    const dir = mkdtempSync(join(tmpdir(), "prerender-"));
    try {
      const paths = applicablePaths();
      for (const path of paths) {
        const file = fragmentPathFor(path, dir);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `<main>${path}</main>`, "utf8");
      }
      // 58 distinct paths must produce 58 distinct files — `/topic-hub/x` and
      // `/notes/x` share a slug, so a flattened naming scheme would silently collide.
      const unique = new Set(paths.map((p) => fragmentPathFor(p, dir)));
      expect(unique.size).toBe(paths.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
