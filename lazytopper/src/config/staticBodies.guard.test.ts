// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import {
  BANNED_AUTH_TEXT,
  MIN_BODY_BYTES,
  SUBSTRING_TRAP_WITNESSES,
  capturablePaths,
  servableKey,
  stripAuthChrome,
  validateCaptures,
  validateCoverage,
} from "../../scripts/seo/captureStaticBodies";
import { sitemapPaths } from "./sitemapUrls";

/**
 * GUARD — the post-build body capture, `scripts/seo/captureStaticBodies.ts`.
 *
 * ★ WHAT THIS FILE EXISTS TO CATCH. The capture step's dangerous failure is not a
 * crash — it is a GREEN build carrying the wrong content: one page's DOM written
 * into every file, each under its own correct title, every gate still passing.
 * Nothing about that is visible in a build log. So the two things that make the
 * step safe — the strip removing NODES rather than TEXT, and the validator
 * refusing to let a bad capture reach disk — are asserted here, against synthetic
 * DOM, so they run in CI's unit step and can be shown to FAIL on a broken input.
 *
 * ⚠ A GUARD THAT ONLY READS THE BUILD OUTPUT WOULD BE WORTHLESS HERE. It could not
 * run before `vite build`, and — worse — it could only ever confirm that today's
 * artifact looks right. It could never demonstrate that the validator REJECTS the
 * wrong thing, which is the only property that matters. Every assertion below
 * therefore feeds the real functions a hand-built case and checks the verdict,
 * and every rule has a paired case that must FAIL.
 */

/** Minimal stand-in for a captured page: enough bytes to clear the floor. */
function capture(path: string, text: string, html?: string) {
  const body = html ?? `<main><p>${text}</p><i>${"x".repeat(MIN_BODY_BYTES)}</i></main>`;
  return { path, html: body, text, removed: 0 };
}

describe("capturablePaths", () => {
  it("covers every advertised path except the root", () => {
    const advertised = sitemapPaths();
    const capturable = capturablePaths();

    expect(advertised).toContain("/");
    expect(capturable).not.toContain("/");
    expect(capturable).toHaveLength(advertised.length - 1);
    // Every non-root advertised path is captured — no silent family drop-outs.
    expect(capturable.slice().sort()).toEqual(
      advertised.filter((path) => path !== "/").slice().sort(),
    );
  });

  it("still covers all 26 chapters and all 26 notes", () => {
    const capturable = capturablePaths();
    expect(capturable.filter((path) => path.startsWith("/topic-hub/"))).toHaveLength(26);
    expect(capturable.filter((path) => path.startsWith("/notes/"))).toHaveLength(26);
  });
});

describe("stripAuthChrome removes NODES, never text", () => {
  /**
   * ★ THE TWO SENTENCES THAT MAKE TEXT-STRIPPING UNSAFE. Both are real, both are on
   * advertised chapter pages, and both contain a banned string inside an ordinary
   * word: "de(sign in)to" and "hit-and-(trial)". A `replace()` over the serialized
   * HTML corrupts CBSE content silently, in a static file, with the build green.
   */
  it.each(SUBSTRING_TRAP_WITNESSES)(
    "leaves $path's content intact ($sentence)",
    ({ sentence }) => {
      const root = document.createElement("div");
      root.innerHTML = `<main><p>Split a shaded ${sentence} and balance it.</p></main>`;

      stripAuthChrome(root);

      expect(root.textContent).toContain(sentence);
    },
  );

  it("removes the greeting node", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<header><p data-testid="shell-greeting">Good evening</p></header><main><p>Trigonometry</p></main>';

    stripAuthChrome(root);

    expect(root.querySelector('[data-testid="shell-greeting"]')).toBeNull();
    expect(root.textContent).toContain("Trigonometry");
  });

  it("removes a login button whose WHOLE label is the banned phrase", () => {
    const root = document.createElement("div");
    root.innerHTML = "<header><button type=\"button\">Log in</button></header>";

    stripAuthChrome(root);

    expect(root.querySelector("button")).toBeNull();
  });

  /**
   * ★ THE CONTROL FOR THE RULE ABOVE. A button whose label merely CONTAINS the
   * phrase is content, not chrome, and must survive — this is what separates
   * "match the complete label" from "match a substring".
   */
  it("keeps a button whose label only CONTAINS the phrase", () => {
    const root = document.createElement("div");
    root.innerHTML = '<button type="button">How do I log in to my account?</button>';

    stripAuthChrome(root);

    expect(root.querySelector("button")).not.toBeNull();
  });

  it("removes the mistake-intel CTA and its explanation, keeping the card header", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<aside><div><span>Mistake Intel</span></div>' +
      "<p>Sign in to see mistake patterns from your checked answers.</p>" +
      '<a href="/app/login?reason=mistake-aware&redirect=/me">Sign in →</a></aside>';

    stripAuthChrome(root);

    expect(root.querySelector("a")).toBeNull();
    expect(root.textContent).not.toContain("Sign in to see mistake patterns");
    expect(root.textContent).toContain("Mistake Intel");
  });

  it("removes the whole signed-out upsell section around a login link", () => {
    const root = document.createElement("div");
    root.innerHTML =
      "<main><section><h3>Mistake-aware practice</h3>" +
      "<p>Mistake-aware practice needs saved attempts. Start a free trial to unlock drills.</p>" +
      '<a href="/app/login?reason=mistake-aware&redirect=%2Fpractice-hub">Start free trial</a>' +
      "</section><section><p>Quick Practice</p></section></main>";

    stripAuthChrome(root);

    expect(root.textContent).not.toContain("Mistake-aware practice needs saved attempts");
    expect(root.textContent).not.toContain("Start free trial");
    // The neighbouring section is untouched — the strip is surgical, not a purge.
    expect(root.textContent).toContain("Quick Practice");
  });

  it("leaves a page with no auth chrome completely unchanged", () => {
    const root = document.createElement("div");
    const original = "<main><h1>Electricity</h1><p>Ohm's law relates V, I and R.</p></main>";
    root.innerHTML = original;

    stripAuthChrome(root);

    expect(root.innerHTML).toBe(original);
  });
});

describe("validateCaptures refuses to let a bad capture reach disk", () => {
  it("passes a set of healthy, distinct captures", () => {
    expect(
      validateCaptures([
        capture("/topic-hub/trigonometry", "Trigonometry ratios and identities"),
        capture("/notes/electricity", "Electricity: Ohm's law"),
      ]),
    ).toEqual([]);
  });

  /**
   * ★★ THE ASSERTION THIS WHOLE STEP TURNS ON. `writeStaticHeads` stamps every page
   * from ONE template string, so a body produced before that step is copied into all
   * 116 files — every page carrying the wrong DOM under its own correct title, and
   * every existing gate green. Two URLs with byte-identical bodies cannot be right.
   */
  it("REJECTS two paths whose captured bodies are byte-identical", () => {
    // Long enough to clear the floor, so byte-identity is the ONLY thing failing.
    const shared = `<main><p>the home page</p><i>${"x".repeat(MIN_BODY_BYTES)}</i></main>`;
    const failures = validateCaptures([
      capture("/topic-hub/trigonometry", "home", shared),
      capture("/notes/electricity", "home", shared),
    ]);

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("byte-identical");
  });

  it("REJECTS a body under the floor", () => {
    const failures = validateCaptures([capture("/notes/electricity", "x", "<main>tiny</main>")]);
    expect(failures.join(" ")).toContain("under the");
  });

  it("REJECTS a captured error boundary", () => {
    const failures = validateCaptures([
      capture("/topic-hub/trigonometry", "Something went wrong. Please try again."),
    ]);
    expect(failures.join(" ")).toContain("error boundary");
  });

  /**
   * ★ CASE-INSENSITIVE, AND THAT IS THE FINDING THIS ENCODES. The signed-out button
   * in `App.tsx` renders the source text "Log in" but displays UPPERCASE via
   * `text-transform`, so it reads "LOG IN" on the three /legal pages. A
   * case-sensitive check finds 54 of the 57 pages that carry a login button and
   * misses those three IN SILENCE. The banned phrases are matched in every casing.
   */
  it.each([
    "Sign in to see mistake patterns from your checked answers.",
    "SIGN IN TO SEE MISTAKE PATTERNS FROM YOUR CHECKED ANSWERS.",
    "sign in to see mistake patterns from your checked answers.",
  ])("REJECTS surviving auth chrome text (%s)", (variant) => {
    const failures = validateCaptures([capture("/topic-hub/trigonometry", `Ratios ${variant}`)]);
    expect(failures.join(" ")).toContain("auth chrome survived");
  });

  /**
   * ★ THE BARE LOGIN BUTTONS ARE CAUGHT STRUCTURALLY, NOT AS TEXT — "Log in" is two
   * common words with no distinctive phrasing, so the only honest instrument is the
   * node count. A page whose text is clean but which still carries a login node is
   * still a page that shows a signed-in student signed-out chrome.
   */
  it("REJECTS a surviving auth NODE even when the text reads clean", () => {
    const clean = capture("/legal/privacy", "Privacy policy. We collect the following.");
    const failures = validateCaptures([{ ...clean, residualAuthNodes: 1 }]);

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("survived the strip");
    expect(failures[0]).toContain("/legal/privacy");
  });

  it("checks auth chrome PER PATH, so a clean page cannot mask a dirty one", () => {
    const dirty = capture("/legal/privacy", "Privacy policy");
    const failures = validateCaptures([
      capture("/topic-hub/trigonometry", "Trigonometry ratios"),
      { ...dirty, residualAuthNodes: 1 },
    ]);

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("/legal/privacy");
  });

  it("names EVERY failing page, not just the first", () => {
    const failures = validateCaptures([
      capture("/legal/privacy", "Privacy. Sign in to see mistake patterns from your answers."),
      capture("/legal/terms", "Terms. Good evening."),
    ]);

    expect(failures).toHaveLength(2);
    expect(failures.join(" ")).toContain("/legal/privacy");
    expect(failures.join(" ")).toContain("/legal/terms");
  });

  it("REJECTS a capture whose trap-witness content was destroyed by the strip", () => {
    const witness = SUBSTRING_TRAP_WITNESSES[0];
    const failures = validateCaptures([
      // The page rendered, cleared every other rule, but the witness sentence is gone.
      capture(witness.path, "Split a shaded deinto standard pieces"),
    ]);

    expect(failures.join(" ")).toContain("did not survive the strip");
  });

  it("bans the greeting, which is auth-dependent and clock-baked", () => {
    for (const greeting of ["Good morning", "Good afternoon", "Good evening"]) {
      expect(BANNED_AUTH_TEXT).toContain(greeting.toLowerCase());
    }
  });

  /**
   * ⚠ NO BARE TOKENS IN THE TEXT BAN LIST. Banning "sign in" outright failed the
   * build on two CORRECT pages — `/pricing`'s invariant copy ("Browse first. Sign in
   * for a 7-day trial.", which `PricingPage` shows signed-in too) and the words
   * "de(sign in)to" on a chapter page. The bare login labels are caught structurally
   * instead. This asserts the list never regresses to a bare token.
   */
  it.each(["sign in", "log in", "login", "trial"])(
    "does not ban the bare token %s, which appears in real content",
    (token) => {
      expect(BANNED_AUTH_TEXT).not.toContain(token);
    },
  );

  it("does not flag /pricing's invariant sign-in copy as chrome", () => {
    const failures = validateCaptures([
      capture(
        "/pricing",
        "Browse first. Sign in for a 7-day trial. Choose Premium when you need checked answers.",
      ),
    ]);
    expect(failures).toEqual([]);
  });
});

describe("validateCoverage catches a page that was never captured at all", () => {
  /**
   * ★★ THE CHECK `validateCaptures` CANNOT MAKE. "Is every captured page good?" is
   * vacuously true of a page that was never captured — a family dropped from the loop
   * leaves every remaining capture perfect while that family still serves an empty
   * body to every crawler. Only coverage catches a disappearance.
   */
  it("passes on the full advertised set", () => {
    expect(validateCoverage(capturablePaths().map((path) => capture(path, path)))).toEqual([]);
  });

  it("REJECTS a dropped path", () => {
    const short = capturablePaths()
      .filter((path) => path !== "/notes/electricity")
      .map((path) => capture(path, path));

    const failures = validateCoverage(short);

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("/notes/electricity");
    expect(failures[0]).toContain("advertised but never captured");
  });

  it("REJECTS the root, which this lane deliberately does not capture", () => {
    const withRoot = [...capturablePaths().map((path) => capture(path, path)), capture("/", "home")];
    expect(validateCoverage(withRoot).join(" ")).toContain("not an advertised, capturable path");
  });

  it("REJECTS a set missing a substring-trap witness", () => {
    const witness = SUBSTRING_TRAP_WITNESSES[0];
    const short = capturablePaths()
      .filter((path) => path !== witness.path)
      .map((path) => capture(path, path));

    expect(validateCoverage(short).join(" ")).toContain("substring-trap witness is missing");
  });
});

describe("servableKey — the build server can only ever name a file the build emitted", () => {
  /** Stands in for the walk of the real output directory. */
  const index = new Map([
    ["/index.html", "ABS/index.html"],
    ["/topic-hub/trigonometry.html", "ABS/topic-hub/trigonometry.html"],
    ["/topic-hub/trigonometry/index.html", "ABS/topic-hub/trigonometry/index.html"],
    ["/assets/index-abc.js", "ABS/assets/index-abc.js"],
  ]);

  it.each([
    ["/topic-hub/trigonometry.html", "/topic-hub/trigonometry.html"],
    ["/topic-hub/trigonometry", "/topic-hub/trigonometry.html"],
    ["/topic-hub/trigonometry/", "/topic-hub/trigonometry.html"],
    ["/assets/index-abc.js", "/assets/index-abc.js"],
  ])("serves %s from the index", (request, expected) => {
    expect(servableKey(index, request)).toBe(expected);
  });

  /**
   * ★ THE CONTROL FOR THE SECURITY FIX. CodeQL flagged `js/path-injection` at HIGH,
   * twice, on the first version of the server, which joined the decoded request path
   * onto `outDir`. A traversal now cannot even be expressed: there is no path
   * arithmetic left, only a lookup, so a request that names nothing the build emitted
   * gets the SPA shell — never a file from elsewhere on the disk.
   */
  it.each([
    "/../../../../etc/passwd",
    "/../package.json",
    "/topic-hub/../../../../Windows/win.ini",
    decodeURIComponent("/..%2f..%2fsecret"),
    "/does-not-exist.html",
  ])("cannot address anything outside the built output (%s)", (attack) => {
    expect(servableKey(index, attack)).toBeNull();
  });
});
