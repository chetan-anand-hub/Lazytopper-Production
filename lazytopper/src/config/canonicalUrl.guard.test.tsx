// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RouteCanonical from "../components/seo/RouteCanonical";
import {
  CANONICAL_ALIAS,
  SELF_CANONICAL_EXACT,
  SITE_ORIGIN,
  appBasename,
  canonicalFor,
  canonicalPathFor,
} from "./canonicalUrl";

/**
 * GUARD — the canonical NAMES THE PAGE YOU ARE ON.
 *
 * ★ WHY THIS FILE EXISTS SEPARATELY FROM `head.guard.test.ts`. That file
 * asserts the canonical in `index.html` is present, single, and byte-matched
 * to `og:url`. Every one of those was TRUE throughout the defect this guard
 * was written for, because they are statements about FORM. None of them can
 * notice that the one canonical in the shell names the WRONG PAGE on 25 of 26
 * routes. This file asserts CORRESPONDENCE instead: two different routes must
 * produce two DIFFERENT canonicals, each equal to its own URL.
 *
 * ⚠ IT ALSO CANNOT LIVE IN THAT FILE. `head.guard.test.ts` pins itself to the
 * NODE environment on its very first line and reads `index.html` off disk,
 * while these tests render React into a DOM. The environment is per-FILE.
 *
 * ★ AND THE DIRECTIVE ABOVE IS NOT DECORATION — IT IS LOAD-BEARING, for a
 * reason worth knowing. Vitest resolves the environment by scanning the FILE
 * CONTENTS for the directive token, not just the leading docblock. The first
 * draft of this header spelled that token out inline while explaining what the
 * sibling guard does, and vitest read the PROSE as configuration: all 14 tests
 * ran under `node` and died on `document is not defined`. A comment ABOUT a
 * directive became the directive. Never write the bare token in prose here —
 * describe it, as the paragraph above now does.
 */

const PROD_BASENAME = "/app";

function canonicalInDom(): string | null {
  return document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
}

function ogUrlInDom(): string | null {
  return document.head.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? null;
}

/** Render the component at one URL and return what it wrote into the head. */
function canonicalAfterRenderingAt(path: string): { canonical: string | null; ogUrl: string | null } {
  render(
    <MemoryRouter initialEntries={[path]}>
      <RouteCanonical basename={PROD_BASENAME} />
    </MemoryRouter>,
  );
  const result = { canonical: canonicalInDom(), ogUrl: ogUrlInDom() };
  cleanup();
  return result;
}

beforeEach(() => {
  // Start from a head with NO tags, so a test that reads a value is reading
  // one THIS render wrote, never a leftover from the previous one.
  document.head
    .querySelectorAll('link[rel="canonical"], meta[property="og:url"]')
    .forEach((el) => el.remove());
});

describe("canonicalFor — the production URL shape, with the basename", () => {
  it("names each self-canonical route as its own absolute URL", () => {
    expect(canonicalFor("/", PROD_BASENAME)).toBe("https://www.lazytopper.com/app/");
    expect(canonicalFor("/pricing", PROD_BASENAME)).toBe("https://www.lazytopper.com/app/pricing");
    expect(canonicalFor("/exam-trends", PROD_BASENAME)).toBe("https://www.lazytopper.com/app/exam-trends");
    expect(canonicalFor("/topic-hub/light", PROD_BASENAME)).toBe("https://www.lazytopper.com/app/topic-hub/light");
    expect(canonicalFor("/legal/privacy", PROD_BASENAME)).toBe("https://www.lazytopper.com/app/legal/privacy");
    expect(canonicalFor("/practice-hub", PROD_BASENAME)).toBe("https://www.lazytopper.com/app/practice-hub");
  });

  it("★ INCLUDES THE BASENAME — without it every canonical would name a 404", () => {
    // The router's basename is /app, so useLocation().pathname EXCLUDES it.
    // This is the assertion that catches a canonical built from the route path
    // alone, which is the single most damaging way to get this wrong: it would
    // point every page at a URL the site does not serve.
    const url = canonicalFor("/exam-trends", PROD_BASENAME);
    expect(url).toContain("/app/exam-trends");
    expect(url).not.toBe("https://www.lazytopper.com/exam-trends");
    expect(url.startsWith(SITE_ORIGIN + "/app/")).toBe(true);
  });

  it("keeps the trailing slash on the root and on nothing else — the sitemap's convention", () => {
    expect(canonicalFor("/", PROD_BASENAME).endsWith("/app/")).toBe(true);
    expect(canonicalFor("/pricing", PROD_BASENAME).endsWith("/")).toBe(false);
    // A trailing slash arriving in the URL is normalised away, not doubled.
    expect(canonicalFor("/pricing/", PROD_BASENAME)).toBe(canonicalFor("/pricing", PROD_BASENAME));
  });

  it("ignores query string and hash — the same page, not another one", () => {
    expect(canonicalFor("/exam-trends?source=trends", PROD_BASENAME)).toBe(
      "https://www.lazytopper.com/app/exam-trends",
    );
    expect(canonicalFor("/exam-trends#top", PROD_BASENAME)).toBe(
      "https://www.lazytopper.com/app/exam-trends",
    );
  });
});

describe("canonicalPathFor — the ruled set, and everything outside it", () => {
  it("returns the route's own path for every self-canonical route", () => {
    expect(canonicalPathFor("/")).toBe("/");
    expect(canonicalPathFor("/pricing")).toBe("/pricing");
    expect(canonicalPathFor("/exam-trends")).toBe("/exam-trends");
    expect(canonicalPathFor("/topic-hub/light")).toBe("/topic-hub/light");
    expect(canonicalPathFor("/legal/privacy")).toBe("/legal/privacy");
    expect(canonicalPathFor("/practice-hub")).toBe("/practice-hub");
  });

  /**
   * ★ OWNER RULING, 2026-09-09 (FOLLOWON-1) — THE BARE `/topic-hub` IS A SIGNPOST.
   * *"With no `:topicName` it is a signpost, not a destination, and a sitemap
   * should advertise pages rather than redirects."* It renders
   * `<Navigate to="/exam-trends" replace>`, so it is now ALIASED: its canonical
   * names the destination it redirects to.
   *
   * ⚠ THE TWO HALVES ARE ASSERTED SEPARATELY, AND BOTH MATTER. Falling through to
   * "/" would ALSO have removed it from the self-canonical set while looking like
   * a fix — and would have named the HOME PAGE as the authoritative copy of a
   * page that points at Exam Trends. The `not.toBe("/")` arm is what separates
   * "aliased to its destination" from "swept into the root bucket".
   */
  it("★ ALIASES the bare /topic-hub to /exam-trends — a signpost names its destination", () => {
    expect(canonicalPathFor("/topic-hub")).toBe("/exam-trends");
    expect(canonicalPathFor("/topic-hub")).not.toBe("/");
    expect(canonicalPathFor("/topic-hub")).not.toBe("/topic-hub");
    expect(canonicalFor("/topic-hub", PROD_BASENAME)).toBe(
      "https://www.lazytopper.com/app/exam-trends",
    );
    // Query and hash are normalised away before the alias lookup, so a shared
    // link with tracking params canonicalises to the destination too.
    expect(canonicalPathFor("/topic-hub/?utm_source=x")).toBe("/exam-trends");
  });

  /**
   * ⚠ THE TWO TABLES MUST BE DISJOINT, AND THE ALIAS TARGET MUST BE A FIXED POINT.
   * An entry in both tables would make the answer depend on which lookup ran
   * first. An alias pointing at a NON-self-canonical page would produce a
   * canonical CHAIN — Google follows one hop and gives up — which is a worse
   * failure than the bug this module was written to fix, and completely invisible
   * to any assertion about a single route.
   */
  it("★★ no alias is also self-canonical, and every alias target is a fixed point", () => {
    const aliases = Object.entries(CANONICAL_ALIAS);
    // Non-vacuous: an empty table would make both loops below assert nothing.
    expect(aliases.length, "CANONICAL_ALIAS is empty — this check is vacuous")
      .toBeGreaterThan(0);

    for (const [from, to] of aliases) {
      expect(
        SELF_CANONICAL_EXACT.includes(from),
        `${from} is BOTH aliased and self-canonical — the tables must be disjoint`,
      ).toBe(false);
      expect(
        canonicalPathFor(to),
        `alias ${from} -> ${to}, but ${to} canonicalises to ${canonicalPathFor(to)} — ` +
          `a canonical chain, which Google does not follow`,
      ).toBe(to);
    }
  });

  it("⚠ NEVER self-canonicalises the share-token route", () => {
    // A self-canonical here would invite Google to index user tokens. This one
    // matters beyond SEO.
    expect(canonicalPathFor("/u/abc123def456")).toBe("/");
    expect(canonicalFor("/u/abc123def456", PROD_BASENAME)).toBe("https://www.lazytopper.com/app/");
  });

  it("★ SELF-CANONICALISES /practice-hub — OWNER RULING, corrected from the LIVE PAGE", () => {
    // This lane surfaced /practice-hub as an ungated content route missing from
    // the ruled set and STOPPED rather than acting on it. It was first ruled
    // OUT as "a mode launcher with nothing to read" — read off the route name
    // and a grep — and then ruled back IN once the owner opened the running
    // page: signed out it renders a full subject/scope/topic chooser, four
    // described modes and an honest locked-feature panel.
    //
    // ⚠ THE CORRECTION CAME FROM THE LIVE PRODUCT, NOT THE CODE. This
    // assertion is here so the next reader cannot re-derive "launcher" from the
    // component name and quietly drop it back out of the set.
    expect(canonicalPathFor("/practice-hub")).toBe("/practice-hub");
    expect(canonicalFor("/practice-hub", PROD_BASENAME)).toBe(
      "https://www.lazytopper.com/app/practice-hub",
    );
  });

  it("does not let a bare prefix sweep in the premium-gated topic-hub routes", () => {
    // /topic-hub/:grade/:subject and /topic-hub/:grade/:subject/:topicKey are
    // RequirePremium — they render a login redirect to a crawler. Only the
    // ONE-segment form is self-canonical, so these must fall to the root.
    expect(canonicalPathFor("/topic-hub/10/Maths")).toBe("/");
    expect(canonicalPathFor("/topic-hub/10/Maths/light")).toBe("/");
    // ...while the one-segment form still resolves, so the two checks above are
    // not passing merely because everything topic-hub-shaped falls through.
    expect(canonicalPathFor("/topic-hub/light")).toBe("/topic-hub/light");
  });

  it("consolidates every gated and thin route to the root", () => {
    for (const path of [
      "/me",
      "/check-improve",
      "/login",
      "/sign-up",
      "/welcome",
      "/browse",
      "/intent",
      "/tutor/10/Maths",
      "/full-mock/10/Science",
      "/admin/funnel",
      "/definitely-not-a-route",
    ]) {
      expect(canonicalPathFor(path), path + " should consolidate to the root").toBe("/");
    }
  });
});

describe("appBasename — the same source of truth the router uses", () => {
  it("mirrors import.meta.env.BASE_URL with any trailing slash removed", () => {
    // main.tsx passes BASE_URL with its trailing slash stripped to
    // <BrowserRouter basename>. Deriving it the same way here is what stops the
    // canonical and the router from ever disagreeing about where the app lives.
    const base = import.meta.env.BASE_URL || "/";
    const expected = base.endsWith("/") ? base.slice(0, -1) : base;
    expect(appBasename()).toBe(expected);
  });
});

describe("★★ THE ACCEPTANCE — two routes, two different canonicals", () => {
  it("renders two DIFFERENT routes and each canonical equals its OWN url", () => {
    const trends = canonicalAfterRenderingAt("/exam-trends");
    const pricing = canonicalAfterRenderingAt("/pricing");

    // Each names ITSELF...
    expect(trends.canonical).toBe("https://www.lazytopper.com/app/exam-trends");
    expect(pricing.canonical).toBe("https://www.lazytopper.com/app/pricing");

    // ...and they are NOT the same string. This is the assertion the old guard
    // could not make: before this lane BOTH of these were
    // "https://www.lazytopper.com/app/" and every FORM assertion still passed.
    expect(trends.canonical).not.toBe(pricing.canonical);
  });

  it("og:url is written from the SAME string as the canonical, on every route", () => {
    for (const path of ["/exam-trends", "/pricing", "/topic-hub/light", "/practice-hub", "/", "/me"]) {
      const { canonical, ogUrl } = canonicalAfterRenderingAt(path);
      expect(canonical, "no canonical rendered at " + path).not.toBeNull();
      expect(ogUrl, "og:url is not byte-identical to the canonical at " + path).toBe(canonical);
    }
  });

  it("★ THE CONTROL — a route outside the ruled set renders the ROOT, not its own path", () => {
    // Without this, every assertion above would still pass if the component
    // simply echoed the pathname back. It must CONSOLIDATE, not mirror.
    const me = canonicalAfterRenderingAt("/me");
    expect(me.canonical).toBe("https://www.lazytopper.com/app/");
    expect(me.canonical).not.toContain("/me");
  });

  it("creates the tags when the head has none, and keeps exactly one of each", () => {
    // Proves the read helpers above are not reporting a leftover tag: the head
    // is empty here, so anything they return was written by this render.
    expect(canonicalInDom()).toBeNull();
    expect(ogUrlInDom()).toBeNull();

    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <RouteCanonical basename={PROD_BASENAME} />
      </MemoryRouter>,
    );
    expect(canonicalInDom()).toBe("https://www.lazytopper.com/app/pricing");
    // Exactly one of each — a second tag would let a scraper pick either.
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
    cleanup();
  });
});
